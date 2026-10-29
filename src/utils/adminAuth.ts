import { getApiBaseUrl, hasBackend } from './api';

/**
 * Hệ thống bảo vệ & xác thực Quản trị viên (Admin RBAC) tích hợp Neon PostgreSQL
 * - Mật khẩu lưu trữ trên bảng `neon_admin_accounts` bằng thuật toán Scrypt + Random Salt 16-byte
 * - Phiên làm việc lưu trữ bền vững trên bảng `neon_admin_sessions` (mã hóa SHA-256)
 * - Khóa hoàn toàn khu vực Cài đặt, Quảng cáo và Cơ sở dữ liệu cho riêng Admin
 */

export interface AdminProfile {
  id?: number;
  username: string;
  displayName: string;
  email?: string | null;
  role: string;
}

const AUTH_SALT = 'minhhieu_tube_admin_salt_2026_@#!';
const DEFAULT_USERNAME_HASH = 'c93caf0277d1aa998eae98bfc51834d53ad19c48a320be57b459b03fb2236161';
const DEFAULT_PASSWORD_HASH = '6d4c7db9ac333e4288c2bf6afa09237cea75f7bb8c6f11ca6253d238dde4f5e4';

const STORAGE_KEY_TOKEN = 'minhhieu_pg_admin_token_v3';
const STORAGE_KEY_EXPIRY = 'minhhieu_pg_admin_expiry_v3';
const STORAGE_KEY_PROFILE = 'minhhieu_pg_admin_profile_v3';
const STORAGE_KEY_CUSTOM_HASH = 'minhhieu_admin_custom_creds_v2';
const AUTH_CHANGED_EVENT = 'minhhieu_admin_auth_changed';

// Dọn sạch phiên giả lập cũ ở client (nếu có) để buộc xác thực chuẩn qua PostgreSQL
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('minhhieu_admin_token_v2');
    localStorage.removeItem('minhhieu_admin_expiry_v2');
    sessionStorage.removeItem('minhhieu_admin_token_v2');
    sessionStorage.removeItem('minhhieu_admin_expiry_v2');
  } catch {}
}

export async function computeHash(input: string, salt: string = AUTH_SALT): Promise<string> {
  const text = `${input}:${salt}`;
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return text;
}

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const token =
      sessionStorage.getItem(STORAGE_KEY_TOKEN) || localStorage.getItem(STORAGE_KEY_TOKEN) || '';
    const expiryStr =
      sessionStorage.getItem(STORAGE_KEY_EXPIRY) || localStorage.getItem(STORAGE_KEY_EXPIRY) || '';
    if (!token || !expiryStr) return '';
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      clearLocalAdminStorage();
      return '';
    }
    return token;
  } catch {
    return '';
  }
}

export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'X-Admin-Token': token,
  };
}

function clearLocalAdminStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_EXPIRY);
    sessionStorage.removeItem(STORAGE_KEY_PROFILE);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  } catch {}
}

function saveLocalAdminSession(
  token: string,
  expiryMs: number,
  profile: AdminProfile,
  rememberMe: boolean
): void {
  if (typeof window === 'undefined') return;
  try {
    const profileStr = JSON.stringify(profile);
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
    sessionStorage.setItem(STORAGE_KEY_EXPIRY, String(expiryMs));
    sessionStorage.setItem(STORAGE_KEY_PROFILE, profileStr);

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_EXPIRY, String(expiryMs));
      localStorage.setItem(STORAGE_KEY_PROFILE, profileStr);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_EXPIRY);
      localStorage.removeItem(STORAGE_KEY_PROFILE);
    }

    window.dispatchEvent(
      new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: true, profile } })
    );
  } catch {}
}

export function isAdminAuthenticated(): boolean {
  return Boolean(getAdminToken());
}

export function getAdminSessionInfo(): {
  loggedIn: boolean;
  username: string;
  displayName: string;
  role: string;
} {
  const loggedIn = isAdminAuthenticated();
  if (!loggedIn) {
    return { loggedIn: false, username: '', displayName: '', role: '' };
  }

  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY_PROFILE) || localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminProfile;
      return {
        loggedIn: true,
        username: parsed.username || 'minhhieuvnbt',
        displayName: parsed.displayName || parsed.username || 'Quản trị viên',
        role: parsed.role || 'super_admin',
      };
    }
  } catch {}

  return {
    loggedIn: true,
    username: 'minhhieuvnbt',
    displayName: 'Quản trị viên',
    role: 'super_admin',
  };
}

