const User = require('../models/User');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Resource = require('../models/Resource');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const Complaint = require('../models/Complaint');
const LostFoundItem = require('../models/LostFoundItem');
const Announcement = require('../models/Announcement');
const ActivityLog = require('../models/ActivityLog');
const C = require('../config/constants');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404 } = require('../utils/helpers');
const { forbidden } = require('../utils/ApiError');
const logActivity = require('../utils/activity');

exports.stats = asyncHandler(async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [students, newStudents, upcomingEvents, registrations, pendingResources, activeClubs, pendingMemberships,
    openComplaints, recentLF, announcements, byStatus, byDept, recentActivity, recentLFItems, regsByEvent] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', createdAt: { $gte: weekAgo } }),
    Event.countDocuments({ status: 'published', startAt: { $gte: now } }),
    EventRegistration.countDocuments({ status: 'registered' }),
    Resource.countDocuments({ status: 'pending' }),
    Club.countDocuments({ active: true }),
    ClubMembership.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: { $ne: 'resolved' } }),
    LostFoundItem.countDocuments({ createdAt: { $gte: weekAgo } }),
    Announcement.countDocuments({ status: 'published' }),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: 'student' } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('actor', 'name'),
    LostFoundItem.find().sort({ createdAt: -1 }).limit(5).populate('reporter', 'name'),
    Event.find({ status: 'published' }).sort({ registeredCount: -1 }).limit(6).select('title registeredCount capacity'),
  ]);
  ok(res, {
    counts: { students, newStudents, upcomingEvents, registrations, pendingResources, activeClubs, pendingMemberships, openComplaints, recentLF, announcements },
    complaintsByStatus: C.COMPLAINT_STATUS.map((s) => ({ status: s, count: (byStatus.find((b) => b._id === s) || {}).count || 0 })),
    studentsByDepartment: byDept.map((d) => ({ department: d._id || 'Unspecified', count: d.count })),
    popularEvents: regsByEvent,
    recentActivity,
    recentLostFound: recentLFItems,
  });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const { q, role, active, department } = req.query;
  const filter = {};
  if (q) { const rx = searchRegex(q); filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }]; }
  if (['student', 'admin'].includes(role)) filter.role = role;
  if (active === 'true' || active === 'false') filter.active = active === 'true';
  if (C.DEPARTMENTS.includes(department)) filter.department = department;
  const { items, meta } = await paginate(User, filter, { query: req.query, sort: { createdAt: -1 } });
  ok(res, items, meta);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await findOr404(User, req.params.id, 'User');
  // Role is deliberately NOT editable here; admins are created only via the CLI script.
  const data = check(req.body, {
    name: { type: 'string', min: 2, max: 80 },
    department: { type: 'string', values: C.DEPARTMENTS },
    course: { type: 'string', values: C.COURSES },
    year: { type: 'int', min: 1, max: 5 },
    active: { type: 'bool' },
  }, { partial: true });
  if (data.active === false && String(user._id) === String(req.user._id)) throw forbidden('You cannot deactivate your own account');
  Object.assign(user, data);
  await user.save();
  await logActivity(req.user, data.active === false ? 'deactivated' : 'updated', 'user', user._id, `${data.active === false ? 'Deactivated' : 'Updated'} account of ${user.name}`);
  ok(res, user);
});

exports.activity = asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(ActivityLog, {}, { query: req.query, populate: { path: 'actor', select: 'name' }, limit: 20 });
  ok(res, items, meta);
});
