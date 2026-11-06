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
  if (!response.ok) throw new Error(payload.message || `Problem API request failed (${response.status}).`);
  return payload;
}

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
