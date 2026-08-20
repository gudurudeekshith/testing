import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getAuthToken, clearAuth } from '../utils/auth';

function getApiBaseUrl(): string {
  // Use EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_BASE_URL, default to the production Render server
  const url = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://testing-5i1h.onrender.com/api';
  return url.replace(/\/+$/, '');
}

const API_BASE_URL = getApiBaseUrl();
console.log("[API CONFIG] API_BASE_URL =", API_BASE_URL);

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  console.log("[API REQUEST] Endpoint:", endpoint);
  console.log("[API REQUEST] URL:", url);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (isDev) {
    console.log(`[API RESPONSE] Endpoint: ${endpoint} | Status: ${response.status} | Content-Type: ${response.headers.get('content-type')}`);
  }

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

export async function apiUploadImage(uri: string): Promise<string> {
  const token = await getAuthToken();
  const formData = new FormData();
  
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;
  
  formData.append('image', {
    uri,
    name: filename,
    type,
  } as any);

  const response = await fetch(`${API_BASE_URL}/upload/image`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Upload failed.');
  }
  return data.url;
}

export { API_BASE_URL };

