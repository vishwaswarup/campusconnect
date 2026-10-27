import { get } from '../../api.js';
import { esc, timeAgo, fmtDate, badge, emptyState, errorState } from '../../ui.js';

export default async function ({ el }) {
  let d;
  try { ({ data: d } = await get('/admin/stats')); } catch (e) { el.innerHTML = errorState(e); return; }
  const c = d.counts;
  const stat = (href, icon, color, n, label, sub = '') => `<div class="col-6 col-lg-3"><a class="cc-card hover stat-card" href="${href}"><div class="ic ${color}"><i class="bi ${icon}"></i></div><div><div class="num">${n}</div><div class="lbl">${label}</div>${sub ? `<div class="small text-secondary">${sub}</div>` : ''}</div></a></div>`;
  el.innerHTML = `<div class="page-head"><div><h1>Admin overview</h1><p>Live figures from the database.</p></div></div>
  <div class="row g-3 mb-4">
    ${stat('#/admin/students', 'bi-mortarboard', 'ic-indigo', c.students, 'Registered students', `+${c.newStudents} this week`)}
    ${stat('#/admin/events', 'bi-calendar-event', 'ic-sky', c.upcomingEvents, 'Upcoming events')}
    ${stat('#/admin/events', 'bi-ticket-perforated', 'ic-green', c.registrations, 'Event registrations')}
    ${stat('#/admin/resources', 'bi-journal-check', 'ic-amber', c.pendingResources, 'Pending note approvals')}
    ${stat('#/admin/clubs', 'bi-people', 'ic-violet', c.activeClubs, 'Active clubs')}
    ${stat('#/admin/memberships', 'bi-person-check', 'ic-indigo', c.pendingMemberships, 'Pending club requests')}
    ${stat('#/admin/complaints', 'bi-chat-square-text', 'ic-rose', c.openComplaints, 'Open complaints')}
    ${stat('#/admin/lostfound', 'bi-search-heart', 'ic-sky', c.recentLF, 'Lost & found (7 days)')}
  </div>
  <div class="row g-4 mb-4">
    <div class="col-lg-4"><div class="cc-card h-100"><div class="card-head"><h2>Complaints by status</h2></div><div class="card-body-pad"><div class="chart-box"><canvas id="c1" role="img" aria-label="Complaints by status"></canvas></div></div></div></div>
    <div class="col-lg-4"><div class="cc-card h-100"><div class="card-head"><h2>Students by department</h2></div><div class="card-body-pad"><div class="chart-box"><canvas id="c2" role="img" aria-label="Students by department"></canvas></div></div></div></div>
    <div class="col-lg-4"><div class="cc-card h-100"><div class="card-head"><h2>Event registrations</h2></div><div class="card-body-pad"><div class="chart-box"><canvas id="c3" role="img" aria-label="Registrations per event"></canvas></div></div></div></div>
  </div>
  <div class="row g-4">
    <div class="col-lg-6"><div class="cc-card h-100"><div class="card-head"><h2>Recent administrative activity</h2></div>${d.recentActivity.length ? d.recentActivity.map((a) => `<div class="list-item"><i class="bi bi-activity text-primary fs-5"></i><div><p class="item-title">${esc(a.summary)}</p><div class="item-meta">${esc(a.actor?.name || 'System')} · ${timeAgo(a.createdAt)}</div></div></div>`).join('') : emptyState('bi-activity', 'No activity yet')}</div></div>
    <div class="col-lg-6"><div class="cc-card h-100"><div class="card-head"><h2>Recent lost &amp; found</h2><a class="small fw-semibold text-decoration-none" href="#/admin/lostfound">Manage</a></div>${d.recentLostFound.length ? d.recentLostFound.map((i) => `<a class="list-item" href="#/lostfound/${i._id}"><div class="flex-grow-1"><p class="item-title">${esc(i.name)}</p><div class="item-meta">${esc(i.location)} · ${fmtDate(i.date)} · ${esc(i.reporter?.name || '')}</div></div>${badge(i.type)}</a>`).join('') : emptyState('bi-search', 'No listings')}</div></div>
  </div>`;
  const colors = ['#1f4d3a', '#d9a441', '#a8432c', '#6fa283', '#5b6b63', '#8a6d3b'];
  const lbl = (s) => s.replace('_', ' ').replace(/^\w/, (x) => x.toUpperCase());
  new Chart(el.querySelector('#c1'), { type: 'doughnut', data: { labels: d.complaintsByStatus.map((x) => lbl(x.status)), datasets: [{ data: d.complaintsByStatus.map((x) => x.count), backgroundColor: ['#8a948d', '#d9a441', '#1f4d3a', '#6fa283'] }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
  new Chart(el.querySelector('#c2'), { type: 'bar', data: { labels: d.studentsByDepartment.map((x) => x.department), datasets: [{ label: 'Students', data: d.studentsByDepartment.map((x) => x.count), backgroundColor: colors[0], borderRadius: 3 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxRotation: 60 } } } } });
  new Chart(el.querySelector('#c3'), { type: 'bar', data: { labels: d.popularEvents.map((x) => x.title.slice(0, 22)), datasets: [{ label: 'Registered', data: d.popularEvents.map((x) => x.registeredCount), backgroundColor: colors[1], borderRadius: 3 }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
}
