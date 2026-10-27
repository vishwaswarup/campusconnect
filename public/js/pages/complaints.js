import { get, post, qs } from '../lib/api.js';
import { esc, fmtDate, timeAgo, badge, tag, spinner, emptyState, errorState, pager, bindFilters, searchBox, selectOpts, formModal, toast } from '../lib/ui.js';

export default async function ({ el, meta }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = { q: '', status: '', category: '', page: 1 };
  el.innerHTML = `<div class="page-head"><div><h1>Complaints</h1><p><i class="bi bi-lock-fill"></i> Private — only you and college administrators can see your complaints.</p></div><button class="btn btn-primary" id="newBtn"><i class="bi bi-plus-lg"></i> New complaint</button></div>
  <div class="filters">${searchBox('Search by title or ticket ID')}
    <select class="form-select" data-filter="status" aria-label="Status">${selectOpts(meta.COMPLAINT_STATUS.map((s) => ({ value: s, label: s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) })), '', 'All statuses')}</select>
    <select class="form-select" data-filter="category" aria-label="Category">${selectOpts(meta.COMPLAINT_CATEGORIES, '', 'All categories')}</select></div>
  <div class="cc-card" id="results"></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  async function load() {
    results.innerHTML = spinner();
    try {
      const { data, meta: m } = await get('/complaints' + qs(state));
      results.innerHTML = data.length ? data.map((c) => `<a class="list-item" href="#/complaints/${c._id}"><div class="flex-grow-1 min-w-0"><p class="item-title">${esc(c.title)}</p><div class="item-meta">${esc(c.ticketId)} · ${tag(c.category, 'b-gray')} · submitted ${fmtDate(c.createdAt)} · updated ${timeAgo(c.updatedAt)}</div></div>${badge(c.status)}</a>`).join('')
        : emptyState('bi-chat-square-text', 'No complaints found', 'Have an issue? Raise a complaint and track its progress.', '<button class="btn btn-primary btn-sm" data-new>Raise a complaint</button>');
      el.querySelector('#pager').innerHTML = pager(m);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  bindFilters(el, state, load);
  const openNew = () => formModal({
    title: 'Submit a complaint', submitText: 'Submit complaint',
    intro: 'Your complaint is confidential. You can track its status and exchange messages with the administration.',
    fields: [
      { name: 'title', label: 'Title', required: true, max: 140, col: 8, placeholder: 'Short summary of the issue' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: meta.COMPLAINT_CATEGORIES, col: 4 },
      { name: 'description', label: 'Description', type: 'textarea', rows: 5, required: true, max: 4000, help: 'At least 20 characters. Include what, where and when.' },
      { name: 'attachment', label: 'Attachment (optional)', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', help: 'PDF, JPG or PNG, max 5 MB.' },
    ],
    async onSubmit(fd) { const r = await post('/complaints', fd); toast('Complaint submitted. Ticket ' + r.data.ticketId); location.hash = '#/complaints/' + r.data._id; },
  });
  el.addEventListener('click', (e) => { if (e.target.closest('#newBtn, [data-new]')) openNew(); });
  if (params.get('new')) openNew();
  load();
}
