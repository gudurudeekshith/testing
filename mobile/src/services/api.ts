import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getAuthToken, clearAuth } from '../utils/auth';

function getApiBaseUrl(): string {
  const extra =
    (Constants.expoConfig && (Constants.expoConfig as any).extra) ||
    (Constants.manifest && (Constants.manifest as any).extra) ||
    {};

  const configuredUrl = extra.API_BASE_URL || '';
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  const hostUri =
    (Constants.expoConfig && (Constants.expoConfig as any).hostUri) ||
    (Constants.manifest && (Constants.manifest as any).debuggerHost) ||
    '';

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') {
      return `http://${host}:5000/api`;
    }
  }

  return 'https://kitsphere-backend.onrender.com/api';
}

const API_BASE_URL = getApiBaseUrl();

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    try {
      await clearAuth();
    } catch (e) {
      console.error('Error clearing auth on 401:', e);
    }
    router.replace('/(auth)/login');
    throw new Error('Session expired. Please log in again.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Non-JSON response from server (Status ${response.status}). Please verify that backend is running locally at ${API_BASE_URL}.`
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error('Unable to parse server response as JSON.');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong.');
  }

  return data;
}

export { API_BASE_URL };
