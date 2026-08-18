import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'kitsphere_auth_token';
const USER_KEY = 'kitsphere_user';

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    const base64UrlPayload = parts[1];
    const normalizedPayload = base64UrlPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padding = normalizedPayload.length % 4 === 0 ? '' : '='.repeat(4 - (normalizedPayload.length % 4));
    
    // Pure JavaScript base64 decoder for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const raw = (normalizedPayload + padding).replace(/=+$/, '');
    let decoded = '';
    let bc = 0;
    let bs = 0;
    
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charAt(i);
      const idx = chars.indexOf(char);
      if (idx === -1) continue;
      
      bs = bc % 4 ? bs * 64 + idx : idx;
      if (bc++ % 4) {
        decoded += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }

    if (!decoded) {
      return null;
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function hasValidAuthToken(token: string | null): boolean {
  if (!token) {
    return false;
  }

  try {
    const payload = decodeJwtPayload(token);

    if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return false;
    }

    return Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function storeAuthSession(token: string, user: Record<string, any>): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function updateStoredUser(user: Record<string, any> | null): Promise<void> {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }

  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function logout(): Promise<void> {
  await clearAuth();
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function getCurrentUser(): Promise<any | null> {
  const user = await SecureStore.getItemAsync(USER_KEY);

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}