/**
 * Đối chiếu phiên đăng nhập hiện tại với bảng `neon_admin_sessions` trên máy chủ PostgreSQL
 */
export async function verifyAdminSessionRemote(): Promise<{
  authenticated: boolean;
  admin: AdminProfile | null;
  dbConnected?: boolean;
  dbInitialized?: boolean;
}> {
  if (!hasBackend()) {
    const info = getAdminSessionInfo();
    return {
      authenticated: info.loggedIn,
      admin: info.loggedIn
        ? { username: info.username, displayName: info.displayName, role: info.role }
        : null,
    };
  }

  const apiBase = getApiBaseUrl() || '/api/';
  const token = getAdminToken();

  try {
    const resp = await fetch(`${apiBase}admin/session`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}`, 'X-Admin-Token': token } : {}),
      },
    });

    if (resp.ok) {
      const data = await resp.json();
      if (token && !data.authenticated) {
        clearLocalAdminStorage();
        window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: false } }));
      } else if (data.authenticated && data.admin) {
        try {
          const profileStr = JSON.stringify(data.admin);
          sessionStorage.setItem(STORAGE_KEY_PROFILE, profileStr);
          if (localStorage.getItem(STORAGE_KEY_TOKEN)) {
            localStorage.setItem(STORAGE_KEY_PROFILE, profileStr);
          }
          window.dispatchEvent(
            new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: true, profile: data.admin } })
          );
        } catch {}
      }

      return {
        authenticated: Boolean(data.authenticated),
        admin: data.admin || null,
        dbConnected: Boolean(data.dbConnected),
        dbInitialized: Boolean(data.dbInitialized),
      };
    }
  } catch {
    // Mạng gián đoạn tạm thời -> giữ trạng thái hiện có
  }

  const info = getAdminSessionInfo();
  return {
    authenticated: info.loggedIn,
    admin: info.loggedIn
      ? { username: info.username, displayName: info.displayName, role: info.role }
      : null,
  };
}

function isStaticBackendFallbackAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'file:';
}

/**
 * Xác thực tài khoản & mật khẩu trực tiếp trên Neon PostgreSQL
 */
export async function authenticateAdmin(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; message: string; admin?: AdminProfile }> {
  const cleanUser = (usernameInput || '').trim().toLowerCase();
  const cleanPass = passwordInput || '';

  if (!cleanUser || !cleanPass) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!' };
  }

  if (hasBackend()) {
    const apiBase = getApiBaseUrl() || '/api/';
    try {
      const resp = await fetch(`${apiBase}admin/login`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
          rememberMe,
        }),
      });

      const rawText = await resp.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (data && resp.ok && data.success && data.token) {
        const expiryMs = data.expiresAt
          ? new Date(data.expiresAt).getTime()
          : Date.now() + (rememberMe ? 30 * 24 * 3600 * 1000 : 12 * 3600 * 1000);

        const profile: AdminProfile = data.admin || {
          username: cleanUser,
          displayName: cleanUser,
          role: 'super_admin',
        };

        saveLocalAdminSession(data.token, expiryMs, profile, rememberMe);

        return {
          success: true,
          message: data.message || 'Xác thực Quản trị viên trên PostgreSQL thành công!',
          admin: profile,
        };
      }

      if (data && !data.success) {
        return {
          success: false,
          message:
            data.message ||
            data.error ||
            'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!',
        };
      }

      if (resp.status >= 502 && resp.status <= 504) {
        return {
          success: false,
          message:
            'Máy chủ Render đang khởi động lại (Cold Start ~15–20 giây). Vui lòng thử bấm đăng nhập lại sau vài giây!',
        };
      }
    } catch (err: any) {
      // Nếu máy chủ Render đang thức dậy (network timeout tạm thời), báo rõ cho Admin
      if (!isStaticBackendFallbackAllowed()) {
        return {
          success: false,
          message:
            err?.message ||
            'Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau vài giây!',
        };
      }
    }
  }

  // Fallback chỉ dùng cho môi trường tĩnh thuần (GitHub Pages không có backend)
  const userHash = await computeHash(cleanUser);
  const passHash = await computeHash(cleanPass);

  let validUserHash = DEFAULT_USERNAME_HASH;
  let validPassHash = DEFAULT_PASSWORD_HASH;
  try {
    const customCreds = localStorage.getItem(STORAGE_KEY_CUSTOM_HASH);
    if (customCreds) {
      const parsed = JSON.parse(customCreds);
      if (parsed.userHash) validUserHash = parsed.userHash;
      if (parsed.passHash) validPassHash = parsed.passHash;
    }
  } catch {}

  if (userHash !== validUserHash || passHash !== validPassHash) {
    return {
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu không chính xác!',
    };
  }

  const durationMs = rememberMe ? 30 * 24 * 3600 * 1000 : 12 * 3600 * 1000;
  const expiry = Date.now() + durationMs;
  const sessionToken = await computeHash(`static_session_${Date.now()}_${Math.random()}`);
  const profile: AdminProfile = {
    username: cleanUser,
    displayName: 'Quản trị viên',
    role: 'super_admin',
  };
  saveLocalAdminSession(sessionToken, expiry, profile, rememberMe);

  return {
    success: true,
    message: 'Xác thực Quản trị viên thành công!',
    admin: profile,
  };
}

/**
 * Đăng xuất & hủy phiên làm việc trên cả trình duyệt lẫn PostgreSQL
 */
export function adminLogout(allDevices = false): void {
  const token = getAdminToken();
  clearLocalAdminStorage();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: false } }));
  }

  if (token && hasBackend()) {
    const apiBase = getApiBaseUrl() || '/api/';
    fetch(`${apiBase}admin/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Admin-Token': token,
      },
      body: JSON.stringify({ allDevices }),
    }).catch(() => {});
  }
}

