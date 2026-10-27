import { get, patch, post, api } from '../api.js';
import { esc, fmtDate, fmtDateTime, badge, tag, toast, toastError, showErrors, selectOpts, emptyState, errorState, spinner } from '../ui.js';
import { updateUser, avatar } from '../app.js';

export default async function ({ el, user, meta }) {
  let u = user;
  const tabs = ['details', 'security', ...(u.role === 'student' ? ['activity'] : [])];
  const label = { details: 'Profile', security: 'Security', activity: 'My activity' };
  el.innerHTML = `<div class="page-head"><div><h1>My Profile</h1><p>Manage your personal information and account security.</p></div></div>
  <ul class="nav nav-pills mb-3 gap-1" id="tabs">${tabs.map((t, i) => `<li class="nav-item"><button class="nav-link ${i ? '' : 'active'}" data-tab="${t}">${label[t]}</button></li>`).join('')}</ul><div id="pane"></div>`;
  const pane = el.querySelector('#pane');
  const locked = (l, v) => `<div class="col-md-6"><label class="form-label">${l} <i class="bi bi-lock-fill text-secondary" title="Contact an administrator to change"></i></label><input class="form-control" value="${esc(v || '—')}" disabled></div>`;

  function details() {
    pane.innerHTML = `<div class="row g-4"><div class="col-lg-4"><div class="cc-card card-body-pad text-center">
      <div class="mb-3 d-flex justify-content-center">${avatar(u, 'lg')}</div><h2 class="h5 mb-0">${esc(u.name)}</h2><div class="text-secondary small mb-2">${esc(u.email)}</div>${tag(u.role === 'admin' ? 'Administrator' : 'Student', u.role === 'admin' ? 'b-violet' : 'b-indigo')}
      <hr><label class="btn btn-outline-primary btn-sm w-100" for="avatarInput"><i class="bi bi-camera"></i> Change photo</label><input type="file" id="avatarInput" class="d-none" accept=".jpg,.jpeg,.png,.webp"><div class="form-text">JPG, PNG or WebP, max 3 MB</div></div></div>
    <div class="col-lg-8"><form id="profileForm" class="cc-card card-body-pad" novalidate><div class="row g-3">
      <div class="col-12"><label class="form-label req" for="name">Full name</label><input class="form-control" id="name" name="name" value="${esc(u.name)}" required><div class="invalid-feedback"></div></div>
      ${locked('College email', u.email)}${locked(u.role === 'admin' ? 'Role' : 'Student ID', u.role === 'admin' ? 'Administrator' : u.studentId)}
      ${u.role === 'student' ? `<div class="col-md-6"><label class="form-label req" for="department">Department</label><select class="form-select" id="department" name="department" required>${selectOpts(meta.DEPARTMENTS, u.department)}</select><div class="invalid-feedback"></div></div>
      <div class="col-6 col-md-3"><label class="form-label req" for="course">Course</label><select class="form-select" id="course" name="course" required>${selectOpts(meta.COURSES, u.course)}</select><div class="invalid-feedback"></div></div>
      <div class="col-6 col-md-3"><label class="form-label req" for="year">Year</label><select class="form-select" id="year" name="year" required>${selectOpts(meta.YEARS.map((y) => ({ value: y, label: 'Year ' + y })), u.year)}</select><div class="invalid-feedback"></div></div>` : ''}
      <div class="col-md-6"><label class="form-label" for="phone">Phone</label><input class="form-control" id="phone" name="phone" value="${esc(u.phone || '')}" maxlength="20"><div class="invalid-feedback"></div></div>
      <div class="col-12"><label class="form-label" for="bio">About me</label><textarea class="form-control" id="bio" name="bio" rows="3" maxlength="300">${esc(u.bio || '')}</textarea><div class="invalid-feedback"></div></div>
      <div class="col-12"><button class="btn btn-primary" type="submit">Save changes</button></div></div></form></div></div>`;
    const form = pane.querySelector('#profileForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      try { const r = await patch('/me', body); u = r.data; updateUser(u); toast('Profile updated'); details(); } catch (err) { showErrors(form, err); }
    });
    pane.querySelector('#avatarInput').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData(); fd.append('image', f);
      try { const r = await api('POST', '/me/avatar', fd); u = r.data; updateUser(u); toast('Photo updated'); details(); } catch (err) { toastError(err); }
    });
  }
  function security() {
    pane.innerHTML = `<form id="pwForm" class="cc-card card-body-pad" style="max-width:520px" novalidate><h2 class="h5">Change password</h2>
      <div class="mb-3"><label class="form-label req" for="currentPassword">Current password</label><input class="form-control" type="password" id="currentPassword" name="currentPassword" autocomplete="current-password" required><div class="invalid-feedback"></div></div>
      <div class="mb-3"><label class="form-label req" for="newPassword">New password</label><input class="form-control" type="password" id="newPassword" name="newPassword" autocomplete="new-password" required minlength="8"><div class="invalid-feedback"></div><div class="form-text">8+ characters, with a letter and a number.</div></div>
      <div class="mb-3"><label class="form-label req" for="confirmPassword">Confirm new password</label><input class="form-control" type="password" id="confirmPassword" name="confirmPassword" autocomplete="new-password" required><div class="invalid-feedback"></div></div>
      <button class="btn btn-primary" type="submit">Update password</button></form>`;
    const form = pane.querySelector('#pwForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await post('/me/password', Object.fromEntries(new FormData(form).entries())); toast('Password changed'); form.reset(); form.querySelectorAll('.is-invalid').forEach((x) => x.classList.remove('is-invalid')); } catch (err) { showErrors(form, err); }
    });
  }
  async function activity() {
    pane.innerHTML = spinner();
    try {
      const { data: s } = await get('/me/summary');
      const sec = (t, icon, body) => `<div class="col-lg-6"><div class="cc-card h-100"><div class="card-head"><h2><i class="bi ${icon} text-primary"></i> ${t}</h2></div>${body}</div></div>`;
      pane.innerHTML = `<div class="row g-4">
        ${sec('Registered events', 'bi-calendar-check', s.events.length ? s.events.map((e) => `<a class="list-item" href="#/events/${e._id}"><div class="flex-grow-1"><p class="item-title">${esc(e.title)}</p><div class="item-meta">${fmtDateTime(e.startAt)} · ${esc(e.venue)}</div></div></a>`).join('') : emptyState('bi-calendar-x', 'No events', 'You have not registered for any event.'))}
        ${sec('Club memberships', 'bi-people', s.memberships.length ? s.memberships.map((m) => `<a class="list-item" href="#/clubs"><div class="flex-grow-1"><p class="item-title">${esc(m.club.name)}</p></div>${badge(m.status)}</a>`).join('') : emptyState('bi-people', 'No clubs', 'You are not part of any club.'))}
        ${sec('My uploaded resources', 'bi-journal-text', s.resources.length ? s.resources.map((r) => `<a class="list-item" href="#/resources/${r._id}"><div class="flex-grow-1"><p class="item-title">${esc(r.title)}</p><div class="item-meta">${esc(r.subject)} · ${fmtDate(r.createdAt)}</div></div>${badge(r.status)}</a>`).join('') : emptyState('bi-cloud-upload', 'No uploads', 'Share notes with your classmates.'))}
        ${sec('Complaint history', 'bi-chat-square-text', s.complaints.length ? s.complaints.map((c) => `<a class="list-item" href="#/complaints/${c._id}"><div class="flex-grow-1"><p class="item-title">${esc(c.title)}</p><div class="item-meta">${esc(c.ticketId)} · ${fmtDate(c.createdAt)}</div></div>${badge(c.status)}</a>`).join('') : emptyState('bi-check2-circle', 'No complaints', 'Nothing raised so far.'))}</div>`;
    } catch (e) { pane.innerHTML = errorState(e); }
  }
  const show = { details, security, activity };
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (!t) return;
    el.querySelectorAll('#tabs .nav-link').forEach((b) => b.classList.toggle('active', b === t));
    show[t.dataset.tab]();
  });
  details();
}
