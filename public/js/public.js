import { api, get, post } from './lib/api.js';
import { $, $$, showErrors } from './lib/ui.js';

// Switch nav buttons when already logged in
(async () => {
  try {
    const { data: u } = await get('/auth/session');
    if (!u) return;
    const dest = u.role === 'admin' ? '/app.html#/admin' : '/app.html#/dashboard';
    const login = $('#navLogin'), start = $('#navStart');
    if (login) { login.textContent = 'Open dashboard'; login.href = dest; }
    if (start) start.remove();
    if ($('[data-form]')) location.replace(dest); // already signed in -> skip auth pages
  } catch { /* not logged in */ }
})();

// Populate selects from the server's constants (single source of truth)
const sel = $$('select[data-options]');
if (sel.length) get('/meta/options').then(({ data }) => {
  sel.forEach((s) => (data[s.dataset.options] || []).forEach((o) => s.add(new Option(s.dataset.options === 'YEARS' ? `Year ${o}` : o, o))));
}).catch(() => {});

$$('[data-toggle-pw]').forEach((b) => b.addEventListener('click', () => {
  const i = document.getElementById(b.dataset.togglePw);
  const show = i.type === 'password'; i.type = show ? 'text' : 'password';
  b.innerHTML = `<i class="bi ${show ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
}));

if (new URLSearchParams(location.search).get('expired') && $('#formAlert')) {
  $('#formAlert').innerHTML = '<div class="alert alert-warning">Your session has expired. Please log in again.</div>';
}

const form = $('[data-form]');
if (form) form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const kind = form.dataset.form;
  const body = Object.fromEntries(new FormData(form).entries());
  $$('.is-invalid', form).forEach((x) => x.classList.remove('is-invalid'));
  $('#formAlert').innerHTML = '';
  const btn = $('[type=submit]', form); const label = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Please wait…';
  try {
    const { data } = await post(kind === 'login' ? '/auth/login' : '/auth/register', body);
    location.href = data.role === 'admin' ? '/app.html#/admin' : '/app.html#/dashboard';
  } catch (err) {
    if (err.errors && Object.keys(err.errors).length) { showErrors(form, err); $('#formAlert').innerHTML = `<div class="alert alert-danger" role="alert">${err.message.replace(/[<>&]/g, '')}</div>`; }
    else $('#formAlert').innerHTML = `<div class="alert alert-danger" role="alert"></div>`, $('#formAlert .alert').textContent = err.message;
    btn.disabled = false; btn.textContent = label;
  }
});
