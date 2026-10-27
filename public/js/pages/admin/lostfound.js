import { get, patch, del, qs } from '../../api.js';
import { esc, fmtDate, badge, tag, searchBox, selectOpts, confirmDialog, toast, toastError } from '../../ui.js';
import { adminList, actBtn } from '../../adminTable.js';

export default function ({ el, meta }) {
  const state = { q: '', type: '', status: '', flagged: '', page: 1 };
  adminList(el, {
    title: 'Manage lost & found', subtitle: 'Moderate listings, handle flagged or duplicate posts.', state,
    filters: `${searchBox('Search listings')}<select class="form-select" data-filter="type" aria-label="Type"><option value="">Lost &amp; found</option><option value="lost">Lost</option><option value="found">Found</option></select><select class="form-select" data-filter="status" aria-label="Status"><option value="">Any status</option><option value="open">Open</option><option value="recovered">Recovered</option></select><select class="form-select" data-filter="flagged" aria-label="Flag"><option value="">All posts</option><option value="true">Flagged only</option></select>`,
    fetchRows: (s) => get('/lostfound' + qs(s)),
    columns: [
      { h: 'Item', cell: (i) => `<a class="fw-semibold text-decoration-none" href="#/lostfound/${i._id}">${esc(i.name)}</a><div class="small text-secondary">${esc(i.location)} · ${tag(i.category, 'b-gray')}</div>` },
      { h: 'Type', cell: (i) => badge(i.type) }, { h: 'Reported by', cell: (i) => esc(i.reporter?.name || '—') }, { h: 'Date', cell: (i) => fmtDate(i.date) },
      { h: 'Status', cell: (i) => badge(i.status) + (i.flagged ? `<div>${tag('Flagged', 'b-red')}</div><div class="small text-secondary">${esc(i.flagReason || '')}</div>` : '') },
      { h: 'Actions', cell: (i) => `<div class="d-flex gap-1">${actBtn('status', i._id, i.status === 'open' ? 'bi-check2-circle' : 'bi-arrow-counterclockwise', i.status === 'open' ? 'Mark recovered' : 'Reopen')}${i.flagged ? actBtn('unflag', i._id, 'bi-flag', 'Clear flag') : ''}${actBtn('delete', i._id, 'bi-trash', 'Remove listing', 'btn-outline-danger')}</div>` },
    ],
    async onAction(act, i, { load }) {
      try {
        if (act === 'status') { await patch(`/lostfound/${i._id}/status`, { status: i.status === 'open' ? 'recovered' : 'open' }); toast('Status updated'); load(); }
        if (act === 'unflag') { await del(`/lostfound/${i._id}/flag`); toast('Flag cleared'); load(); }
        if (act === 'delete' && await confirmDialog({ title: 'Remove listing?', message: `"${i.name}" will be permanently deleted.`, confirmText: 'Remove', danger: true })) { await del('/lostfound/' + i._id); toast('Listing removed'); load(); }
      } catch (e) { toastError(e); }
    },
  });
}
