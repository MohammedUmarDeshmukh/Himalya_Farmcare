import { apiBaseUrl, fetchWithTimeout } from './apiClient';

const TOKEN_KEY = 'himalaya_auth_token';
const USER_KEY = 'himalaya_auth_user';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error('Failed to store user profile:', error);
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to clear user profile:', error);
  }
}

export async function register(userData) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorDetails = payload.errors ? Object.values(payload.errors).join(' ') : '';
    throw new Error(errorDetails || payload.message || `Registration failed with status ${response.status}.`);
  }

  return payload;
}

export async function login(credentials) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Login failed with status ${response.status}.`);
  }

  return payload;
}

export async function getMe(token) {
  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new Error('No authentication token available.');
  }

  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Failed to verify user profile (${response.status}).`);
  }

  return payload;
}

export async function updateProfile(profileData, token) {
  const authToken = token || getStoredToken();
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(profileData),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Failed to update profile (${response.status}).`);
  }
  return payload;
}

export async function addSavedAddress(addressData, token) {
  const authToken = token || getStoredToken();
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(addressData),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorDetails = payload.errors ? Object.values(payload.errors).join(' ') : '';
    throw new Error(errorDetails || payload.message || `Failed to save address (${response.status}).`);
  }
  return payload;
}

export async function updateSavedAddress(addressId, addressData, token) {
  const authToken = token || getStoredToken();
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/addresses/${encodeURIComponent(addressId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(addressData),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Failed to update address (${response.status}).`);
  }
  return payload;
}

export async function deleteSavedAddress(addressId, token) {
  const authToken = token || getStoredToken();
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Failed to delete address (${response.status}).`);
  }
  return payload;
}

export async function setDefaultSavedAddress(addressId, token) {
  const authToken = token || getStoredToken();
  const response = await fetchWithTimeout(`${apiBaseUrl}/auth/addresses/${encodeURIComponent(addressId)}/default`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Failed to update default address (${response.status}).`);
  }
  return payload;
}