/**
 * Thay đổi mật khẩu & tên đăng nhập Quản trị viên lưu trực tiếp vào Neon PostgreSQL
 */
export async function changeAdminPassword(
  currentPassInput: string,
  newPassInput: string,
  newUserOptional?: string,
  newDisplayNameOptional?: string
): Promise<{ success: boolean; message: string }> {
  const cleanPass = (newPassInput || '').trim();
  if (cleanPass.length < 6) {
    return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' };
  }

  if (hasBackend()) {
    const apiBase = getApiBaseUrl() || '/api/';
    try {
      const resp = await fetch(`${apiBase}admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          currentPassword: currentPassInput,
          newPassword: cleanPass,
          newUsername: newUserOptional?.trim() || undefined,
          newDisplayName: newDisplayNameOptional?.trim() || undefined,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          message: data.message || data.error || 'Không thể cập nhật mật khẩu Admin!',
        };
      }

      if (data.admin) {
        const profileStr = JSON.stringify(data.admin);
        sessionStorage.setItem(STORAGE_KEY_PROFILE, profileStr);
        if (localStorage.getItem(STORAGE_KEY_TOKEN)) {
          localStorage.setItem(STORAGE_KEY_PROFILE, profileStr);
        }
        window.dispatchEvent(
          new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: true, profile: data.admin } })
        );
      }

      return {
        success: true,
        message: data.message || 'Đã cập nhật mật khẩu trực tiếp trên Neon PostgreSQL!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối máy chủ khi đổi mật khẩu Admin!',
      };
    }
  }

  // Fallback môi trường tĩnh
  const currentPassHash = await computeHash(currentPassInput);
  let validPassHash = DEFAULT_PASSWORD_HASH;
  let currentUserHash = DEFAULT_USERNAME_HASH;

  try {
    const customCreds = localStorage.getItem(STORAGE_KEY_CUSTOM_HASH);
    if (customCreds) {
      const parsed = JSON.parse(customCreds);
      if (parsed.passHash) validPassHash = parsed.passHash;
      if (parsed.userHash) currentUserHash = parsed.userHash;
    }
  } catch {}

  if (currentPassHash !== validPassHash) {
    return { success: false, message: 'Mật khẩu hiện tại không đúng!' };
  }

  const newPassHash = await computeHash(cleanPass);
  let newUserHash = currentUserHash;
  if (newUserOptional && newUserOptional.trim()) {
    newUserHash = await computeHash(newUserOptional.trim().toLowerCase());
  }

  localStorage.setItem(
    STORAGE_KEY_CUSTOM_HASH,
    JSON.stringify({
      userHash: newUserHash,
      passHash: newPassHash,
      updatedAt: new Date().toISOString(),
    })
  );

  return { success: true, message: 'Đã đổi thông tin Quản trị viên thành công!' };
}

export function subscribeAdminAuth(callback: (isLoggedIn: boolean) => void): () => void {
  const handler = () => {
    callback(isAdminAuthenticated());
  };

  window.addEventListener(AUTH_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
