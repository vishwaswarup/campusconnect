import { get, patch, qs } from '../../lib/api.js';
import { esc, fmtDate, badge, selectOpts, confirmDialog, toast, toastError } from '../../lib/ui.js';
import { adminList, actBtn } from '../../lib/adminTable.js';
import { refreshBadges } from '../../app.js';

export default async function ({ el, meta }) {
  const state = { status: 'pending', club: '', page: 1 };
  const { data: clubs } = await get('/clubs?limit=50');
  adminList(el, {
    title: 'Membership requests', subtitle: 'Approve or reject club join requests.', state,
    filters: `<select class="form-select" data-filter="status" aria-label="Status">${selectOpts(meta.MEMBERSHIP_STATUS, 'pending', 'Any status')}</select><select class="form-select" data-filter="club" aria-label="Club">${selectOpts(clubs.map((c) => ({ value: c._id, label: c.name })), '', 'All clubs')}</select>`,
    fetchRows: (s) => get('/clubs/memberships' + qs(s)),
    emptyText: 'No requests found',
    columns: [
      { h: 'Student', cell: (m) => `<div class="fw-semibold">${esc(m.user.name)}</div><div class="small text-secondary">${esc(m.user.studentId)} · ${esc(m.user.department || '')}</div>` },
      { h: 'Club', cell: (m) => esc(m.club.name) }, { h: 'Message', cell: (m) => esc(m.message || '—') }, { h: 'Requested', cell: (m) => fmtDate(m.createdAt) }, { h: 'Status', cell: (m) => badge(m.status) },
      { h: 'Actions', cell: (m) => m.status === 'pending' ? `<div class="d-flex gap-1">${actBtn('approved', m._id, 'bi-check-lg', 'Approve', 'btn-outline-success')}${actBtn('rejected', m._id, 'bi-x-lg', 'Reject', 'btn-outline-danger')}</div>` : m.status === 'approved' ? actBtn('rejected', m._id, 'bi-person-dash', 'Revoke membership', 'btn-outline-danger') : '' },
    ],
    async onAction(act, m, { load }) {
      try {
        if (act === 'rejected' && !(await confirmDialog({ title: m.status === 'approved' ? 'Revoke membership?' : 'Reject request?', message: `${m.user.name} — ${m.club.name}`, confirmText: 'Confirm', danger: true }))) return;
        await patch('/clubs/memberships/' + m._id, { status: act }); toast(act === 'approved' ? 'Request approved' : 'Request rejected'); load(); refreshBadges();
      } catch (e) { toastError(e); }
    },
  });
}
