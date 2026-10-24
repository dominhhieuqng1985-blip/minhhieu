/**
 * Hệ thống bảo vệ và xác thực Quản trị viên (Admin Security)
 * Mã hóa một chiều SHA-256 kèm Salt bảo mật
 * 
 * Tài khoản mặc định:
 * - Username: minhhieuvnbt
 * - Password: AnhYeuEm@1231985
 */

const AUTH_SALT = "minhhieu_tube_admin_salt_2026_@#!";

// Pre-computed salted SHA-256 hashes:
// SHA256("minhhieuvnbt" + ":" + AUTH_SALT)
const DEFAULT_USERNAME_HASH = "c93caf0277d1aa998eae98bfc51834d53ad19c48a320be57b459b03fb2236161";
// SHA256("AnhYeuEm@1231985" + ":" + AUTH_SALT)
const DEFAULT_PASSWORD_HASH = "6d4c7db9ac333e4288c2bf6afa09237cea75f7bb8c6f11ca6253d238dde4f5e4";

const STORAGE_KEY_TOKEN = "minhhieu_admin_token_v2";
const STORAGE_KEY_EXPIRY = "minhhieu_admin_expiry_v2";
const STORAGE_KEY_CUSTOM_HASH = "minhhieu_admin_custom_creds_v2";
const AUTH_CHANGED_EVENT = "minhhieu_admin_auth_changed";

/**
 * Thuật toán SHA-256 chuẩn (dùng Web Crypto API với fallback JS)
 */
export async function computeHash(input: string, salt: string = AUTH_SALT): Promise<string> {
  const text = `${input}:${salt}`;
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}

  // Fallback pure JS SHA-256
  return fallbackSha256(text);
}

// Fallback SHA-256 implementation
function fallbackSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < ascii[lengthProperty]; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << ((3 - ((asciiBitLength >> 3) % 4)) * 8);
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const S1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (S0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Kiểm tra xem Quản trị viên hiện tại đã đăng nhập hay chưa
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const token = sessionStorage.getItem(STORAGE_KEY_TOKEN) || localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiryStr = sessionStorage.getItem(STORAGE_KEY_EXPIRY) || localStorage.getItem(STORAGE_KEY_EXPIRY);

    if (!token || !expiryStr) return false;

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      // Đã hết hạn phiên
      adminLogout();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Lấy thông tin phiên Admin hiện tại
 */
export function getAdminSessionInfo(): { loggedIn: boolean; username: string } {
  const loggedIn = isAdminAuthenticated();
  return {
    loggedIn,
    username: loggedIn ? "minhhieuvnbt" : ""
  };
}

/**
 * Xác thực thông tin đăng nhập với mật khẩu và username đã mã hóa
 */
export async function authenticateAdmin(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; message: string }> {
  const cleanUser = (usernameInput || '').trim().toLowerCase();
  const cleanPass = passwordInput || '';

  if (!cleanUser || !cleanPass) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!' };
  }

  const userHash = await computeHash(cleanUser);
  const passHash = await computeHash(cleanPass);

  // Kiểm tra thông tin đã tùy biến trong localStorage hoặc mật khẩu mặc định
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

  const isUserValid = userHash === validUserHash;
  const isPassValid = passHash === validPassHash;

  if (!isUserValid || !isPassValid) {
    return {
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!'
    };
  }

  // Khởi tạo phiên làm việc an toàn (thời lượng 8 tiếng hoặc 30 ngày nếu nhớ)
  const durationMs = rememberMe ? 30 * 24 * 3600 * 1000 : 8 * 3600 * 1000;
  const expiry = Date.now() + durationMs;
  const sessionToken = await computeHash(`session_${Date.now()}_${Math.random()}`);

  try {
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_TOKEN, sessionToken);
      localStorage.setItem(STORAGE_KEY_EXPIRY, expiry.toString());
    }
    sessionStorage.setItem(STORAGE_KEY_TOKEN, sessionToken);
    sessionStorage.setItem(STORAGE_KEY_EXPIRY, expiry.toString());

    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: true } }));
  } catch {}

  return {
    success: true,
    message: 'Xác thực Quản trị viên thành công!'
  };
}

/**
 * Đăng xuất và khóa lại toàn bộ các khu vực cài đặt
 */
export function adminLogout(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_EXPIRY);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);

    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { loggedIn: false } }));
  } catch {}
}

/**
 * Thay đổi mật khẩu quản trị viên
 */
export async function changeAdminPassword(
  currentPassInput: string,
  newPassInput: string,
  newUserOptional?: string
): Promise<{ success: boolean; message: string }> {
  const cleanPass = (newPassInput || '').trim();
  if (cleanPass.length < 6) {
    return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' };
  }

  // Xác thực mật khẩu cũ trước khi đổi
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

  localStorage.setItem(STORAGE_KEY_CUSTOM_HASH, JSON.stringify({
    userHash: newUserHash,
    passHash: newPassHash,
    updatedAt: new Date().toISOString()
  }));

  return { success: true, message: 'Đã đổi thông tin Quản trị viên thành công!' };
}

/**
 * Đăng ký lắng nghe thay đổi trạng thái đăng nhập
 */
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
