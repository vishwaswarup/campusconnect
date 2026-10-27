// Thin fetch wrapper. All data comes from the Express/MongoDB backend; nothing is mocked or stored locally.
export class ApiError extends Error {
  constructor(status, message, errors) { super(message); this.status = status; this.errors = errors || {}; }
}

export async function api(method, path, body, { raw = false } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch('/api' + path, opts); }
  catch { throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.'); }
  if (raw) return res;
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !json || json.success === false) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      location.href = '/login.html?expired=1';
    }
    throw new ApiError(res.status, (json && json.message) || `Request failed (${res.status})`, json && json.errors);
  }
  return json;
}
export const get = (p) => api('GET', p);
export const post = (p, b) => api('POST', p, b ?? {});
export const put = (p, b) => api('PUT', p, b);
export const patch = (p, b) => api('PATCH', p, b ?? {});
export const del = (p) => api('DELETE', p);

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
};
