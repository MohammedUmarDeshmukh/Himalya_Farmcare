const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

async function request(path, { method = 'GET', query = {}, body } = {}) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All') search.set(key, value);
  });

  const response = await fetch(`${apiBaseUrl}${path}${search.size ? `?${search}` : ''}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Application method API request failed (${response.status}).`);
  return payload;
}

export async function getApplicationMethods(filters = {}) {
  const payload = await request('/application-methods', { query: { limit: 100, status: 'active', ...filters } });
  return { applicationMethods: payload.data ?? [], pagination: payload.pagination };
}

export async function getApplicationMethodById(id) {
  const payload = await request(`/application-methods/${encodeURIComponent(id)}`);
  return payload.data;
}

export async function createApplicationMethod(applicationMethod) {
  const payload = await request('/application-methods', { method: 'POST', body: applicationMethod });
  return payload.data;
}

export async function updateApplicationMethod(id, applicationMethod) {
  const payload = await request(`/application-methods/${encodeURIComponent(id)}`, { method: 'PUT', body: applicationMethod });
  return payload.data;
}

export async function deleteApplicationMethod(id) {
  await request(`/application-methods/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
