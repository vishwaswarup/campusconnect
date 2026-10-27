import { get, post, put, del, qs } from '../../lib/api.js';
import { esc, badge, tag, searchBox, selectOpts, formModal, confirmDialog, toast, toastError } from '../../lib/ui.js';
import { adminList, actBtn } from '../../lib/adminTable.js';

export default function ({ el, meta }) {
  const state = { q: '', category: '', active: '', page: 1 };
  const fields = [
    { name: 'name', label: 'Club name', required: true, max: 80, col: 8 }, { name: 'category', label: 'Category', type: 'select', required: true, options: meta.CLUB_CATEGORIES, col: 4 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4, required: true, max: 2000 },
    { name: 'activities', label: 'Activities', help: 'Comma separated, e.g. Hackathons, Workshops' },
    { name: 'coordinator', label: 'Faculty coordinator', required: true, col: 6 }, { name: 'coordinatorEmail', label: 'Coordinator email', type: 'email', col: 6 },
    { name: 'meetingSchedule', label: 'Meeting schedule', col: 6 }, { name: 'capacity', label: 'Max members (0 = unlimited)', type: 'number', min: 0, col: 3, default: 0 },
    { name: 'active', label: 'Active (accepting members)', type: 'checkbox', default: true },
  ];
  adminList(el, {
    title: 'Manage clubs', subtitle: 'Create and maintain club listings.', state,
    head: '<button class="btn btn-primary" data-act="new"><i class="bi bi-plus-lg"></i> New club</button>',
    filters: `${searchBox('Search clubs')}<select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.CLUB_CATEGORIES, '', 'All categories')}</select><select class="form-select" data-filter="active" aria-label="Status"><option value="">Any status</option><option value="true">Active</option><option value="false">Inactive</option></select>`,
    fetchRows: (s) => get('/clubs' + qs(s)),
    columns: [
      { h: 'Club', cell: (c) => `<div class="fw-semibold">${esc(c.name)}</div><div class="small text-secondary">${esc(c.meetingSchedule || '')}</div>` }, { h: 'Category', cell: (c) => tag(c.category) },
      { h: 'Coordinator', cell: (c) => esc(c.coordinator) }, { h: 'Members', cell: (c) => `${c.memberCount}${c.capacity ? ' / ' + c.capacity : ''}` }, { h: 'Status', cell: (c) => badge(c.active ? 'active' : 'inactive') },
      { h: 'Actions', cell: (c) => `<div class="d-flex gap-1">${actBtn('edit', c._id, 'bi-pencil', 'Edit')}${actBtn('delete', c._id, 'bi-trash', 'Delete', 'btn-outline-danger')}</div>` },
    ],
    async onAction(act, c, { load }) {
      try {
        if (act === 'new') formModal({ title: 'New club', fields, values: { active: true }, async onSubmit(v) { await post('/clubs', v); toast('Club created'); load(); } });
        if (act === 'edit') formModal({ title: 'Edit club', fields, values: { ...c, activities: (c.activities || []).join(', ') }, async onSubmit(v) { await put('/clubs/' + c._id, v); toast('Club updated'); load(); } });
        if (act === 'delete' && await confirmDialog({ title: 'Delete club?', message: `"${c.name}" and all its membership records will be removed.`, confirmText: 'Delete', danger: true })) { await del('/clubs/' + c._id); toast('Club deleted'); load(); }
      } catch (e) { toastError(e); }
    },
  });
}
