const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.details) details = data.details;
    } catch {
      // ignore non-JSON error bodies
    }
    const err = new Error(message);
    err.status = res.status;
    err.details = details;
    throw err;
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) return res.blob();
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export const fileUrl = (path) => `${BASE_URL}${path}`;
