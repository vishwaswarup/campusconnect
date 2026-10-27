import { get, patch, post } from '../../lib/api.js';
import { esc, fmtDateTime, badge, tag, selectOpts, labelize, toast, toastError, showErrors, errorState } from '../../lib/ui.js';
import { timeline } from '../../lib/timeline.js';
import { refreshBadges } from '../../app.js';

export default async function ({ el, params, meta }) {
  const id = params[0];
  async function draw() {
    let data;
    try { ({ data } = await get('/complaints/' + id)); } catch (e) { el.innerHTML = errorState(e); return; }
    const { complaint: c, history } = data, s = c.student || {};
    el.innerHTML = `<a href="#/admin/complaints" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> All complaints</a>
    <div class="row g-4 mt-1"><div class="col-lg-8">
      <div class="cc-card card-body-pad mb-4"><div class="d-flex justify-content-between flex-wrap gap-2"><div><div class="item-meta">${esc(c.ticketId)} · ${tag(c.category, 'b-gray')}</div><h1 class="h3 fw-bold">${esc(c.title)}</h1></div><div>${badge(c.priority)} ${badge(c.status)}</div></div>
        <p class="prewrap mt-3">${esc(c.description)}</p>${c.hasAttachment ? `<a class="btn btn-sm btn-outline-primary" href="/api/complaints/${c._id}/attachment"><i class="bi bi-paperclip"></i> ${esc(c.attachment.originalName)}</a>` : ''}</div>
      <div class="cc-card"><div class="card-head"><h2>History &amp; conversation</h2></div><div class="card-body-pad">${timeline(history)}</div>
        <form id="msgForm" class="card-body-pad border-top" novalidate><label class="form-label" for="message">Reply or add a note</label><textarea class="form-control" id="message" name="message" rows="3" required maxlength="3000"></textarea><div class="invalid-feedback"></div>
          <div class="d-flex justify-content-between flex-wrap gap-2 mt-2"><div class="form-check"><input class="form-check-input" type="checkbox" id="internal" name="internal"><label class="form-check-label" for="internal"><i class="bi bi-eye-slash"></i> Internal note (never shown to the student)</label></div><button class="btn btn-primary" type="submit">Send</button></div></form></div></div>
    <div class="col-lg-4"><div class="cc-card card-body-pad mb-4"><h2 class="h6 text-uppercase text-secondary">Student</h2><div class="fw-semibold">${esc(s.name || '—')}</div><div class="small text-secondary">${esc(s.email || '')}<br>${esc(s.studentId || '')} · ${esc(s.department || '')}</div><div class="small text-secondary mt-2">Submitted ${fmtDateTime(c.createdAt)}</div></div>
      <form id="ctlForm" class="cc-card card-body-pad" novalidate><h2 class="h6 text-uppercase text-secondary">Manage</h2>
        <div class="mb-3"><label class="form-label" for="status">Status</label><select class="form-select" id="status" name="status">${selectOpts(meta.COMPLAINT_STATUS.map((x) => ({ value: x, label: labelize(x) })), c.status)}</select></div>
        <div class="mb-3"><label class="form-label" for="priority">Priority</label><select class="form-select" id="priority" name="priority">${selectOpts(meta.COMPLAINT_PRIORITY.map((x) => ({ value: x, label: labelize(x) })), c.priority)}</select></div>
        <div class="mb-3"><label class="form-label" for="category">Category</label><select class="form-select" id="category" name="category">${selectOpts(meta.COMPLAINT_CATEGORIES, c.category)}</select></div>
        <div class="mb-3"><label class="form-label" for="assignedTo">Assigned to (staff / department)</label><input class="form-control" id="assignedTo" name="assignedTo" maxlength="100" value="${esc(c.assignedTo || '')}"></div>
        <div class="mb-3"><label class="form-label" for="note">Message to student (optional)</label><textarea class="form-control" id="note" name="message" rows="2" maxlength="3000"></textarea></div>
        <button class="btn btn-primary w-100" type="submit">Save changes</button></form></div></div>`;
    const msg = el.querySelector('#msgForm');
    msg.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await post(`/complaints/${id}/messages`, { message: msg.message.value, internal: msg.internal.checked }); toast(msg.internal.checked ? 'Internal note added' : 'Reply sent'); draw(); } catch (err) { showErrors(msg, err); }
    });
    const ctl = el.querySelector('#ctlForm');
    ctl.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await patch('/complaints/' + id, Object.fromEntries(new FormData(ctl).entries())); toast('Complaint updated'); refreshBadges(); draw(); } catch (err) { toastError(err); }
    });
  }
  await draw();
}
