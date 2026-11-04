import { TempleMemberRecord } from '../data/buddhistTempleData';
import { resolveApiEndpoint, safeFetchJson } from './api';

const STORAGE_MEMBER_TOKEN = 'casttube_temple_member_token_v1';
const STORAGE_MEMBER_PROFILE = 'casttube_temple_member_profile_v1';

export function getStoredMemberToken(): string {
  try {
    return localStorage.getItem(STORAGE_MEMBER_TOKEN) || '';
  } catch {
    return '';
  }
}

export function getStoredMemberProfile(): TempleMemberRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_MEMBER_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.fullName) {
      return parsed as TempleMemberRecord;
    }
  } catch {}
  return null;
}

export function saveMemberSession(token: string, member: TempleMemberRecord): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_MEMBER_TOKEN, token);
    }
    localStorage.setItem(STORAGE_MEMBER_PROFILE, JSON.stringify(member));
  } catch {}
}

export function updateStoredMemberProfileOnly(member: TempleMemberRecord): void {
  try {
    localStorage.setItem(STORAGE_MEMBER_PROFILE, JSON.stringify(member));
  } catch {}
}

export function clearMemberSession(): void {
  try {
    localStorage.removeItem(STORAGE_MEMBER_TOKEN);
    localStorage.removeItem(STORAGE_MEMBER_PROFILE);
  } catch {}
}

export function getMemberAuthHeaders(): Record<string, string> {
  const token = getStoredMemberToken();
  if (!token) return {};
  return {
    'x-member-token': token,
  };
}

export async function fetchCurrentTempleMember(): Promise<TempleMemberRecord | null> {
  const token = getStoredMemberToken();
  if (!token) return null;
  try {
    const res = await safeFetchJson<{ success: boolean; member: TempleMemberRecord | null }>(
      resolveApiEndpoint('temple/members/me'),
      {
        method: 'GET',
        headers: {
          ...getMemberAuthHeaders(),
        },
      }
    );
    if (res.member) {
      updateStoredMemberProfileOnly(res.member);
      return res.member;
    }
    clearMemberSession();
    return null;
  } catch {
    return getStoredMemberProfile();
  }
}
