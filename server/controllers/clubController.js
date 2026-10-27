const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const C = require('../config/constants');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404 } = require('../utils/helpers');
const { bad, conflict, notFound } = require('../utils/ApiError');
const logActivity = require('../utils/activity');

const spec = {
  name: { type: 'string', required: true, min: 3, max: 80, label: 'Club name' },
  description: { type: 'string', required: true, min: 10, max: 2000, label: 'Description' },
  category: { type: 'string', required: true, values: C.CLUB_CATEGORIES, label: 'Category' },
  activities: { type: 'array', max: 10, label: 'Activities' },
  coordinator: { type: 'string', required: true, max: 100, label: 'Faculty coordinator' },
  coordinatorEmail: { type: 'email', label: 'Coordinator email' },
  meetingSchedule: { type: 'string', max: 120, label: 'Meeting schedule' },
  capacity: { type: 'int', min: 0, max: 10000, label: 'Capacity' },
  active: { type: 'bool' },
};
const isAdmin = (u) => u.role === 'admin';

async function decorate(clubs, user) {
  const ids = clubs.map((c) => c._id);
  const [mine, counts] = await Promise.all([
    ClubMembership.find({ user: user._id, club: { $in: ids } }),
    ClubMembership.aggregate([{ $match: { club: { $in: ids }, status: 'approved' } }, { $group: { _id: '$club', n: { $sum: 1 } } }]),
  ]);
  const mm = new Map(mine.map((m) => [String(m.club), m.status]));
  const cc = new Map(counts.map((x) => [String(x._id), x.n]));
  return clubs.map((c) => {
    const o = c.toObject();
    o.membershipStatus = mm.get(String(c._id)) || null;
    o.memberCount = cc.get(String(c._id)) || 0;
    o.isFull = c.capacity > 0 && o.memberCount >= c.capacity;
    return o;
  });
}

exports.list = asyncHandler(async (req, res) => {
  const { q, category, active } = req.query;
  const filter = {};
  if (!isAdmin(req.user)) filter.active = true;
  else if (active === 'true' || active === 'false') filter.active = active === 'true';
  if (q) filter.$or = [{ name: searchRegex(q) }, { description: searchRegex(q) }];
  if (C.CLUB_CATEGORIES.includes(category)) filter.category = category;
  const { items, meta } = await paginate(Club, filter, { query: req.query, sort: { name: 1 }, limit: 9 });
  ok(res, await decorate(items, req.user), meta);
});

exports.get = asyncHandler(async (req, res) => {
  const club = await findOr404(Club, req.params.id, 'Club');
  if (!club.active && !isAdmin(req.user)) throw notFound('Club not found');
  ok(res, (await decorate([club], req.user))[0]);
});

exports.create = asyncHandler(async (req, res) => {
  const club = await Club.create(check(req.body, spec));
  await logActivity(req.user, 'created', 'club', club._id, `Created club "${club.name}"`);
  ok(res, club, null, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const club = await findOr404(Club, req.params.id, 'Club');
  Object.assign(club, check(req.body, spec, { partial: true }));
  await club.save();
  await logActivity(req.user, 'updated', 'club', club._id, `Updated club "${club.name}"`);
  ok(res, club);
});

exports.remove = asyncHandler(async (req, res) => {
  const club = await findOr404(Club, req.params.id, 'Club');
  await ClubMembership.deleteMany({ club: club._id });
  await club.deleteOne();
  await logActivity(req.user, 'deleted', 'club', club._id, `Deleted club "${club.name}"`);
  ok(res, { deleted: true });
});

exports.join = asyncHandler(async (req, res) => {
  const club = await findOr404(Club, req.params.id, 'Club');
  if (!club.active) throw bad('This club is not accepting members');
  const { message } = check(req.body, { message: { type: 'string', max: 500 } });
  const existing = await ClubMembership.findOne({ club: club._id, user: req.user._id });
  if (existing && ['pending', 'approved'].includes(existing.status)) {
    throw conflict(existing.status === 'approved' ? 'You are already a member of this club' : 'You already have a pending request for this club');
  }
  if (club.capacity > 0 && (await ClubMembership.countDocuments({ club: club._id, status: 'approved' })) >= club.capacity) throw conflict('This club is full');
  let m;
  try {
    if (existing) { // re-apply after rejection or withdrawal
      existing.status = 'pending'; existing.message = message; existing.decidedAt = undefined; existing.decidedBy = undefined;
      m = await existing.save();
    } else m = await ClubMembership.create({ club: club._id, user: req.user._id, message });
  } catch (e) {
    if (e.code === 11000) throw conflict('You already have a request for this club');
    throw e;
  }
  ok(res, m, null, 201);
});

exports.withdraw = asyncHandler(async (req, res) => {
  const m = await ClubMembership.findOne({ club: req.params.id, user: req.user._id, status: { $in: ['pending', 'approved'] } });
  if (!m) throw notFound('You have no active membership or request for this club');
  m.status = 'withdrawn';
  await m.save();
  ok(res, m);
});

exports.myMemberships = asyncHandler(async (req, res) => {
  const items = await ClubMembership.find({ user: req.user._id, status: { $ne: 'withdrawn' } }).populate('club', 'name category coordinator meetingSchedule').sort({ updatedAt: -1 });
  ok(res, items.filter((m) => m.club));
});

exports.listMemberships = asyncHandler(async (req, res) => {
  const { status, club } = req.query;
  const filter = {};
  if (C.MEMBERSHIP_STATUS.includes(status)) filter.status = status;
  if (club && require('../utils/helpers').validObjectId(club)) filter.club = club;
  const { items, meta } = await paginate(ClubMembership, filter, {
    query: req.query, sort: { createdAt: -1 },
    populate: [{ path: 'user', select: 'name email studentId department year' }, { path: 'club', select: 'name' }],
  });
  ok(res, items.filter((m) => m.user && m.club), meta);
});

exports.decide = asyncHandler(async (req, res) => {
  const m = await findOr404(ClubMembership, req.params.id, 'Membership request');
  const { status } = check(req.body, { status: { type: 'string', required: true, values: ['approved', 'rejected'], label: 'Decision' } });
  if (m.status !== 'pending' && !(m.status === 'approved' && status === 'rejected')) throw bad(`This request is already ${m.status}`);
  if (status === 'approved') {
    const club = await Club.findById(m.club);
    if (club && club.capacity > 0 && (await ClubMembership.countDocuments({ club: club._id, status: 'approved' })) >= club.capacity) throw conflict('Club is at capacity');
  }
  m.status = status; m.decidedBy = req.user._id; m.decidedAt = new Date();
  await m.save();
  await m.populate([{ path: 'user', select: 'name' }, { path: 'club', select: 'name' }]);
  await logActivity(req.user, status, 'membership', m._id, `${status === 'approved' ? 'Approved' : 'Rejected'} ${m.user.name} for ${m.club.name}`);
  ok(res, m);
});
