import { apiBaseUrl, fetchWithTimeout } from './apiClient';
import { getStoredToken } from './authService';

function authHeaders(token) {
  const activeToken = token || getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
  };
}

async function handleResponse(response, defaultErrorMsg) {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `${defaultErrorMsg} (${response.status})`);
  }
  return payload;
}

// ---------------- Admin Statistics ----------------
export async function getAdminStats(token) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/admin/stats`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch dashboard statistics.');
}

// ---------------- User Management ----------------
export async function getAdminUsers(query = {}, token) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetchWithTimeout(`${apiBaseUrl}/admin/users?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch users list.');
}

export async function updateUserStatus(userId, status, token) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return handleResponse(response, 'Failed to update user status.');
}

// ---------------- Product Management ----------------
export async function adminGetProducts(query = {}, token) {
  const searchParams = new URLSearchParams();
  if (!query.status) searchParams.set('status', 'all');
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetchWithTimeout(`${apiBaseUrl}/products?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch products.');
}

export async function adminCreateProduct(productData, token) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/products`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(productData),
  });
  return handleResponse(response, 'Failed to create product.');
}

export async function adminUpdateProduct(id, productData, token) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(productData),
  });
  return handleResponse(response, 'Failed to update product.');
}

export async function adminDeleteProduct(id, token) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to delete product.');
}

export async function adminUploadProductImage(file, token) {
  const activeToken = token || getStoredToken();
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetchWithTimeout(`${apiBaseUrl}/products/upload-image`, {
    method: 'POST',
    headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
    body: formData,
  });
  return handleResponse(response, 'Failed to upload product image.');
}

export async function adminReplaceProductImage(productId, file, token) {
  const activeToken = token || getStoredToken();
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetchWithTimeout(`${apiBaseUrl}/products/${encodeURIComponent(productId)}/image`, {
    method: 'PUT',
    headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
    body: formData,
  });
  return handleResponse(response, 'Failed to update product image.');
}

export async function adminRemoveProductImage(productId, token) {
  const response = await fetchWithTimeout(`${apiBaseUrl}/products/${encodeURIComponent(productId)}/image`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to remove product image.');
}

// ---------------- Crop Management ----------------
export async function adminGetCrops(query = {}, token) {
  const searchParams = new URLSearchParams();
  if (!query.status) searchParams.set('status', 'all');
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetch(`${apiBaseUrl}/crops?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch crops.');
}

export async function adminCreateCrop(cropData, token) {
  const response = await fetch(`${apiBaseUrl}/crops`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(cropData),
  });
  return handleResponse(response, 'Failed to create crop.');
}

export async function adminUpdateCrop(id, cropData, token) {
  const response = await fetch(`${apiBaseUrl}/crops/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(cropData),
  });
  return handleResponse(response, 'Failed to update crop.');
}

export async function adminDeleteCrop(id, token) {
  const response = await fetch(`${apiBaseUrl}/crops/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to delete crop.');
}

// ---------------- Problem Management ----------------
export async function adminGetProblems(query = {}, token) {
  const searchParams = new URLSearchParams();
  if (!query.status) searchParams.set('status', 'all');
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetch(`${apiBaseUrl}/problems?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch problems.');
}

export async function adminCreateProblem(problemData, token) {
  const response = await fetch(`${apiBaseUrl}/problems`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(problemData),
  });
  return handleResponse(response, 'Failed to create problem.');
}

export async function adminUpdateProblem(id, problemData, token) {
  const response = await fetch(`${apiBaseUrl}/problems/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(problemData),
  });
  return handleResponse(response, 'Failed to update problem.');
}

export async function adminDeleteProblem(id, token) {
  const response = await fetch(`${apiBaseUrl}/problems/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to delete problem.');
}

// ---------------- Application Method Management ----------------
export async function adminGetApplicationMethods(query = {}, token) {
  const searchParams = new URLSearchParams();
  if (!query.status) searchParams.set('status', 'all');
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetch(`${apiBaseUrl}/application-methods?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch application methods.');
}

export async function adminCreateApplicationMethod(methodData, token) {
  const response = await fetch(`${apiBaseUrl}/application-methods`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(methodData),
  });
  return handleResponse(response, 'Failed to create application method.');
}

export async function adminUpdateApplicationMethod(id, methodData, token) {
  const response = await fetch(`${apiBaseUrl}/application-methods/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(methodData),
  });
  return handleResponse(response, 'Failed to update application method.');
}

export async function adminDeleteApplicationMethod(id, token) {
  const response = await fetch(`${apiBaseUrl}/application-methods/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to delete application method.');
}
