import { get, post, del, qs } from '../lib/api.js';
import { esc, fmtDateTime, dayMonth, badge, tag, spinner, emptyState, errorState, pager, bindFilters, searchBox, selectOpts, toast, toastError } from '../lib/ui.js';

export function eventCard(e) {
  const dm = dayMonth(e.startAt);
  const seats = e.capacity > 0 ? `${e.registeredCount}/${e.capacity} seats` : `${e.registeredCount} registered`;
  const pct = e.capacity > 0 ? Math.min(100, Math.round((e.registeredCount / e.capacity) * 100)) : 0;
  let status = '';
  if (e.isRegistered) status = badge('approved', 'Registered');
  else if (e.isPast) status = tag('Ended', 'b-gray');
  else if (e.isFull) status = tag('Full', 'b-red');
  else if (!e.registrationOpen) status = tag('Registration closed', 'b-amber');
  return `<div class="col-md-6 col-xl-4"><a class="cc-card hover d-block text-decoration-none h-100" href="#/events/${e._id}"><div class="p-3">
    <div class="d-flex gap-3"><div class="date-chip"><span class="d">${dm.d}</span><span class="m">${dm.m}</span></div>
    <div class="min-w-0"><p class="item-title clamp-2">${esc(e.title)}</p><div class="item-meta">${fmtDateTime(e.startAt)}</div></div></div>
    <p class="text-secondary small mt-3 mb-2 clamp-2">${esc(e.description)}</p>
    <div class="item-meta mb-2"><i class="bi bi-geo-alt"></i> ${esc(e.venue)} · <i class="bi bi-person"></i> ${esc(e.organizer)}</div>
    ${e.capacity > 0 ? `<div class="progress slim mb-1" role="progressbar" aria-label="Seats filled" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${pct}%"></div></div>` : ''}
    <div class="d-flex justify-content-between align-items-center mt-2"><span class="item-meta">${seats}</span><span>${tag(e.category)} ${status}</span></div></div></a></div>`;
}

export default async function ({ el, meta }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = { q: '', category: '', when: params.get('tab') === 'past' ? 'past' : 'upcoming', page: 1, mine: params.get('tab') === 'mine' };
  const tabBtn = (id, label) => `<li class="nav-item"><button class="nav-link ${(state.mine ? 'mine' : state.when) === id ? 'active' : ''}" data-tab="${id}">${label}</button></li>`;
  el.innerHTML = `<div class="page-head"><div><h1>Events</h1><p>Discover and register for what's happening on campus.</p></div></div>
    <ul class="nav nav-pills mb-3 gap-1" id="tabs">${tabBtn('upcoming', 'Upcoming')}${tabBtn('past', 'Past')}${tabBtn('mine', 'My registrations')}</ul>
    <div class="filters" id="filters">${searchBox('Search events, venues, organizers')}
      <select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.EVENT_CATEGORIES, '', 'All categories')}</select></div>
    <div id="results"></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  async function load() {
    results.innerHTML = spinner();
    try {
      let data, m;
      if (state.mine) ({ data } = await get('/events/mine'));
      else ({ data, meta: m } = await get('/events' + qs({ q: state.q, category: state.category, when: state.when, page: state.page })));
      results.innerHTML = data.length ? `<div class="row g-3">${data.map(eventCard).join('')}</div>` : emptyState('bi-calendar-x', state.mine ? 'No registrations yet' : 'No events found', state.mine ? 'Register for an event and it will show up here.' : 'Try changing your search or filters.', state.mine ? '<a class="btn btn-primary btn-sm" data-tab="upcoming">Browse events</a>' : '');
      el.querySelector('#pager').innerHTML = state.mine ? '' : pager(m);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  bindFilters(el, state, load);
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    state.mine = t.dataset.tab === 'mine'; if (!state.mine) state.when = t.dataset.tab; state.page = 1;
    el.querySelectorAll('#tabs .nav-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === t.dataset.tab));
    el.querySelector('#filters').classList.toggle('d-none', state.mine);
    load();
  });
  el.querySelector('#filters').classList.toggle('d-none', state.mine);
  load();
}
