import { getStoredToken } from './authService';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

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

// ---------------- Farmer Order Actions ----------------

export async function createOrder(orderData, token) {
  const response = await fetch(`${apiBaseUrl}/orders`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(orderData),
  });
  return handleResponse(response, 'Failed to place order.');
}

export async function getMyOrders(query = {}, token) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetch(`${apiBaseUrl}/orders/my-orders?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch order history.');
}

export async function getOrderById(orderId, token) {
  const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch order details.');
}

export async function cancelMyOrder(orderId, token) {
  const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to cancel order.');
}

// ---------------- Admin Order Management ----------------

export async function getAdminOrders(query = {}, token) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const response = await fetch(`${apiBaseUrl}/orders/admin/all?${searchParams}`, {
    headers: authHeaders(token),
  });
  return handleResponse(response, 'Failed to fetch customer orders.');
}

export async function adminUpdateOrderStatus(orderId, status, token) {
  const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return handleResponse(response, 'Failed to update order status.');
}

export async function adminExportOrdersCSV(query = {}, token) {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });

  const response = await fetch(`${apiBaseUrl}/orders/admin/export?${searchParams}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `CSV Export failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `himalaya_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
}
