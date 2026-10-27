import { get, post } from './lib/api.js';
import { state, isAdmin } from './lib/state.js';
import { $, $$, esc, initials, spinner, toast } from './lib/ui.js';

const STUDENT_NAV = [
  ['#/dashboard', 'bi-grid-1x2-fill', 'Dashboard'], ['#/events', 'bi-calendar-event', 'Events'], ['#/resources', 'bi-journal-text', 'Notes & Resources'],
  ['#/announcements', 'bi-megaphone', 'Announcements'], ['#/lostfound', 'bi-search-heart', 'Lost & Found'], ['#/complaints', 'bi-chat-square-text', 'Complaints'],
  ['#/clubs', 'bi-people', 'Clubs'], ['#/profile', 'bi-person-circle', 'My Profile'],
];
const ADMIN_NAV = [
  ['#/admin', 'bi-speedometer2', 'Overview'], ['#/admin/students', 'bi-mortarboard', 'Students'], ['#/admin/events', 'bi-calendar-event', 'Events'],
  ['#/admin/resources', 'bi-journal-check', 'Notes', 'pendingResources'], ['#/admin/announcements', 'bi-megaphone', 'Announcements'],
  ['#/admin/lostfound', 'bi-search-heart', 'Lost & Found'], ['#/admin/complaints', 'bi-chat-square-text', 'Complaints', 'openComplaints'],
  ['#/admin/clubs', 'bi-people', 'Clubs'], ['#/admin/memberships', 'bi-person-check', 'Membership Requests', 'pendingMemberships'],
];

// [regex, module, title, adminOnly]
const ROUTES = [
  [/^\/dashboard$/, 'dashboard', 'Dashboard'],
  [/^\/events$/, 'events', 'Events'], [/^\/events\/([^/]+)$/, 'eventDetail', 'Event'],
  [/^\/resources$/, 'resources', 'Notes & Resources'], [/^\/resources\/([^/]+)$/, 'resourceDetail', 'Resource'],
  [/^\/announcements$/, 'announcements', 'Announcements'], [/^\/announcements\/([^/]+)$/, 'announcementDetail', 'Announcement'],
  [/^\/lostfound$/, 'lostfound', 'Lost & Found'], [/^\/lostfound\/([^/]+)$/, 'lostfoundDetail', 'Lost & Found'],
  [/^\/complaints$/, 'complaints', 'Complaints'], [/^\/complaints\/([^/]+)$/, 'complaintDetail', 'Complaint'],
  [/^\/clubs$/, 'clubs', 'Clubs'], [/^\/profile$/, 'profile', 'My Profile'],
  [/^\/admin$/, 'admin/overview', 'Admin Overview', true],
  [/^\/admin\/students$/, 'admin/students', 'Students', true],
  [/^\/admin\/events$/, 'admin/events', 'Manage Events', true],
  [/^\/admin\/resources$/, 'admin/resources', 'Manage Notes', true],
  [/^\/admin\/announcements$/, 'admin/announcements', 'Manage Announcements', true],
  [/^\/admin\/lostfound$/, 'admin/lostfound', 'Manage Lost & Found', true],
  [/^\/admin\/complaints$/, 'admin/complaints', 'Manage Complaints', true],
  [/^\/admin\/complaints\/([^/]+)$/, 'admin/complaintDetail', 'Complaint', true],
  [/^\/admin\/clubs$/, 'admin/clubs', 'Manage Clubs', true],
  [/^\/admin\/memberships$/, 'admin/memberships', 'Membership Requests', true],
];

// Bump together with the ?v= on app.js / style.css in the HTML pages and on the '../app.js?v=' imports.
const ASSET_VERSION = '20261028';
const getView = () => document.getElementById('view');
let navToken = 0;

function renderNav() {
  const items = isAdmin() ? ADMIN_NAV : STUDENT_NAV;
  $('#nav').innerHTML = `${isAdmin() ? '<div class="nav-label">Administration</div>' : '<div class="nav-label">Menu</div>'}` +
    items.map(([href, icon, label, badgeKey]) => `<a class="nav-link" href="${href}" data-nav="${href}"><i class="bi ${icon}"></i><span>${label}</span>${badgeKey ? `<span class="badge rounded-pill text-bg-warning d-none" data-badge="${badgeKey}"></span>` : ''}</a>`).join('') +
    (isAdmin() ? '<div class="nav-label">Account</div><a class="nav-link" href="#/profile" data-nav="#/profile"><i class="bi bi-person-circle"></i><span>My Profile</span></a>' : '');
  $('#userMenu').innerHTML = `${avatar(state.user)}<span class="d-none d-sm-inline fw-semibold">${esc(state.user.name.split(' ')[0])}</span><i class="bi bi-chevron-down small"></i>`;
  $('#sideFoot').innerHTML = `<div class="d-flex align-items-center gap-2">${avatar(state.user)}<div class="min-w-0"><div class="text-white fw-semibold text-truncate">${esc(state.user.name)}</div><div class="text-truncate">${isAdmin() ? 'Administrator' : esc(state.user.studentId || 'Student')}</div></div></div>`;
}

