import { esc, spinner, emptyState, errorState, pager, bindFilters } from './ui.js';

// Generic admin list page: header, filters, table, pager. Row buttons use data-act/data-id and call onAction(act,row,ctx).
export function adminList(el, { title, subtitle = '', head = '', filters = '', state, columns, fetchRows, onAction, emptyText = 'No records found' }) {
  el.innerHTML = `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="d-flex gap-2 flex-wrap">${head}</div></div>
  <div class="filters">${filters}</div>
  <div class="cc-card"><div class="table-wrap" id="results"></div></div><div id="pager"></div>`;
  const results = el.querySelector('#results');
  let rows = [];
  async function load() {
    results.innerHTML = spinner();
    try {
      const { data, meta } = await fetchRows(state);
      rows = data;
      results.innerHTML = data.length
        ? `<table class="table cc-table"><thead><tr>${columns.map((c) => `<th scope="col">${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${data.map((r) => `<tr>${columns.map((c) => `<td>${c.cell(r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        : emptyState('bi-inbox', emptyText);
      el.querySelector('#pager').innerHTML = pager(meta);
    } catch (e) { results.innerHTML = errorState(e); }
  }
  bindFilters(el, state, load);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    onAction(b.dataset.act, rows.find((r) => r._id === b.dataset.id), { load, button: b });
  });
  load();
  return { load };
}
export const actBtn = (act, id, icon, label, cls = 'btn-light') => `<button class="btn btn-sm ${cls}" data-act="${act}" data-id="${id}" title="${esc(label)}" aria-label="${esc(label)}"><i class="bi ${icon}"></i></button>`;
