import { get, post, put, del, qs } from '../../api.js';
import { esc, fmtDateTime, badge, tag, searchBox, selectOpts, formModal, confirmDialog, infoModal, toast, toastError, fmtDate } from '../../ui.js';
import { adminList, actBtn } from '../../adminTable.js';

export default function ({ el, meta }) {
  const state = { q: '', status: '', when: 'all', page: 1 };
  const fields = [
    { name: 'title', label: 'Title', required: true, max: 140, col: 8 }, { name: 'category', label: 'Category', type: 'select', required: true, options: meta.EVENT_CATEGORIES, col: 4 },
    { name: 'description', label: 'Description', type: 'textarea', required: true, rows: 4, max: 4000 },
    { name: 'venue', label: 'Venue', required: true, col: 6 }, { name: 'organizer', label: 'Organizer', required: true, col: 6 },
    { name: 'startAt', label: 'Starts', type: 'datetime', required: true, col: 6 }, { name: 'endAt', label: 'Ends', type: 'datetime', col: 6 },
    { name: 'registrationDeadline', label: 'Registration deadline', type: 'datetime', col: 6, help: 'Defaults to event start.' },
    { name: 'capacity', label: 'Capacity', type: 'number', min: 0, col: 3, help: '0 = unlimited', default: 0 },
    { name: 'status', label: 'Status', type: 'select', required: true, options: meta.EVENT_STATUS, col: 3, default: 'published' },
  ];
  const form = (title, values, submit) => formModal({ title, fields, values, submitText: 'Save event', onSubmit: submit });
  adminList(el, {
    title: 'Manage events', subtitle: 'Create, publish and review participants.', state,
    head: '<button class="btn btn-primary" data-act="new"><i class="bi bi-plus-lg"></i> New event</button>',
    filters: `${searchBox('Search events')}<select class="form-select" data-filter="status" aria-label="Status">${selectOpts(meta.EVENT_STATUS, '', 'Any status')}</select><select class="form-select" data-filter="when" aria-label="When"><option value="all">All dates</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select>`,
    fetchRows: (s) => get('/events' + qs(s)),
    columns: [
      { h: 'Event', cell: (e) => `<div class="fw-semibold">${esc(e.title)}</div><div class="small text-secondary">${esc(e.venue)}</div>` },
      { h: 'Date', cell: (e) => fmtDateTime(e.startAt) }, { h: 'Category', cell: (e) => tag(e.category) },
      { h: 'Registered', cell: (e) => `${e.registeredCount}${e.capacity ? ' / ' + e.capacity : ''}` }, { h: 'Status', cell: (e) => badge(e.status) },
      { h: 'Actions', cell: (e) => `<div class="d-flex gap-1">${actBtn('people', e._id, 'bi-people', 'Participants')}${actBtn('edit', e._id, 'bi-pencil', 'Edit')}${actBtn('delete', e._id, 'bi-trash', 'Delete', 'btn-outline-danger')}</div>` },
    ],
    async onAction(act, e, { load }) {
      try {
        if (act === 'new') form('New event', {}, async (v) => { await post('/events', v); toast('Event created'); load(); });
        if (act === 'edit') form('Edit event', e, async (v) => { await put('/events/' + e._id, v); toast('Event updated'); load(); });
        if (act === 'delete' && await confirmDialog({ title: 'Delete event?', message: `"${e.title}" and its ${e.registeredCount} registration(s) will be permanently removed.`, confirmText: 'Delete', danger: true })) { await del('/events/' + e._id); toast('Event deleted'); load(); }
        if (act === 'people') {
          const { data } = await get(`/events/${e._id}/participants`);
          infoModal(`Participants — ${e.title}`, `<div class="d-flex justify-content-between mb-2"><span>${data.length} registered</span><a class="btn btn-sm btn-outline-primary" href="/api/events/${e._id}/participants?format=csv"><i class="bi bi-download"></i> CSV</a></div>${data.length ? `<div class="table-wrap"><table class="table cc-table"><thead><tr><th>Name</th><th>Student ID</th><th>Department</th><th>Registered</th></tr></thead><tbody>${data.map((r) => `<tr><td>${esc(r.user.name)}<div class="small text-secondary">${esc(r.user.email)}</div></td><td>${esc(r.user.studentId)}</td><td>${esc(r.user.department)}</td><td>${fmtDate(r.registeredAt)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-secondary">No registrations yet.</p>'}`);
        }
      } catch (err) { toastError(err); }
    },
  });
}
