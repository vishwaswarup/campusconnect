import { get, post, del } from '../api.js';
import { esc, fmtDateTime, fmtDate, badge, tag, confirmDialog, toast, toastError, errorState } from '../ui.js';

export default async function ({ el, params }) {
  const id = params[0];
  async function draw() {
    let e;
    try { ({ data: e } = await get('/events/' + id)); } catch (err) { el.innerHTML = errorState(err); return; }
    const deadline = e.registrationDeadline || e.startAt;
    let action;
    if (e.isRegistered) action = e.canCancel ? `<button class="btn btn-outline-danger w-100" data-act="cancel"><i class="bi bi-x-circle"></i> Cancel registration</button>` : `<button class="btn btn-secondary w-100" disabled>Registered</button>`;
    else if (e.isPast) action = '<button class="btn btn-secondary w-100" disabled>Event has ended</button>';
    else if (e.isFull) action = '<button class="btn btn-secondary w-100" disabled>Event is full</button>';
    else if (!e.registrationOpen) action = '<button class="btn btn-secondary w-100" disabled>Registration closed</button>';
    else action = `<button class="btn btn-primary w-100 btn-lg" data-act="register"><i class="bi bi-check2-circle"></i> Register now</button>`;
    el.innerHTML = `<a href="#/events" class="text-decoration-none small"><i class="bi bi-arrow-left"></i> All events</a>
    <div class="row g-4 mt-1"><div class="col-lg-8"><div class="cc-card card-body-pad">
      <div class="mb-2">${tag(e.category)} ${e.isRegistered ? badge('approved', 'You are registered') : ''} ${e.status !== 'published' ? badge(e.status) : ''}</div>
      <h1 class="h2 fw-bold">${esc(e.title)}</h1>
      <p class="prewrap mt-3">${esc(e.description)}</p></div></div>
    <div class="col-lg-4"><div class="cc-card card-body-pad">
      <dl class="mb-3">
        <dt class="small text-secondary"><i class="bi bi-calendar-event"></i> When</dt><dd>${fmtDateTime(e.startAt)}${e.endAt ? ' → ' + fmtDateTime(e.endAt) : ''}</dd>
        <dt class="small text-secondary"><i class="bi bi-geo-alt"></i> Venue</dt><dd>${esc(e.venue)}</dd>
        <dt class="small text-secondary"><i class="bi bi-person"></i> Organizer</dt><dd>${esc(e.organizer)}</dd>
        <dt class="small text-secondary"><i class="bi bi-hourglass-split"></i> Register by</dt><dd>${fmtDateTime(deadline)}</dd>
        <dt class="small text-secondary"><i class="bi bi-people"></i> Seats</dt><dd>${e.capacity > 0 ? `${e.registeredCount} / ${e.capacity} taken` : `${e.registeredCount} registered · unlimited`}</dd>
      </dl>${action}</div></div></div>`;
  }
  el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    b.disabled = true;
    try {
      if (b.dataset.act === 'register') { await post(`/events/${id}/register`); toast('You are registered for this event'); }
      else {
        if (!(await confirmDialog({ title: 'Cancel registration?', message: 'Your seat will be released for others.', confirmText: 'Cancel registration', danger: true }))) { b.disabled = false; return; }
        await del(`/events/${id}/register`); toast('Registration cancelled', 'info');
      }
    } catch (err) { toastError(err); }
    draw();
  });
  await draw();
}
