import { request } from './apiClient';

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
