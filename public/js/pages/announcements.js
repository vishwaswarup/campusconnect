import { get, qs } from '../api.js';
import { esc, fmtDate, timeAgo, tag, spinner, emptyState, errorState, pager, bindFilters, searchBox, selectOpts } from '../ui.js';

export const annItem = (a) => `<a class="list-item" href="#/announcements/${a._id}"><div class="flex-grow-1 min-w-0">
  <p class="item-title">${a.pinned ? '<i class="bi bi-pin-angle-fill pin" title="Pinned"></i> ' : ''}${esc(a.title)}</p>
  <p class="text-secondary small mb-1 clamp-2">${esc(a.body)}</p>
  <div class="item-meta">${tag(a.category, 'b-gray')} ${a.important ? tag('Important', 'b-red') : ''} ${a.departments?.length ? tag(a.departments.join(', '), 'b-sky') : ''} · ${timeAgo(a.publishAt)}</div></div><i class="bi bi-chevron-right text-secondary"></i></a>`;

export default async function ({ el, meta, user }) {
  const state = { q: '', category: '', department: '', page: 1 };
  el.innerHTML = `<div class="page-head"><div><h1>Announcements</h1><p>Official notices from the college.</p></div></div>
  <div class="filters">${searchBox('Search announcements')}
    <select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.ANNOUNCEMENT_CATEGORIES, '', 'All categories')}</select>
    <select class="form-select" data-filter="department" aria-label="Department">${selectOpts(meta.DEPARTMENTS, '', 'All departments')}</select></div>
  <div class="cc-card" id="results"></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  async function load() {
    results.innerHTML = spinner();
    try {
      const { data, meta: m } = await get('/announcements' + qs(state));
      results.innerHTML = data.length ? data.map(annItem).join('') : emptyState('bi-megaphone', 'No announcements found', 'Try different filters.');
      el.querySelector('#pager').innerHTML = pager(m);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  bindFilters(el, state, load);
  load();
}
