import { ApiError } from './api.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const initials = (n = '?') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
export const fmtDateTime = (d) => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—';
export const dayMonth = (d) => { const x = new Date(d); return { d: x.getDate(), m: x.toLocaleString('en-IN', { month: 'short' }) }; };
export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const units = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [n, u] of units) if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? 's' : ''} ago`; }
}
export const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
export const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

const STATUS = {
  submitted: ['Submitted', 'b-sky'], under_review: ['Under Review', 'b-amber'], in_progress: ['In Progress', 'b-indigo'], resolved: ['Resolved', 'b-green'],
  pending: ['Pending', 'b-amber'], approved: ['Approved', 'b-green'], rejected: ['Rejected', 'b-red'], withdrawn: ['Withdrawn', 'b-gray'],
  published: ['Published', 'b-green'], draft: ['Draft', 'b-gray'], cancelled: ['Cancelled', 'b-red'],
  open: ['Open', 'b-sky'], recovered: ['Recovered', 'b-green'], lost: ['Lost', 'b-red'], found: ['Found', 'b-green'],
  low: ['Low', 'b-gray'], medium: ['Medium', 'b-sky'], high: ['High', 'b-amber'], urgent: ['Urgent', 'b-red'],
  active: ['Active', 'b-green'], inactive: ['Inactive', 'b-gray'],
};
export const badge = (key, label) => { const [t, c] = STATUS[key] || [key, 'b-gray']; return `<span class="badge badge-soft ${c}">${esc(label || t)}</span>`; };
export const tag = (text, c = 'b-indigo') => `<span class="badge badge-soft ${c}">${esc(text)}</span>`;

export const spinner = () => '<div class="spinner-wrap"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading…</span></div></div>';
export const emptyState = (icon, title, text = '', action = '') => `<div class="empty"><i class="bi ${icon}"></i><h3>${esc(title)}</h3><p class="mb-3">${esc(text)}</p>${action}</div>`;
export const errorState = (err) => emptyState('bi-exclamation-triangle', 'Something went wrong', err.message || 'Please try again.', '<button class="btn btn-outline-primary btn-sm" data-reload>Retry</button>');

export function pager(meta) {
  if (!meta || meta.pages <= 1) return meta ? `<div class="small text-secondary text-center py-2">${meta.total} result${meta.total === 1 ? '' : 's'}</div>` : '';
  const p = meta.page, n = meta.pages;
  const nums = [];
  for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - p) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return `<nav class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" aria-label="Pagination"><span class="small text-secondary">${meta.total} results · page ${p} of ${n}</span>
  <ul class="pagination pagination-sm">
    <li class="page-item ${p === 1 ? 'disabled' : ''}"><button class="page-link" data-page="${p - 1}" aria-label="Previous">&laquo;</button></li>
    ${nums.map((x) => x === '…' ? '<li class="page-item disabled"><span class="page-link">…</span></li>' : `<li class="page-item ${x === p ? 'active' : ''}"><button class="page-link" data-page="${x}" ${x === p ? 'aria-current="page"' : ''}>${x}</button></li>`).join('')}
    <li class="page-item ${p === n ? 'disabled' : ''}"><button class="page-link" data-page="${p + 1}" aria-label="Next">&raquo;</button></li>
  </ul></nav>`;
}

// ---- Toasts (success shown only after a real successful call) ----
export function toast(message, type = 'success') {
  let c = $('#toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toast-container position-fixed top-0 end-0 p-3'; document.body.appendChild(c); }
  const el = document.createElement('div');
  const color = { success: 'text-bg-success', danger: 'text-bg-danger', info: 'text-bg-primary', warning: 'text-bg-warning' }[type] || 'text-bg-primary';
  el.className = `toast align-items-center border-0 ${color}`;
  el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  c.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: type === 'danger' ? 6000 : 3500 });
  el.addEventListener('hidden.bs.toast', () => el.remove());
  t.show();
}
export const toastError = (e) => toast(e instanceof ApiError || e.message ? e.message : 'Something went wrong', 'danger');

// ---- Modals ----
function mountModal(html, size = '') {
  const wrap = document.createElement('div');
  wrap.className = 'modal fade'; wrap.tabIndex = -1; wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<div class="modal-dialog modal-dialog-scrollable modal-dialog-centered ${size}"><div class="modal-content" style="border-radius:16px">${html}</div></div>`;
  document.body.appendChild(wrap);
  const modal = new bootstrap.Modal(wrap);
  wrap.addEventListener('hidden.bs.modal', () => { modal.dispose(); wrap.remove(); });
  modal.show();
  return { wrap, modal };
}

