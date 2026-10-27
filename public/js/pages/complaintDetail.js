import { get, post } from '../api.js';
import { esc, fmtDateTime, badge, tag, formModal, toast, toastError, errorState, spinner } from '../ui.js';
import { timeline } from '../timeline.js';

export default async function ({ el, params }) {
  const id = params[0];
  async function draw() {
    let data;
    try { ({ data } = await get('/complaints/' + id)); } catch (e) { el.innerHTML = errorState(e); return; }
    const { complaint: c, history } = data;
    const steps = ['submitted', 'under_review', 'in_progress', 'resolved'];
    const idx = steps.indexOf(c.status);
    el.innerHTML = `<a href="#/complaints" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> All complaints</a>
    <div class="row g-4 mt-1"><div class="col-lg-8">
      <div class="cc-card card-body-pad mb-4"><div class="d-flex justify-content-between flex-wrap gap-2"><div><div class="item-meta">${esc(c.ticketId)}</div><h1 class="h3 fw-bold">${esc(c.title)}</h1></div><div>${badge(c.status)}</div></div>
        <div class="my-3 d-flex gap-1" aria-label="Progress">${steps.map((s, k) => `<div class="flex-fill"><div class="progress slim"><div class="progress-bar ${k <= idx ? '' : 'bg-light'}" style="width:100%"></div></div><div class="small mt-1 ${k <= idx ? 'fw-semibold text-primary' : 'text-secondary'}">${s.replace('_', ' ').replace(/^\w/, (x) => x.toUpperCase())}</div></div>`).join('')}</div>
        <p class="prewrap mb-0">${esc(c.description)}</p>
        ${c.hasAttachment ? `<a class="btn btn-sm btn-outline-primary mt-3" href="/api/complaints/${c._id}/attachment"><i class="bi bi-paperclip"></i> ${esc(c.attachment.originalName)}</a>` : ''}</div>
      <div class="cc-card"><div class="card-head"><h2>Status history &amp; messages</h2></div><div class="card-body-pad">${timeline(history)}</div>
        <div class="card-body-pad border-top">
          ${c.status === 'resolved' ? `<div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><span class="text-secondary">This complaint has been resolved.</span>${c.canReopen ? '<button class="btn btn-outline-primary" id="reopenBtn"><i class="bi bi-arrow-counterclockwise"></i> Reopen</button>' : '<span class="small text-secondary">Reopen window (30 days) has passed — please submit a new complaint.</span>'}</div>`
          : `<form id="msgForm" novalidate><label class="form-label" for="msg">Send a follow-up</label><textarea class="form-control" id="msg" name="message" rows="3" maxlength="3000" required placeholder="Add more details or ask for an update…"></textarea><div class="invalid-feedback"></div><button class="btn btn-primary mt-2" type="submit">Send message</button></form>`}
        </div></div></div>
    <div class="col-lg-4"><div class="cc-card card-body-pad"><dl class="mb-0"><dt class="small text-secondary">Category</dt><dd>${tag(c.category, 'b-gray')}</dd><dt class="small text-secondary">Priority</dt><dd>${badge(c.priority)}</dd><dt class="small text-secondary">Submitted</dt><dd>${fmtDateTime(c.createdAt)}</dd><dt class="small text-secondary">Last updated</dt><dd class="mb-0">${fmtDateTime(c.updatedAt)}</dd></dl></div></div></div>`;
    const form = el.querySelector('#msgForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ta = form.message; ta.classList.remove('is-invalid');
      if (ta.value.trim().length < 2) { ta.classList.add('is-invalid'); ta.nextElementSibling.textContent = 'Please write a message'; return; }
      form.querySelector('button').disabled = true;
      try { await post(`/complaints/${id}/messages`, { message: ta.value }); toast('Message sent'); draw(); } catch (err) { toastError(err); form.querySelector('button').disabled = false; }
    });
    el.querySelector('#reopenBtn')?.addEventListener('click', () => formModal({ title: 'Reopen complaint', size: '', submitText: 'Reopen', fields: [{ name: 'message', label: 'Why are you reopening?', type: 'textarea', rows: 3, required: true, max: 3000 }],
      async onSubmit(v) { await post(`/complaints/${id}/reopen`, v); toast('Complaint reopened'); draw(); } }));
  }
  await draw();
}
