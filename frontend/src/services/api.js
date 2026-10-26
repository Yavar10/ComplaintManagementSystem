const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Retrieve stored token if available
  const token = localStorage.getItem('auth_token');

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return await response.blob();
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || 'Request failed';
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data.error?.details;
    throw err;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
    ...options,
  }),
  patch: (endpoint, body, options) => apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
};
