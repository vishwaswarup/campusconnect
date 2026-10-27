import { get, del } from '../lib/api.js';
import { esc, fmtDate, fmtSize, badge, tag, confirmDialog, toast, toastError, errorState } from '../lib/ui.js';

export default async function ({ el, params, user }) {
  let r;
  try { ({ data: r } = await get('/resources/' + params[0])); } catch (e) { el.innerHTML = errorState(e); return; }
  const owner = String(r.uploadedBy?._id) === String(user._id);
  el.innerHTML = `<a href="#/resources" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> All resources</a>
  <div class="row g-4 mt-1"><div class="col-lg-8"><div class="cc-card card-body-pad">
    <div class="mb-2">${tag(r.category)} ${tag(r.department, 'b-sky')} ${tag('Semester ' + r.semester, 'b-gray')} ${r.status !== 'approved' ? badge(r.status) : ''}</div>
    <h1 class="h2 fw-bold">${esc(r.title)}</h1><p class="text-secondary">${esc(r.subject)}</p>
    <p class="prewrap">${esc(r.description || 'No description provided.')}</p>
    ${r.status === 'rejected' && r.reviewNote ? `<div class="alert alert-danger"><strong>Rejected:</strong> ${esc(r.reviewNote)}</div>` : ''}
    ${r.status === 'pending' ? '<div class="alert alert-warning mb-0">This upload is awaiting admin approval and is visible only to you.</div>' : ''}
  </div></div>
  <div class="col-lg-4"><div class="cc-card card-body-pad">
    <div class="d-flex align-items-center gap-3 mb-3"><i class="bi bi-file-earmark-${r.file.ext === 'pdf' ? 'pdf' : 'text'} fs-1 text-primary"></i><div class="min-w-0"><div class="fw-semibold text-truncate">${esc(r.file.originalName)}</div><div class="item-meta">${r.file.ext.toUpperCase()} · ${fmtSize(r.file.size)}</div></div></div>
    <a class="btn btn-primary w-100 mb-2" href="/api/resources/${r._id}/download"><i class="bi bi-download"></i> Download</a>
    ${owner && r.status !== 'approved' ? '<button class="btn btn-outline-danger w-100 mb-2" id="delBtn"><i class="bi bi-trash"></i> Delete my upload</button>' : ''}
    <dl class="mt-3 mb-0 small"><dt class="text-secondary">Uploaded by</dt><dd>${esc(r.uploadedBy?.name || '—')}</dd><dt class="text-secondary">Date</dt><dd>${fmtDate(r.createdAt)}</dd><dt class="text-secondary">Downloads</dt><dd class="mb-0">${r.downloads}</dd></dl>
  </div></div></div>`;
  el.querySelector('#delBtn')?.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Delete upload?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    try { await del('/resources/' + r._id); toast('Upload deleted'); location.hash = '#/resources?tab=mine'; } catch (e) { toastError(e); }
  });
}