export function confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const { wrap, modal } = mountModal(`<div class="modal-header border-0"><h2 class="modal-title h5">${esc(title)}</h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body pt-0 text-secondary">${esc(message)}</div>
      <div class="modal-footer border-0"><button class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button></div>`);
    let result = false;
    $('[data-ok]', wrap).addEventListener('click', () => { result = true; modal.hide(); });
    wrap.addEventListener('hidden.bs.modal', () => resolve(result));
  });
}

export function infoModal(title, html, size = 'modal-lg') {
  const { wrap } = mountModal(`<div class="modal-header"><h2 class="modal-title h5">${esc(title)}</h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body">${html}</div>`, size);
  return wrap;
}

// ---- Form generator ----
// field: {name,label,type: text|email|textarea|select|number|datetime|date|checkbox|file|multiselect|password, required, options:[..]|[{value,label}], col, help, placeholder, rows, accept}
export function fieldHtml(f, value) {
  const id = 'f_' + f.name;
  const req = f.required ? 'required' : '';
  const v = value ?? f.default ?? '';
  const col = `col-12 ${f.col ? 'col-md-' + f.col : ''}`;
  const opts = (f.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  let input;
  switch (f.type) {
    case 'textarea': input = `<textarea class="form-control" id="${id}" name="${f.name}" rows="${f.rows || 4}" ${req} placeholder="${esc(f.placeholder || '')}" ${f.max ? `maxlength="${f.max}"` : ''}>${esc(v)}</textarea>`; break;
    case 'select': input = `<select class="form-select" id="${id}" name="${f.name}" ${req}>${f.required ? '' : '<option value="">— None —</option>'}${f.required ? '<option value="">Select…</option>' : ''}${opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`; break;
    case 'multiselect': { const sel = new Set(Array.isArray(v) ? v : []); input = `<select class="form-select" id="${id}" name="${f.name}" multiple size="${Math.min(opts.length, 5)}">${opts.map((o) => `<option value="${esc(o.value)}" ${sel.has(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`; break; }
    case 'checkbox': return `<div class="${col}"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="${id}" name="${f.name}" ${v ? 'checked' : ''}><label class="form-check-label fw-semibold" for="${id}">${esc(f.label)}</label></div>${f.help ? `<div class="form-text">${esc(f.help)}</div>` : ''}</div>`;
    case 'file': input = `<input class="form-control" type="file" id="${id}" name="${f.name}" ${req} accept="${esc(f.accept || '')}">`; break;
    case 'datetime': input = `<input class="form-control" type="datetime-local" id="${id}" name="${f.name}" ${req} value="${esc(toLocalInput(v))}">`; break;
    case 'date': input = `<input class="form-control" type="date" id="${id}" name="${f.name}" ${req} value="${esc(v ? String(v).slice(0, 10) : '')}" ${f.maxToday ? `max="${new Date().toISOString().slice(0, 10)}"` : ''}>`; break;
    default: input = `<input class="form-control" type="${f.type || 'text'}" id="${id}" name="${f.name}" ${req} value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.max ? `maxlength="${f.max}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''}>`;
  }
  return `<div class="${col}"><label class="form-label ${f.required ? 'req' : ''}" for="${id}">${esc(f.label)}</label>${input}<div class="invalid-feedback"></div>${f.help ? `<div class="form-text">${esc(f.help)}</div>` : ''}</div>`;
}

export function readForm(form, fields) {
  const vals = {};
  let hasFile = false;
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === 'checkbox') vals[f.name] = el.checked;
    else if (f.type === 'multiselect') vals[f.name] = [...el.selectedOptions].map((o) => o.value);
    else if (f.type === 'file') { hasFile = true; if (el.files[0]) vals[f.name] = el.files[0]; }
    else if (f.type === 'datetime') vals[f.name] = el.value ? new Date(el.value).toISOString() : '';
    else vals[f.name] = el.value;
  }
  if (!hasFile) return vals;
  const fd = new FormData();
  Object.entries(vals).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? v.join(',') : v));
  return fd;
}

