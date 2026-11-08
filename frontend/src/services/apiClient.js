/**
 * Resilient API Client with automatic timeout and user-friendly network error translation.
 * Designed for production deployments on Render / Vercel.
 */

const rawApiUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
export const apiBaseUrl = (rawApiUrl || 'http://localhost:5000/api').replace(/\/+$/, '');

export async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'Server took too long to respond. The backend may be spinning up from idle sleep (Render free tier takes ~30s). Please retry.'
      );
    }
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
      throw new Error(
        'Cannot connect to Himalaya FarmCare server. Please check your internet connection or verify the backend is active.'
      );
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export async function request(path, { method = 'GET', query = {}, body, headers = {}, timeoutMs = 25000 } = {}) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All') {
      search.set(key, value);
    }
  });

  const fullUrl = `${apiBaseUrl}${path}${search.size ? `?${search}` : ''}`;
  const mergedHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  };

  const response = await fetchWithTimeout(
    fullUrl,
    {
      method,
      headers: mergedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    },
    timeoutMs
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = payload.errors ? Object.values(payload.errors).join(' ') : '';
    throw new Error(details || payload.message || `Request failed with status ${response.status}.`);
  }

  return payload;
}
