import { get, post, del, qs } from '../api.js';
import { esc, badge, tag, spinner, emptyState, errorState, pager, bindFilters, searchBox, selectOpts, formModal, confirmDialog, toast, toastError } from '../ui.js';

export default async function ({ el, meta }) {
  const state = { q: '', category: '', page: 1 };
  el.innerHTML = `<div class="page-head"><div><h1>Clubs</h1><p>Find your people. Join a club and take part in activities.</p></div></div>
  <div class="filters">${searchBox('Search clubs')}<select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.CLUB_CATEGORIES, '', 'All categories')}</select></div>
  <div id="results"></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  let clubs = [];
  const action = (c) => {
    if (c.membershipStatus === 'approved') return `<button class="btn btn-sm btn-outline-danger" data-act="withdraw" data-id="${c._id}">Leave club</button>`;
    if (c.membershipStatus === 'pending') return `<button class="btn btn-sm btn-outline-secondary" data-act="withdraw" data-id="${c._id}">Withdraw request</button>`;
    if (c.isFull) return '<button class="btn btn-sm btn-secondary" disabled>Club full</button>';
    return `<button class="btn btn-sm btn-primary" data-act="join" data-id="${c._id}">${c.membershipStatus === 'rejected' ? 'Apply again' : 'Request to join'}</button>`;
  };
  async function load() {
    results.innerHTML = spinner();
    try {
      const { data, meta: m } = await get('/clubs' + qs(state));
      clubs = data;
      results.innerHTML = data.length ? `<div class="row g-3">${data.map((c) => `<div class="col-md-6 col-xl-4"><div class="cc-card hover h-100 p-3 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start gap-2"><h2 class="h5 fw-bold mb-1">${esc(c.name)}</h2>${c.membershipStatus ? badge(c.membershipStatus, c.membershipStatus === 'approved' ? 'Member' : undefined) : ''}</div>
        <div class="mb-2">${tag(c.category)} <span class="item-meta ms-1"><i class="bi bi-people"></i> ${c.memberCount}${c.capacity ? '/' + c.capacity : ''} members</span></div>
        <p class="text-secondary small clamp-2">${esc(c.description)}</p>
        ${c.activities?.length ? `<div class="mb-2">${c.activities.slice(0, 3).map((a) => `<span class="badge badge-soft b-gray me-1 mb-1">${esc(a)}</span>`).join('')}</div>` : ''}
        <div class="item-meta mb-1"><i class="bi bi-person-badge"></i> ${esc(c.coordinator)}</div>
        ${c.meetingSchedule ? `<div class="item-meta mb-3"><i class="bi bi-clock"></i> ${esc(c.meetingSchedule)}</div>` : ''}
        <div class="mt-auto d-flex gap-2"><button class="btn btn-sm btn-light" data-act="info" data-id="${c._id}">Details</button>${action(c)}</div></div></div>`).join('')}</div>`
        : emptyState('bi-people', 'No clubs found', 'Try a different search.');
      el.querySelector('#pager').innerHTML = pager(m);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  bindFilters(el, state, load);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const c = clubs.find((x) => x._id === b.dataset.id);
    try {
      if (b.dataset.act === 'join') formModal({ title: `Join ${c.name}`, size: '', submitText: 'Send request', intro: `Coordinator: ${esc(c.coordinator)}. An administrator will review your request.`,
        fields: [{ name: 'message', label: 'Why do you want to join? (optional)', type: 'textarea', rows: 3, max: 500 }],
        async onSubmit(v) { await post(`/clubs/${c._id}/join`, v); toast('Request sent. You will see the decision here.'); load(); } });
      if (b.dataset.act === 'withdraw' && await confirmDialog({ title: c.membershipStatus === 'approved' ? 'Leave this club?' : 'Withdraw request?', message: c.name, confirmText: 'Confirm', danger: true })) { await del(`/clubs/${c._id}/join`); toast('Done', 'info'); load(); }
      if (b.dataset.act === 'info') {
        const { infoModal } = await import('../ui.js');
        infoModal(c.name, `<p>${esc(c.description)}</p><dl><dt>Faculty coordinator</dt><dd>${esc(c.coordinator)}${c.coordinatorEmail ? ` · <a href="mailto:${esc(c.coordinatorEmail)}">${esc(c.coordinatorEmail)}</a>` : ''}</dd><dt>Meets</dt><dd>${esc(c.meetingSchedule || 'To be announced')}</dd><dt>Activities</dt><dd>${(c.activities || []).map((a) => `<span class="badge badge-soft b-indigo me-1">${esc(a)}</span>`).join('') || '—'}</dd></dl>`, '');
      }
    } catch (err) { toastError(err); }
  });
  load();
}