export const avatar = (u, cls = '') => u.hasAvatar
  ? `<img class="avatar ${cls}" src="/api/users/${u._id}/avatar?v=${new Date(u.updatedAt || 0).getTime()}" alt="">`
  : `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(u.name))}</span>`;

async function refreshBadges() {
  if (!isAdmin()) return;
  try {
    const { data } = await get('/admin/stats');
    $$('[data-badge]').forEach((b) => { const n = data.counts[b.dataset.badge]; b.textContent = n; b.classList.toggle('d-none', !n); });
  } catch { /* non-critical */ }
}
export { refreshBadges };

function closeMenu() { $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show'); }

function accessDenied() {
  getView().innerHTML = `<div class="empty"><i class="bi bi-shield-lock"></i><h3>Access denied</h3><p>You do not have permission to view this page.</p><a class="btn btn-primary" href="#/${isAdmin() ? 'admin' : 'dashboard'}">Back to dashboard</a></div>`;
  $('#pageTitle').textContent = 'Access denied';
}
function notFound() {
  getView().innerHTML = `<div class="empty"><i class="bi bi-compass"></i><h3>Page not found</h3><p>We couldn't find what you were looking for.</p><a class="btn btn-primary" href="#/${isAdmin() ? 'admin' : 'dashboard'}">Back to dashboard</a></div>`;
  $('#pageTitle').textContent = 'Not found';
}

async function route() {
  closeMenu();
  $$('.modal.show').forEach((m) => bootstrap.Modal.getInstance(m)?.hide()); // don't leave dialogs open across pages
  const token = ++navToken;
  const hash = location.hash.replace(/^#/, '') || '/';
  const path = hash.split('?')[0];
  if (path === '/' || path === '') { location.replace(isAdmin() ? '#/admin' : '#/dashboard'); return; }
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', path === a.dataset.nav.slice(1) || (a.dataset.nav.length > 4 && path.startsWith(a.dataset.nav.slice(1) + '/') && !(isAdmin() && a.dataset.nav === '#/admin'))));

  let match = null;
  for (const r of ROUTES) { const m = path.match(r[0]); if (m) { match = { r, params: m.slice(1) }; break; } }
  if (!match) return notFound();
  const [, mod, title, adminOnly] = match.r;
  if (adminOnly && !isAdmin()) return accessDenied();
  if (!adminOnly && isAdmin() && ['dashboard'].includes(mod)) { location.replace('#/admin'); return; }
  $('#pageTitle').textContent = title;
  document.title = `${title} — Campus Connect`;

  // fresh container each navigation so old event listeners are discarded
  const cur = getView();
  const el = cur.cloneNode(false);
  el.innerHTML = spinner();
  cur.replaceWith(el);
  try {
    const page = await import(`./pages/${mod}.js?v=${ASSET_VERSION}`);
    if (token !== navToken) return;
    el.innerHTML = '';
    await page.default({ el, params: match.params, user: state.user, meta: state.meta });
    if (!el.classList.contains('view')) el.classList.add('view');
    el.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (err) {
    if (token !== navToken) return;
    console.error(err);
    el.innerHTML = `<div class="empty"><i class="bi bi-exclamation-triangle"></i><h3>${err.status === 404 ? 'Not found' : 'Something went wrong'}</h3><p>${esc(err.message || 'Please try again.')}</p><button class="btn btn-outline-primary" onclick="location.reload()">Reload</button></div>`;
  }
}

async function boot() {
  try {
    const [me, meta] = await Promise.all([get('/auth/me'), get('/meta/options')]);
    state.user = me.data; state.meta = meta.data;
  } catch { location.replace('/login.html'); return; }
  renderNav();
  refreshBadges();
  $('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#backdrop').classList.add('show'); });
  $('#backdrop').addEventListener('click', closeMenu);
  $('#logoutBtn').addEventListener('click', async () => {
    try { await post('/auth/logout'); } catch { /* ignore */ }
    location.href = '/login.html';
  });
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  route();
}
export function updateUser(u) { state.user = u; renderNav(); }
boot();