export function showErrors(form, err) {
  $$('.is-invalid', form).forEach((e) => e.classList.remove('is-invalid'));
  $$('.form-alert', form).forEach((e) => e.remove());
  const errors = (err && err.errors) || {};
  let any = false;
  Object.entries(errors).forEach(([name, msg]) => {
    const el = form.elements[name];
    if (!el) return;
    any = true;
    el.classList.add('is-invalid');
    const fb = el.parentElement.querySelector('.invalid-feedback');
    if (fb) fb.textContent = msg;
  });
  const first = $('.is-invalid', form);
  if (first) first.focus();
  if (!any || !Object.keys(errors).length) {
    const a = document.createElement('div');
    a.className = 'alert alert-danger form-alert'; a.setAttribute('role', 'alert');
    a.textContent = (err && err.message) || 'Something went wrong';
    form.prepend(a);
  }
}

export function formModal({ title, fields, values = {}, submitText = 'Save', size = 'modal-lg', intro = '', onSubmit }) {
  const { wrap, modal } = mountModal(`<form novalidate enctype="multipart/form-data">
    <div class="modal-header"><h2 class="modal-title h5">${esc(title)}</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body">${intro ? `<p class="text-secondary">${intro}</p>` : ''}<div class="row g-3">${fields.map((f) => fieldHtml(f, values[f.name])).join('')}</div></div>
    <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">${esc(submitText)}</button></div></form>`, size);
  const form = $('form', wrap);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('[type=submit]', form);
    const label = btn.textContent;
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving…';
    try {
      await onSubmit(readForm(form, fields), form);
      modal.hide();
    } catch (err) { showErrors(form, err); }
    finally { btn.disabled = false; btn.textContent = label; }
  });
  wrap.addEventListener('shown.bs.modal', () => { const f = $('input:not([type=hidden]),select,textarea', form); if (f) f.focus(); });
  return wrap;
}

// Wire up search/select filters and pager clicks. state is mutated; load() re-fetches.
export function bindFilters(root, state, load) {
  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-filter]');
    if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'search') { clearTimeout(el._t); el._t = setTimeout(() => { state[el.dataset.filter] = el.value; state.page = 1; load(); }, 300); }
  });
  root.addEventListener('change', (e) => {
    const el = e.target.closest('[data-filter]');
    if (!el || (el.tagName === 'INPUT' && el.type === 'search')) return;
    state[el.dataset.filter] = el.value; state.page = 1; load();
  });
  root.addEventListener('click', (e) => {
    const p = e.target.closest('[data-page]');
    if (p && !p.closest('.disabled')) { state.page = +p.dataset.page; load(); root.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }
    if (e.target.closest('[data-reload]')) load();
  });
}

export const selectOpts = (arr, current, allLabel) => `${allLabel ? `<option value="">${esc(allLabel)}</option>` : ''}${arr.map((o) => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; return `<option value="${esc(v)}" ${String(v) === String(current ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}`;
export const searchBox = (placeholder, value = '') => `<div class="search"><i class="bi bi-search"></i><input type="search" class="form-control" data-filter="q" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" value="${esc(value)}"></div>`;
export const labelize = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
