import { get, post, qs } from '../api.js';
import { esc, fmtDate, timeAgo, badge, tag, spinner, emptyState, errorState, pager, bindFilters, searchBox, selectOpts, formModal, toast, fmtSize } from '../ui.js';
import { resourceFields } from '../resourceForm.js';

export const resourceCard = (r, mine) => `<div class="col-md-6 col-xl-4"><div class="cc-card hover h-100 p-3 d-flex flex-column">
  <div class="d-flex gap-3"><i class="bi bi-file-earmark-${r.file.ext === 'pdf' ? 'pdf' : 'text'} fs-1 text-primary"></i>
  <div class="min-w-0"><a class="item-title text-decoration-none stretched-link clamp-2" href="#/resources/${r._id}">${esc(r.title)}</a><div class="item-meta">${esc(r.subject)}</div></div></div>
  <div class="my-2">${tag(r.category)} ${tag('Sem ' + r.semester, 'b-gray')} ${tag(r.department, 'b-sky')}</div>
  <div class="item-meta mt-auto d-flex justify-content-between"><span>${mine ? badge(r.status) : 'by ' + esc(r.uploadedBy?.name || 'Admin')}</span><span><i class="bi bi-download"></i> ${r.downloads} · ${timeAgo(r.createdAt)}</span></div></div></div>`;

export default async function ({ el, meta }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = { q: '', department: '', semester: '', category: '', subject: '', page: 1, mine: params.get('tab') === 'mine' };
  el.innerHTML = `<div class="page-head"><div><h1>Notes &amp; Resources</h1><p>Lecture notes, question papers, lab manuals and more.</p></div>
    ${meta.studentUploads ? '<button class="btn btn-primary" id="uploadBtn"><i class="bi bi-cloud-arrow-up"></i> Upload notes</button>' : ''}</div>
    <ul class="nav nav-pills mb-3 gap-1" id="tabs"><li class="nav-item"><button class="nav-link ${state.mine ? '' : 'active'}" data-tab="all">All resources</button></li><li class="nav-item"><button class="nav-link ${state.mine ? 'active' : ''}" data-tab="mine">My uploads</button></li></ul>
    <div class="filters" id="filters">${searchBox('Search by title or subject')}
      <input class="form-control" data-filter="subject" type="search" placeholder="Subject" aria-label="Subject">
      <select class="form-select" data-filter="department" aria-label="Department">${selectOpts(meta.DEPARTMENTS, '', 'All departments')}</select>
      <select class="form-select" data-filter="semester" aria-label="Semester">${selectOpts([1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: 'Semester ' + n })), '', 'All semesters')}</select>
      <select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.RESOURCE_CATEGORIES, '', 'All categories')}</select></div>
    <div id="results"></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  const filters = el.querySelector('#filters');
  async function load() {
    results.innerHTML = spinner();
    try {
      const { data, meta: m } = await get((state.mine ? '/resources/mine' : '/resources') + qs({ ...state, mine: undefined, page: state.page }));
      results.innerHTML = data.length ? `<div class="row g-3">${data.map((r) => resourceCard(r, state.mine)).join('')}</div>` : emptyState('bi-journal-x', state.mine ? 'You have not uploaded anything' : 'No resources found', state.mine ? 'Share your notes to help others.' : 'Try different filters or search terms.');
      el.querySelector('#pager').innerHTML = pager(m);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  // subject filter uses 'search' type for debounce
  bindFilters(el, state, load);
  filters.classList.toggle('d-none', state.mine);
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { state.mine = t.dataset.tab === 'mine'; state.page = 1; el.querySelectorAll('#tabs .nav-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === t.dataset.tab)); filters.classList.toggle('d-none', state.mine); load(); }
    if (e.target.closest('#uploadBtn')) openUpload();
  });
  function openUpload() {
    formModal({ title: 'Upload notes', fields: resourceFields(meta), submitText: 'Upload', intro: 'Your upload will be visible to everyone once an administrator approves it.',
      async onSubmit(fd) { await post('/resources', fd); toast('Uploaded! It is pending admin approval.'); state.mine = true; filters.classList.add('d-none'); el.querySelectorAll('#tabs .nav-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'mine')); load(); } });
  }
  if (params.get('upload') && meta.studentUploads) openUpload();
  load();
}
