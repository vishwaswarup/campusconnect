import { get, post, qs } from '../api.js';
import { esc, fmtDate, timeAgo, badge, tag, spinner, emptyState, errorState, pager, bindFilters, searchBox, selectOpts, formModal, toast } from '../ui.js';
import { lfFields } from '../lfForm.js';

export const lfCard = (i, mine) => `<div class="col-sm-6 col-xl-4"><div class="cc-card hover h-100 overflow-hidden">
  ${i.hasImage ? `<img class="thumb" loading="lazy" src="/api/lostfound/${i._id}/image" alt="Photo of ${esc(i.name)}">` : `<div class="thumb"><i class="bi bi-box-seam"></i></div>`}
  <div class="p-3"><div class="d-flex justify-content-between gap-2"><a class="item-title text-decoration-none stretched-link" href="#/lostfound/${i._id}">${esc(i.name)}</a>${badge(i.type)}</div>
  <div class="item-meta mt-1"><i class="bi bi-geo-alt"></i> ${esc(i.location)}</div><div class="item-meta"><i class="bi bi-calendar3"></i> ${fmtDate(i.date)} · ${tag(i.category, 'b-gray')}</div>
  <div class="mt-2">${i.status === 'recovered' ? badge('recovered', 'Recovered / Returned') : (mine ? badge('open') : '')} ${i.flagged ? tag('Flagged', 'b-red') : ''}</div></div></div></div>`;

export default async function ({ el, meta }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = { q: '', type: '', category: '', status: 'open', page: 1, mine: false };
  el.innerHTML = `<div class="page-head"><div><h1>Lost &amp; Found</h1><p>Lost something? Found something? Post it here.</p></div><button class="btn btn-primary" id="newBtn"><i class="bi bi-plus-lg"></i> Report an item</button></div>
  <ul class="nav nav-pills mb-3 gap-1" id="tabs"><li class="nav-item"><button class="nav-link active" data-tab="all">All listings</button></li><li class="nav-item"><button class="nav-link" data-tab="mine">My reports</button></li></ul>
  <div class="filters" id="filters">${searchBox('Search items, locations')}
    <select class="form-select" data-filter="type" aria-label="Type"><option value="">Lost &amp; found</option><option value="lost">Lost</option><option value="found">Found</option></select>
    <select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.LF_CATEGORIES, '', 'All categories')}</select>
    <select class="form-select" data-filter="status" aria-label="Status"><option value="open">Still open</option><option value="recovered">Recovered</option><option value="">Any status</option></select></div>
  <div id="results"></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  async function load() {
    results.innerHTML = spinner();
    try {
      const { data, meta: m } = await get((state.mine ? '/lostfound/mine' : '/lostfound') + qs({ q: state.q, type: state.type, category: state.category, status: state.mine ? '' : state.status, page: state.page }));
      results.innerHTML = data.length ? `<div class="row g-3">${data.map((i) => lfCard(i, state.mine)).join('')}</div>` : emptyState('bi-search', 'No listings found', state.mine ? 'You have not reported anything yet.' : 'Try changing your filters.');
      el.querySelector('#pager').innerHTML = pager(m);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  bindFilters(el, state, load);
  function openNew() {
    formModal({ title: 'Report a lost or found item', fields: lfFields(meta), submitText: 'Submit report', values: { date: new Date().toISOString().slice(0, 10) },
      async onSubmit(fd) { const r = await post('/lostfound', fd); toast('Report submitted'); location.hash = '#/lostfound/' + r.data._id; } });
  }
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { state.mine = t.dataset.tab === 'mine'; state.page = 1; el.querySelectorAll('#tabs .nav-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === t.dataset.tab)); el.querySelector('#filters').classList.toggle('d-none', state.mine); load(); }
    if (e.target.closest('#newBtn')) openNew();
  });
  if (params.get('new')) openNew();
  load();
}
