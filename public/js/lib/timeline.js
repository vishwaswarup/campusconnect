import { esc, fmtDateTime, badge, labelize } from './ui.js';

// Complaint history timeline (shared by student and admin views)
export function timeline(history) {
  return `<div class="timeline">${history.map((h) => {
    const who = h.authorRole === 'admin' ? `${esc(h.author?.name || 'Admin')} <span class="badge badge-soft b-green">Staff</span>` : `${esc(h.author?.name || 'Student')}`;
    const what = {
      created: 'submitted the complaint', status_change: `changed status ${h.fromStatus ? `from <strong>${labelize(h.fromStatus)}</strong> ` : ''}to <strong>${labelize(h.toStatus || '')}</strong>`,
      response: 'replied', follow_up: 'sent a follow-up', internal_note: 'added an <strong>internal note</strong> <em>(hidden from student)</em>', reopened: 'reopened the complaint', update: 'updated details',
    }[h.type] || h.type;
    return `<div class="tl-item ${h.internal ? 'internal' : h.authorRole === 'admin' ? 'admin' : ''}"><div class="small"><strong>${who}</strong> ${what} <span class="text-secondary">· ${fmtDateTime(h.createdAt)}</span></div>${h.message && h.type !== 'created' ? `<div class="tl-msg">${esc(h.message)}</div>` : ''}</div>`;
  }).join('')}</div>`;
}
