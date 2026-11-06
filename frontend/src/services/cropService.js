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
  if (!response.ok) throw new Error(payload.message || `Crop API request failed (${response.status}).`);
  return payload;
}

export async function getCrops(filters = {}) {
  const payload = await request('/crops', { query: { limit: 100, status: 'active', ...filters } });
  return { crops: payload.data ?? [], pagination: payload.pagination };
}

export async function getCropById(id) {
  const payload = await request(`/crops/${encodeURIComponent(id)}`);
  return payload.data;
}

export async function createCrop(crop) {
  const payload = await request('/crops', { method: 'POST', body: crop });
  return payload.data;
}

export async function updateCrop(id, crop) {
  const payload = await request(`/crops/${encodeURIComponent(id)}`, { method: 'PUT', body: crop });
  return payload.data;
}

export async function deleteCrop(id) {
  await request(`/crops/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
