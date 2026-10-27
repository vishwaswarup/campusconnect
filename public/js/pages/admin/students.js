import { get, patch } from '../../api.js';
import { esc, fmtDate, badge, searchBox, selectOpts, formModal, confirmDialog, toast, toastError } from '../../ui.js';
import { adminList, actBtn } from '../../adminTable.js';

export default function ({ el, meta, user }) {
  const state = { q: '', department: '', active: '', page: 1 };
  adminList(el, {
    title: 'Students', subtitle: 'Search, edit and activate or deactivate accounts.', state,
    filters: `${searchBox('Search name, email or ID')}<select class="form-select" data-filter="department" aria-label="Department">${selectOpts(meta.DEPARTMENTS, '', 'All departments')}</select><select class="form-select" data-filter="active" aria-label="Status"><option value="">Any status</option><option value="true">Active</option><option value="false">Inactive</option></select>`,
    fetchRows: (s) => get('/admin/users?role=student&' + new URLSearchParams(Object.entries(s).filter(([, v]) => v !== ''))),
    columns: [
      { h: 'Student', cell: (u) => `<div class="fw-semibold">${esc(u.name)}</div><div class="small text-secondary">${esc(u.email)}</div>` },
      { h: 'ID', cell: (u) => esc(u.studentId) }, { h: 'Department', cell: (u) => esc(u.department || '—') },
      { h: 'Course', cell: (u) => `${esc(u.course || '')} · Y${u.year || '?'}` }, { h: 'Joined', cell: (u) => fmtDate(u.createdAt) },
      { h: 'Status', cell: (u) => badge(u.active ? 'active' : 'inactive') },
      { h: 'Actions', cell: (u) => `<div class="d-flex gap-1">${actBtn('edit', u._id, 'bi-pencil', 'Edit')}${actBtn('toggle', u._id, u.active ? 'bi-person-x' : 'bi-person-check', u.active ? 'Deactivate' : 'Activate', u.active ? 'btn-outline-danger' : 'btn-outline-success')}</div>` },
    ],
    async onAction(act, u, { load }) {
      try {
        if (act === 'toggle') {
          if (!(await confirmDialog({ title: u.active ? 'Deactivate account?' : 'Activate account?', message: `${u.name} will ${u.active ? 'no longer be able to log in' : 'be able to log in again'}.`, confirmText: u.active ? 'Deactivate' : 'Activate', danger: u.active }))) return;
          await patch('/admin/users/' + u._id, { active: !u.active }); toast('Account ' + (u.active ? 'deactivated' : 'activated')); load();
        } else if (act === 'edit') formModal({ title: 'Edit student', size: '', submitText: 'Save', values: u, fields: [
          { name: 'name', label: 'Full name', required: true }, { name: 'department', label: 'Department', type: 'select', required: true, options: meta.DEPARTMENTS },
          { name: 'course', label: 'Course', type: 'select', required: true, options: meta.COURSES, col: 6 }, { name: 'year', label: 'Year', type: 'number', min: 1, max: 5, required: true, col: 6 }],
          async onSubmit(v) { await patch('/admin/users/' + u._id, v); toast('Student updated'); load(); } });
      } catch (e) { toastError(e); }
    },
  });
}
