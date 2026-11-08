import { request } from './apiClient';

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
