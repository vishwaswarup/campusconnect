import { get } from '../api.js';
import { esc, fmtDate, fmtDateTime, dayMonth, timeAgo, badge, tag, emptyState, errorState } from '../ui.js';

export default async function ({ el, user }) {
  let d;
  try { ({ data: d } = await get('/dashboard')); } catch (e) { el.innerHTML = errorState(e); return; }
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const stat = (href, icon, color, n, label) => `<div class="col-6 col-lg-3"><a class="cc-card hover stat-card" href="${href}"><div class="ic ${color}"><i class="bi ${icon}"></i></div><div><div class="num">${n}</div><div class="lbl">${label}</div></div></a></div>`;
  const qa = (href, icon, label) => `<div class="col-4 col-md-3 col-xl-2"><a class="quick-action" href="${href}"><i class="bi ${icon}"></i>${label}</a></div>`;
  const card = (title, href, body, linkText = 'View all') => `<div class="cc-card h-100"><div class="card-head"><h2>${title}</h2><a href="${href}" class="small fw-semibold text-decoration-none">${linkText} <i class="bi bi-arrow-right"></i></a></div>${body}</div>`;

  el.innerHTML = `
  <div class="welcome mb-4"><div class="kicker">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${greet}, ${esc(user.name.split(' ')[0])}</h1>
    <p>${esc(user.department || '')}${user.course ? ' · ' + esc(user.course) : ''}${user.year ? ' · Year ' + user.year : ''}${user.studentId ? ' · ID ' + esc(user.studentId) : ''}</p></div>
  <div class="row g-3 mb-4">
    ${stat('#/events?tab=mine', 'bi-calendar-check', 'ic-indigo', d.stats.registeredEvents, 'Events registered')}
    ${stat('#/clubs', 'bi-people', 'ic-violet', d.stats.clubs, 'Clubs joined')}
    ${stat('#/complaints', 'bi-chat-square-text', 'ic-amber', d.stats.openComplaints, 'Open complaints')}
    ${stat('#/resources?tab=mine', 'bi-cloud-upload', 'ic-green', d.stats.myUploads, 'Notes uploaded')}
  </div>
  <div class="row g-2 mb-4">
    ${qa('#/events', 'bi-calendar-event', 'Browse events')}${qa('#/resources', 'bi-journal-text', 'Find notes')}${qa('#/resources?upload=1', 'bi-cloud-arrow-up', 'Upload notes')}
    ${qa('#/complaints?new=1', 'bi-pencil-square', 'New complaint')}${qa('#/lostfound?new=1', 'bi-search-heart', 'Report item')}${qa('#/clubs', 'bi-people', 'Join a club')}
  </div>
  <div class="row g-4">
    <div class="col-lg-6">${card('Upcoming events', '#/events', d.events.length ? d.events.map((e) => { const dm = dayMonth(e.startAt); return `<a class="list-item" href="#/events/${e._id}"><div class="date-chip"><span class="d">${dm.d}</span><span class="m">${dm.m}</span></div><div class="flex-grow-1 min-w-0"><p class="item-title">${esc(e.title)}</p><div class="item-meta"><i class="bi bi-geo-alt"></i> ${esc(e.venue)} · ${fmtDateTime(e.startAt)}</div></div>${e.isRegistered ? badge('approved', 'Registered') : ''}</a>`; }).join('') : emptyState('bi-calendar-x', 'No upcoming events', 'New events will appear here.'))}</div>
    <div class="col-lg-6">${card('Latest announcements', '#/announcements', d.announcements.length ? d.announcements.map((a) => `<a class="list-item" href="#/announcements/${a._id}"><div class="flex-grow-1 min-w-0"><p class="item-title">${a.pinned ? '<i class="bi bi-pin-angle-fill pin"></i> ' : ''}${esc(a.title)}</p><div class="item-meta">${tag(a.category, 'b-gray')} ${a.important ? tag('Important', 'b-red') : ''} · ${timeAgo(a.publishAt)}</div></div></a>`).join('') : emptyState('bi-megaphone', 'No announcements', 'Nothing to show right now.'))}</div>
    <div class="col-lg-6">${card('Recent notes & resources', '#/resources', d.resources.length ? d.resources.map((r) => `<a class="list-item" href="#/resources/${r._id}"><i class="bi bi-file-earmark-text fs-3 text-primary"></i><div class="flex-grow-1 min-w-0"><p class="item-title">${esc(r.title)}</p><div class="item-meta">${esc(r.subject)} · Sem ${r.semester} · ${timeAgo(r.createdAt)}</div></div></a>`).join('') : emptyState('bi-journal-x', 'No resources yet', 'Be the first to upload notes.', '<a class="btn btn-primary btn-sm" href="#/resources?upload=1">Upload notes</a>'))}</div>
    <div class="col-lg-6">${card('My clubs', '#/clubs', d.memberships.length ? d.memberships.map((m) => `<a class="list-item" href="#/clubs"><i class="bi bi-people-fill fs-3 text-primary"></i><div class="flex-grow-1 min-w-0"><p class="item-title">${esc(m.club.name)}</p><div class="item-meta">${esc(m.club.category)}</div></div>${badge(m.status)}</a>`).join('') : emptyState('bi-people', 'You haven\'t joined any club', 'Explore clubs and send a membership request.', '<a class="btn btn-primary btn-sm" href="#/clubs">Explore clubs</a>'))}</div>
    <div class="col-lg-6">${card('Complaint updates', '#/complaints', d.complaints.length ? d.complaints.map((c) => `<a class="list-item" href="#/complaints/${c._id}"><div class="flex-grow-1 min-w-0"><p class="item-title">${esc(c.title)}</p><div class="item-meta">${esc(c.ticketId)} · updated ${timeAgo(c.updatedAt)}</div></div>${badge(c.status)}</a>`).join('') : emptyState('bi-check2-circle', 'No complaints', 'You have not raised any complaints.'))}</div>
    <div class="col-lg-6">${card('Recent lost & found', '#/lostfound', d.lostFound.length ? d.lostFound.map((i) => `<a class="list-item" href="#/lostfound/${i._id}"><i class="bi ${i.type === 'lost' ? 'bi-exclamation-circle text-danger' : 'bi-check-circle text-success'} fs-3"></i><div class="flex-grow-1 min-w-0"><p class="item-title">${esc(i.name)}</p><div class="item-meta"><i class="bi bi-geo-alt"></i> ${esc(i.location)} · ${fmtDate(i.date)}</div></div>${badge(i.type)}</a>`).join('') : emptyState('bi-search', 'No open listings', 'Everything has been found!'))}</div>
  </div>`;
}
