import { get, qs } from '../../lib/api.js';
import { esc, fmtDate, timeAgo, badge, tag, searchBox, selectOpts, labelize } from '../../lib/ui.js';
import { adminList } from '../../lib/adminTable.js';

export default function ({ el, meta }) {
  const state = { q: '', status: 'open', priority: '', category: '', sort: 'priority', page: 1 };
  adminList(el, {
    title: 'Manage complaints', subtitle: 'Review, prioritise, assign and resolve student grievances.', state,
    filters: `${searchBox('Search title or ticket ID')}<select class="form-select" data-filter="status" aria-label="Status"><option value="open">All open</option>${meta.COMPLAINT_STATUS.map((s) => `<option value="${s}">${labelize(s)}</option>`).join('')}<option value="">Everything</option></select>
      <select class="form-select" data-filter="priority" aria-label="Priority">${selectOpts(meta.COMPLAINT_PRIORITY.map((p) => ({ value: p, label: labelize(p) })), '', 'Any priority')}</select>
      <select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.COMPLAINT_CATEGORIES, '', 'All categories')}</select>
      <select class="form-select" data-filter="sort" aria-label="Sort"><option value="priority">Sort: priority</option><option value="new">Sort: newest</option></select>`,
    fetchRows: (s) => get('/complaints' + qs(s)),
    columns: [
      { h: 'Ticket', cell: (c) => `<a class="fw-semibold text-decoration-none" href="#/admin/complaints/${c._id}">${esc(c.ticketId)}</a>` },
      { h: 'Complaint', cell: (c) => `<div class="fw-semibold">${esc(c.title)}</div><div class="small text-secondary">${tag(c.category, 'b-gray')}</div>` },
      { h: 'Student', cell: (c) => `${esc(c.student?.name || '—')}<div class="small text-secondary">${esc(c.student?.studentId || '')}</div>` },
      { h: 'Priority', cell: (c) => badge(c.priority) }, { h: 'Status', cell: (c) => badge(c.status) }, { h: 'Assigned', cell: (c) => esc(c.assignedTo || '—') },
      { h: 'Updated', cell: (c) => timeAgo(c.updatedAt) }, { h: '', cell: (c) => `<a class="btn btn-sm btn-primary" href="#/admin/complaints/${c._id}">Open</a>` },
    ],
    onAction() {},
  });
}
