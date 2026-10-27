import { get, put, patch, post, del } from '../lib/api.js';
import { esc, fmtDate, timeAgo, badge, tag, confirmDialog, formModal, toast, toastError, errorState } from '../lib/ui.js';
import { lfFields } from '../lib/lfForm.js';

export default async function ({ el, params, user, meta }) {
  const id = params[0];
  async function draw() {
    let i;
    try { ({ data: i } = await get('/lostfound/' + id)); } catch (e) { el.innerHTML = errorState(e); return; }
    const admin = user.role === 'admin';
    el.innerHTML = `<a href="#/lostfound" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> All listings</a>
    <div class="row g-4 mt-1"><div class="col-lg-7"><div class="cc-card overflow-hidden">
      ${i.hasImage ? `<img class="w-100" style="max-height:420px;object-fit:contain;background:#f3f4f6" src="/api/lostfound/${i._id}/image" alt="Photo of ${esc(i.name)}">` : ''}
      <div class="card-body-pad"><div class="mb-2">${badge(i.type)} ${tag(i.category, 'b-gray')} ${i.status === 'recovered' ? badge('recovered', 'Recovered / Returned') : badge('open')} ${i.flagged ? tag('Flagged for review', 'b-red') : ''}</div>
      <h1 class="h2 fw-bold">${esc(i.name)}</h1><p class="prewrap">${esc(i.description)}</p></div></div></div>
    <div class="col-lg-5"><div class="cc-card card-body-pad">
      <dl class="mb-3"><dt class="small text-secondary"><i class="bi bi-geo-alt"></i> Location</dt><dd>${esc(i.location)}</dd>
      <dt class="small text-secondary"><i class="bi bi-calendar3"></i> Date ${i.type}</dt><dd>${fmtDate(i.date)}</dd>
      <dt class="small text-secondary"><i class="bi bi-person"></i> Reported by</dt><dd>${esc(i.reporter?.name || '—')} · ${timeAgo(i.createdAt)}</dd>
      <dt class="small text-secondary"><i class="bi bi-telephone"></i> Contact</dt><dd>${i.contactInfo ? esc(i.contactInfo) + (i.isOwner || admin ? (i.showContact ? '' : ' <span class="badge b-gray badge-soft">private</span>') : '') : '<span class="text-secondary">Not shared. Contact the administration office for help.</span>'}</dd>
      ${(i.isOwner || admin) && i.flagged ? `<dt class="small text-secondary">Flag reason</dt><dd>${esc(i.flagReason)}</dd>` : ''}</dl>
      <div class="d-grid gap-2">
      ${(i.isOwner || admin) && i.status === 'open' ? `<button class="btn btn-success" data-act="recover"><i class="bi bi-check2-circle"></i> Mark as ${i.type === 'lost' ? 'recovered' : 'returned'}</button>` : ''}
      ${(i.isOwner || admin) && i.status === 'recovered' ? '<button class="btn btn-outline-secondary" data-act="reopen"><i class="bi bi-arrow-counterclockwise"></i> Re-open listing</button>' : ''}
      ${i.isOwner || admin ? '<button class="btn btn-outline-primary" data-act="edit"><i class="bi bi-pencil"></i> Edit</button><button class="btn btn-outline-danger" data-act="delete"><i class="bi bi-trash"></i> Delete</button>' : ''}
      ${!i.isOwner && !admin ? '<button class="btn btn-outline-warning" data-act="flag"><i class="bi bi-flag"></i> Report suspicious / duplicate</button>' : ''}
      ${admin && i.flagged ? '<button class="btn btn-outline-secondary" data-act="unflag">Clear flag</button>' : ''}
      </div></div></div></div>`;
    el._item = i;
  }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = el._item;
    try {
      switch (b.dataset.act) {
        case 'recover': await patch(`/lostfound/${id}/status`, { status: 'recovered' }); toast('Marked as ' + (i.type === 'lost' ? 'recovered' : 'returned')); draw(); break;
        case 'reopen': await patch(`/lostfound/${id}/status`, { status: 'open' }); toast('Listing re-opened', 'info'); draw(); break;
        case 'unflag': await del(`/lostfound/${id}/flag`); toast('Flag cleared'); draw(); break;
        case 'delete':
          if (await confirmDialog({ title: 'Delete this report?', message: 'The listing and its photo will be permanently removed.', confirmText: 'Delete', danger: true })) { await del('/lostfound/' + id); toast('Listing deleted'); location.hash = '#/lostfound'; }
          break;
        case 'flag':
          formModal({ title: 'Report this listing', size: '', fields: [{ name: 'reason', label: 'What is wrong with this listing?', type: 'textarea', rows: 3, required: true, max: 300 }], submitText: 'Send report',
            async onSubmit(v) { await post(`/lostfound/${id}/flag`, v); toast('Thanks — an administrator will review this listing.'); } });
          break;
        case 'edit':
          formModal({ title: 'Edit report', fields: lfFields(meta, { edit: true }), values: i, submitText: 'Save changes',
            async onSubmit(fd) { fd instanceof FormData ? await putForm(fd) : await put('/lostfound/' + id, fd); toast('Report updated'); draw(); } });
          break;
      }
    } catch (err) { toastError(err); }
  });
  const putForm = (fd) => fetch('/api/lostfound/' + id, { method: 'PUT', body: fd, credentials: 'same-origin' }).then(async (r) => { const j = await r.json(); if (!r.ok) { const { ApiError } = await import('../lib/api.js'); throw new ApiError(r.status, j.message, j.errors); } });
  await draw();
}
