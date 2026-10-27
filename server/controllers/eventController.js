const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const C = require('../config/constants');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404, validObjectId } = require('../utils/helpers');
const { bad, notFound, conflict, ApiError } = require('../utils/ApiError');
const logActivity = require('../utils/activity');

const spec = {
  title: { type: 'string', required: true, min: 3, max: 140, label: 'Title' },
  description: { type: 'string', required: true, min: 10, max: 4000, label: 'Description' },
  category: { type: 'string', required: true, values: C.EVENT_CATEGORIES, label: 'Category' },
  venue: { type: 'string', required: true, max: 140, label: 'Venue' },
  organizer: { type: 'string', required: true, max: 120, label: 'Organizer' },
  startAt: { type: 'date', required: true, label: 'Start date & time' },
  endAt: { type: 'date', label: 'End date & time' },
  registrationDeadline: { type: 'date', label: 'Registration deadline' },
  capacity: { type: 'int', min: 0, max: 100000, label: 'Capacity' },
  status: { type: 'string', values: C.EVENT_STATUS, label: 'Status' },
};

const isAdmin = (u) => u.role === 'admin';

// Attach "isRegistered" / "isFull" / "registrationOpen" helpers for the UI.
async function decorate(events, user) {
  const regs = await EventRegistration.find({ user: user._id, status: 'registered', event: { $in: events.map((e) => e._id) } }).select('event');
  const mine = new Set(regs.map((r) => String(r.event)));
  const now = new Date();
  return events.map((e) => {
    const o = e.toObject();
    const deadline = e.registrationDeadline || e.startAt;
    o.isRegistered = mine.has(String(e._id));
    o.isFull = e.capacity > 0 && e.registeredCount >= e.capacity;
    o.isPast = (e.endAt || e.startAt) < now;
    o.registrationOpen = e.status === 'published' && now < deadline && !o.isFull;
    o.canCancel = o.isRegistered && now < e.startAt;
    return o;
  });
}

exports.list = asyncHandler(async (req, res) => {
  const { q, category, when = 'upcoming', status } = req.query;
  const filter = {};
  const now = new Date();
  if (!isAdmin(req.user)) filter.status = 'published';
  else if (C.EVENT_STATUS.includes(status)) filter.status = status;
  if (q) filter.$or = [{ title: searchRegex(q) }, { organizer: searchRegex(q) }, { venue: searchRegex(q) }];
  if (C.EVENT_CATEGORIES.includes(category)) filter.category = category;
  let sort = { startAt: 1 };
  if (when === 'upcoming') filter.startAt = { $gte: now };
  else if (when === 'past') { filter.startAt = { $lt: now }; sort = { startAt: -1 }; }
  else sort = { startAt: -1 };
  const { items, meta } = await paginate(Event, filter, { query: req.query, sort, limit: 9 });
  ok(res, await decorate(items, req.user), meta);
});

exports.get = asyncHandler(async (req, res) => {
  const event = await findOr404(Event, req.params.id, 'Event');
  if (event.status !== 'published' && !isAdmin(req.user)) throw notFound('Event not found');
  ok(res, (await decorate([event], req.user))[0]);
});

exports.mine = asyncHandler(async (req, res) => {
  const regs = await EventRegistration.find({ user: req.user._id, status: 'registered' }).populate('event').sort({ createdAt: -1 });
  const events = regs.filter((r) => r.event).map((r) => r.event);
  const decorated = await decorate(events, req.user);
  ok(res, decorated);
});

exports.create = asyncHandler(async (req, res) => {
  const data = check(req.body, spec);
  const event = await Event.create({ ...data, createdBy: req.user._id });
  await logActivity(req.user, 'created', 'event', event._id, `Created event "${event.title}"`);
  ok(res, event, null, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const event = await findOr404(Event, req.params.id, 'Event');
  const data = check(req.body, spec, { partial: true });
  if (data.capacity > 0 && data.capacity < event.registeredCount) {
    throw bad('Capacity is below current registrations', { capacity: `Already ${event.registeredCount} registered` });
  }
  Object.assign(event, data);
  await event.save();
  await logActivity(req.user, 'updated', 'event', event._id, `Updated event "${event.title}"`);
  ok(res, event);
});

exports.remove = asyncHandler(async (req, res) => {
  const event = await findOr404(Event, req.params.id, 'Event');
  await EventRegistration.deleteMany({ event: event._id });
  await event.deleteOne();
  await logActivity(req.user, 'deleted', 'event', event._id, `Deleted event "${event.title}"`);
  ok(res, { deleted: true });
});

exports.register = asyncHandler(async (req, res) => {
  const event = await findOr404(Event, req.params.id, 'Event');
  const now = new Date();
  if (event.status !== 'published') throw notFound('Event not found');
  if (now >= (event.registrationDeadline || event.startAt)) throw new ApiError(400, 'Registration for this event is closed');

  const existing = await EventRegistration.findOne({ event: event._id, user: req.user._id });
  if (existing && existing.status === 'registered') throw conflict('You are already registered for this event');

  // Atomic capacity guard: the increment only succeeds while seats remain (safe under concurrent requests).
  const seatFilter = { _id: event._id, status: 'published' };
  if (event.capacity > 0) seatFilter.registeredCount = { $lt: event.capacity };
  const seat = await Event.findOneAndUpdate(seatFilter, { $inc: { registeredCount: 1 } }, { returnDocument: 'after' });
  if (!seat) throw conflict('This event is full');

  try {
    if (existing) {
      existing.status = 'registered'; existing.registeredAt = now; existing.cancelledAt = undefined;
      await existing.save();
    } else {
      await EventRegistration.create({ event: event._id, user: req.user._id });
    }
  } catch (e) {
    await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: -1 } }); // roll back the seat
    if (e.code === 11000) throw conflict('You are already registered for this event');
    throw e;
  }
  ok(res, (await decorate([seat], req.user))[0], null, 201);
});

exports.cancel = asyncHandler(async (req, res) => {
  const event = await findOr404(Event, req.params.id, 'Event');
  if (new Date() >= event.startAt) throw new ApiError(400, 'You cannot cancel after the event has started');
  const reg = await EventRegistration.findOneAndUpdate(
    { event: event._id, user: req.user._id, status: 'registered' },
    { status: 'cancelled', cancelledAt: new Date() },
  );
  if (!reg) throw notFound('You are not registered for this event');
  const updated = await Event.findOneAndUpdate({ _id: event._id }, { $inc: { registeredCount: -1 } }, { returnDocument: 'after' });
  ok(res, (await decorate([updated], req.user))[0]);
});

exports.participants = asyncHandler(async (req, res) => {
  if (!validObjectId(req.params.id)) throw notFound('Event not found');
  const regs = await EventRegistration.find({ event: req.params.id, status: 'registered' })
    .populate('user', 'name email studentId department course year').sort({ registeredAt: 1 });
  const rows = regs.filter((r) => r.user).map((r) => ({ _id: r._id, registeredAt: r.registeredAt, user: r.user }));
  if (req.query.format === 'csv') {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`; // neutralise CSV formula injection
    const csv = ['Name,Email,Student ID,Department,Year,Registered At', ...rows.map((r) => [r.user.name, r.user.email, r.user.studentId, r.user.department, r.user.year, r.registeredAt.toISOString()].map(esc).join(','))].join('\n');
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="participants.csv"' });
    return res.send(csv);
  }
  ok(res, rows);
});
