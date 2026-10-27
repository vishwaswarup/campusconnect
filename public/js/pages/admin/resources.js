import { get, post, put, patch, del, qs } from '../../lib/api.js';
import { esc, fmtDate, badge, tag, searchBox, selectOpts, formModal, confirmDialog, toast, toastError } from '../../lib/ui.js';
import { adminList, actBtn } from '../../lib/adminTable.js';
import { resourceFields } from '../../lib/resourceForm.js';
import { refreshBadges } from '../../app.js?v=20261028';

export default function ({ el, meta }) {
  const state = { q: '', status: 'pending', department: '', page: 1 };
  adminList(el, {
    title: 'Manage notes', subtitle: 'Review student uploads and manage the library.', state,
    head: '<button class="btn btn-primary" data-act="new"><i class="bi bi-cloud-arrow-up"></i> Upload resource</button>',
    filters: `${searchBox('Search title or subject')}<select class="form-select" data-filter="status" aria-label="Status"><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option></select><select class="form-select" data-filter="department" aria-label="Department">${selectOpts(meta.DEPARTMENTS, '', 'All departments')}</select>`,
    fetchRows: (s) => get('/resources' + qs(s)),
    emptyText: 'No resources match these filters',
    columns: [
      { h: 'Title', cell: (r) => `<div class="fw-semibold">${esc(r.title)}</div><div class="small text-secondary">${esc(r.subject)} · ${tag(r.category, 'b-gray')}</div>` },
      { h: 'Dept / Sem', cell: (r) => `${esc(r.department)} · ${r.semester}` }, { h: 'Uploader', cell: (r) => esc(r.uploadedBy?.name || '—') },
      { h: 'Date', cell: (r) => fmtDate(r.createdAt) }, { h: 'Status', cell: (r) => badge(r.status) + (r.reviewNote ? `<div class="small text-secondary">${esc(r.reviewNote)}</div>` : '') }, { h: 'Downloads', cell: (r) => r.downloads },
      { h: 'Actions', cell: (r) => `<div class="d-flex gap-1">${actBtn('download', r._id, 'bi-download', 'Download')}${r.status !== 'approved' ? actBtn('approve', r._id, 'bi-check-lg', 'Approve', 'btn-outline-success') : ''}${r.status !== 'rejected' ? actBtn('reject', r._id, 'bi-x-lg', 'Reject', 'btn-outline-warning') : ''}${actBtn('edit', r._id, 'bi-pencil', 'Edit')}${actBtn('delete', r._id, 'bi-trash', 'Delete', 'btn-outline-danger')}</div>` },
    ],
    async onAction(act, r, { load }) {
      const done = (m) => { toast(m); load(); refreshBadges(); };
      try {
        if (act === 'new') formModal({ title: 'Upload resource', fields: resourceFields(meta), submitText: 'Upload', async onSubmit(fd) { await post('/resources', fd); done('Resource published'); } });
        if (act === 'download') location.href = `/api/resources/${r._id}/download`;
        if (act === 'approve') { await patch(`/resources/${r._id}/review`, { status: 'approved' }); done('Resource approved'); }
        if (act === 'reject') formModal({ title: 'Reject upload', size: '', submitText: 'Reject', fields: [{ name: 'reviewNote', label: 'Reason (shown to the student)', type: 'textarea', rows: 3, required: true, max: 300 }], async onSubmit(v) { await patch(`/resources/${r._id}/review`, { status: 'rejected', ...v }); done('Resource rejected'); } });
        if (act === 'edit') formModal({ title: 'Edit resource details', fields: resourceFields(meta, { withFile: false }), values: r, async onSubmit(v) { await put('/resources/' + r._id, v); done('Resource updated'); } });
        if (act === 'delete' && await confirmDialog({ title: 'Delete resource?', message: `"${r.title}" and its file will be permanently deleted.`, confirmText: 'Delete', danger: true })) { await del('/resources/' + r._id); done('Resource deleted'); }
      } catch (e) { toastError(e); }
    },
  });
}
