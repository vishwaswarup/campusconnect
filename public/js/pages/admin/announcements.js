import { get, post, put, patch, del, qs } from '../../api.js';
import { esc, fmtDate, badge, tag, searchBox, selectOpts, formModal, confirmDialog, toast, toastError } from '../../ui.js';
import { adminList, actBtn } from '../../adminTable.js';

export default function ({ el, meta }) {
  const state = { q: '', category: '', status: '', page: 1 };
  const fields = [
    { name: 'title', label: 'Title', required: true, max: 160, col: 8 }, { name: 'category', label: 'Category', type: 'select', required: true, options: meta.ANNOUNCEMENT_CATEGORIES, col: 4, default: 'General' },
    { name: 'body', label: 'Content', type: 'textarea', rows: 6, required: true, max: 6000 },
    { name: 'departments', label: 'Visible to departments', type: 'multiselect', options: meta.DEPARTMENTS, help: 'Select none for everyone. Ctrl/Cmd-click for multiple.' },
    { name: 'publishAt', label: 'Publish at', type: 'datetime', col: 6 }, { name: 'expiresAt', label: 'Expires at (optional)', type: 'datetime', col: 6 },
    { name: 'status', label: 'Status', type: 'select', required: true, options: meta.ANNOUNCEMENT_STATUS || ['published', 'draft'], col: 4, default: 'published' },
    { name: 'pinned', label: 'Pin to top', type: 'checkbox' }, { name: 'important', label: 'Mark as important', type: 'checkbox' },
  ];
  const clean = (v) => { if (!v.publishAt) delete v.publishAt; return v; };
  adminList(el, {
    title: 'Manage announcements', subtitle: 'Publish, schedule, target and pin notices.', state,
    head: '<button class="btn btn-primary" data-act="new"><i class="bi bi-plus-lg"></i> New announcement</button>',
    filters: `${searchBox('Search announcements')}<select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.ANNOUNCEMENT_CATEGORIES, '', 'All categories')}</select><select class="form-select" data-filter="status" aria-label="Status"><option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option></select>`,
    fetchRows: (s) => get('/announcements' + qs(s)),
    columns: [
      { h: 'Title', cell: (a) => `${a.pinned ? '<i class="bi bi-pin-angle-fill pin"></i> ' : ''}<span class="fw-semibold">${esc(a.title)}</span> ${a.important ? tag('Important', 'b-red') : ''}` },
      { h: 'Category', cell: (a) => tag(a.category, 'b-gray') }, { h: 'Audience', cell: (a) => a.departments?.length ? esc(a.departments.join(', ')) : 'Everyone' },
      { h: 'Publish', cell: (a) => fmtDate(a.publishAt) }, { h: 'Expires', cell: (a) => fmtDate(a.expiresAt) }, { h: 'Status', cell: (a) => badge(a.status) },
      { h: 'Actions', cell: (a) => `<div class="d-flex gap-1">${actBtn('pin', a._id, a.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle', a.pinned ? 'Unpin' : 'Pin')}${actBtn('edit', a._id, 'bi-pencil', 'Edit')}${actBtn('delete', a._id, 'bi-trash', 'Delete', 'btn-outline-danger')}</div>` },
    ],
    async onAction(act, a, { load }) {
      try {
        if (act === 'new') formModal({ title: 'New announcement', fields, submitText: 'Save', async onSubmit(v) { await post('/announcements', clean(v)); toast('Announcement saved'); load(); } });
        if (act === 'edit') formModal({ title: 'Edit announcement', fields, values: a, submitText: 'Save', async onSubmit(v) { await put('/announcements/' + a._id, clean(v)); toast('Announcement updated'); load(); } });
        if (act === 'pin') { await patch(`/announcements/${a._id}/pin`); toast(a.pinned ? 'Unpinned' : 'Pinned'); load(); }
        if (act === 'delete' && await confirmDialog({ title: 'Delete announcement?', message: a.title, confirmText: 'Delete', danger: true })) { await del('/announcements/' + a._id); toast('Announcement deleted'); load(); }
      } catch (e) { toastError(e); }
    },
  });
}
