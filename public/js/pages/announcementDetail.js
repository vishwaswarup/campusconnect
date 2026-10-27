import { get } from '../lib/api.js';
import { esc, fmtDateTime, tag, errorState } from '../lib/ui.js';

export default async function ({ el, params }) {
  let a;
  try { ({ data: a } = await get('/announcements/' + params[0])); } catch (e) { el.innerHTML = errorState(e); return; }
  el.innerHTML = `<a href="#/announcements" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> All announcements</a>
  <div class="cc-card card-body-pad mt-3" style="max-width:860px">
    <div class="mb-2">${a.pinned ? tag('📌 Pinned', 'b-amber') : ''} ${tag(a.category, 'b-gray')} ${a.important ? tag('Important', 'b-red') : ''} ${a.departments?.length ? tag(a.departments.join(', '), 'b-sky') : tag('All departments', 'b-sky')}</div>
    <h1 class="h2 fw-bold">${esc(a.title)}</h1>
    <div class="item-meta mb-3">Posted ${fmtDateTime(a.publishAt)}${a.author ? ' by ' + esc(a.author.name) : ''}${a.expiresAt ? ' · Expires ' + fmtDateTime(a.expiresAt) : ''}</div>
    <div class="prewrap">${esc(a.body)}</div></div>`;
}
