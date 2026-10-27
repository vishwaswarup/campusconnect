const path = require('path');
const Complaint = require('../models/Complaint');
const ComplaintUpdate = require('../models/ComplaintUpdate');
const C = require('../config/constants');
const config = require('../config');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404 } = require('../utils/helpers');
const { bad, notFound, forbidden, ApiError } = require('../utils/ApiError');
const logActivity = require('../utils/activity');

const isAdmin = (u) => u.role === 'admin';
const REOPEN_WINDOW_MS = 30 * 864e5;

// Students only ever get their OWN complaint; a missing or foreign complaint is a 404 (no existence leak).
async function loadAccessible(req) {
  const c = await findOr404(Complaint, req.params.id, 'Complaint');
  if (!isAdmin(req.user) && String(c.student) !== String(req.user._id)) throw notFound('Complaint not found');
  return c;
}

function present(c, user) {
  const o = c.toObject();
  o.hasAttachment = !!(o.attachment && o.attachment.filename);
  if (o.attachment) o.attachment = { originalName: o.attachment.originalName, size: o.attachment.size };
  if (!isAdmin(user)) { delete o.assignedTo; }
  o.canReopen = c.status === 'resolved' && c.resolvedAt && Date.now() - c.resolvedAt < REOPEN_WINDOW_MS;
  return o;
}

exports.list = asyncHandler(async (req, res) => {
  const { q, status, category, priority } = req.query;
  const filter = isAdmin(req.user) ? {} : { student: req.user._id };
  if (C.COMPLAINT_STATUS.includes(status)) filter.status = status;
  else if (status === 'open') filter.status = { $ne: 'resolved' };
  if (C.COMPLAINT_CATEGORIES.includes(category)) filter.category = category;
  if (isAdmin(req.user) && C.COMPLAINT_PRIORITY.includes(priority)) filter.priority = priority;
  if (q) filter.$or = [{ title: searchRegex(q) }, { ticketId: searchRegex(q) }];
  const sort = req.query.sort === 'priority' && isAdmin(req.user) ? { priority: -1, createdAt: -1 } : { createdAt: -1 };
  const { items, meta } = await paginate(Complaint, filter, { query: req.query, sort, populate: isAdmin(req.user) ? { path: 'student', select: 'name email studentId department' } : undefined });
  ok(res, items.map((c) => present(c, req.user)), meta);
});

exports.create = asyncHandler(async (req, res) => {
  const data = check(req.body, {
    title: { type: 'string', required: true, min: 5, max: 140, label: 'Title' },
    category: { type: 'string', required: true, values: C.COMPLAINT_CATEGORIES, label: 'Category' },
    description: { type: 'string', required: true, min: 20, max: 4000, label: 'Description' },
  });
  const c = await Complaint.create({
    ...data,
    student: req.user._id,
    attachment: req.file ? { filename: req.file.filename, originalName: req.file.originalname.slice(0, 120), size: req.file.size } : undefined,
  });
  await ComplaintUpdate.create({ complaint: c._id, author: req.user._id, authorRole: 'student', type: 'created', message: 'Complaint submitted', toStatus: 'submitted' });
  ok(res, present(c, req.user), null, 201);
});

exports.get = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (isAdmin(req.user)) await c.populate('student', 'name email studentId department course year');
  const histFilter = { complaint: c._id };
  if (!isAdmin(req.user)) histFilter.internal = { $ne: true }; // internal notes NEVER reach students
  const history = await ComplaintUpdate.find(histFilter).sort({ createdAt: 1 }).populate('author', 'name');
  ok(res, { complaint: present(c, req.user), history });
});

exports.attachment = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (!c.attachment || !c.attachment.filename) throw notFound('No attachment');
  res.set('X-Content-Type-Options', 'nosniff');
  res.download(path.join(config.uploadDir, path.basename(c.attachment.filename)), c.attachment.originalName || 'attachment');
});

// Messages: students send follow-ups; admins send responses or internal notes.
exports.addMessage = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  const admin = isAdmin(req.user);
  const { message, internal } = check(req.body, {
    message: { type: 'string', required: true, min: 2, max: 3000, label: 'Message' },
    internal: { type: 'bool' },
  });
  if (!admin) {
    if (c.status === 'resolved') throw new ApiError(400, 'This complaint is resolved. Reopen it to send a follow-up.');
    if (internal) throw forbidden('Not allowed');
  }
  const u = await ComplaintUpdate.create({
    complaint: c._id, author: req.user._id, authorRole: admin ? 'admin' : 'student',
    type: admin ? (internal ? 'internal_note' : 'response') : 'follow_up',
    message, internal: admin && !!internal,
  });
  c.updatedAt = new Date();
  await c.save({ timestamps: true });
  ok(res, u, null, 201);
});

// Admin: status / priority / category / assignment
exports.update = asyncHandler(async (req, res) => {
  const c = await findOr404(Complaint, req.params.id, 'Complaint');
  const data = check(req.body, {
    status: { type: 'string', values: C.COMPLAINT_STATUS, label: 'Status' },
    priority: { type: 'string', values: C.COMPLAINT_PRIORITY, label: 'Priority' },
    category: { type: 'string', values: C.COMPLAINT_CATEGORIES, label: 'Category' },
    assignedTo: { type: 'string', max: 100, label: 'Assigned to' },
    message: { type: 'string', max: 3000 },
  }, { partial: true });

  const changes = [];
  if (data.status && data.status !== c.status) {
    const from = c.status;
    c.status = data.status;
    c.resolvedAt = data.status === 'resolved' ? new Date() : undefined;
    await ComplaintUpdate.create({ complaint: c._id, author: req.user._id, authorRole: 'admin', type: 'status_change', fromStatus: from, toStatus: data.status, message: data.message });
    changes.push(`status ${from} → ${data.status}`);
  } else if (data.message) {
    await ComplaintUpdate.create({ complaint: c._id, author: req.user._id, authorRole: 'admin', type: 'response', message: data.message });
  }
  for (const f of ['priority', 'category', 'assignedTo']) {
    if (data[f] !== undefined && data[f] !== c[f]) {
      await ComplaintUpdate.create({ complaint: c._id, author: req.user._id, authorRole: 'admin', type: 'update', internal: f === 'assignedTo', message: `${f} changed from "${c[f] || '-'}" to "${data[f] || '-'}"` });
      c[f] = data[f] || undefined;
      changes.push(f);
    }
  }
  await c.save();
  if (changes.length) await logActivity(req.user, 'updated', 'complaint', c._id, `Complaint ${c.ticketId}: ${changes.join(', ')}`);
  ok(res, present(c, req.user));
});

exports.reopen = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (isAdmin(req.user)) throw forbidden('Only the student can reopen their complaint');
  if (c.status !== 'resolved') throw bad('Only resolved complaints can be reopened');
  if (Date.now() - c.resolvedAt > REOPEN_WINDOW_MS) throw bad('The reopen window (30 days) has passed. Please submit a new complaint.');
  const { message } = check(req.body, { message: { type: 'string', required: true, min: 5, max: 3000, label: 'Reason for reopening' } });
  c.status = 'under_review'; c.resolvedAt = undefined;
  await c.save();
  await ComplaintUpdate.create({ complaint: c._id, author: req.user._id, authorRole: 'student', type: 'reopened', fromStatus: 'resolved', toStatus: 'under_review', message });
  ok(res, present(c, req.user));
});
