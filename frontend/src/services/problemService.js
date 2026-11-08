import { request } from './apiClient';

export async function getProblems(filters = {}) {
  const payload = await request('/problems', { query: { limit: 100, status: 'active', ...filters } });
  return { problems: payload.data ?? [], pagination: payload.pagination };
}

export async function getProblemById(id) {
  const payload = await request(`/problems/${encodeURIComponent(id)}`);
  return payload.data;
}

export async function createProblem(problem) {
  const payload = await request('/problems', { method: 'POST', body: problem });
  return payload.data;
}

export async function updateProblem(id, problem) {
  const payload = await request(`/problems/${encodeURIComponent(id)}`, { method: 'PUT', body: problem });
  return payload.data;
}

export async function deleteProblem(id) {
  await request(`/problems/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
