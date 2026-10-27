const Announcement = require('../models/Announcement');
const C = require('../config/constants');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404, validObjectId } = require('../utils/helpers');
const { notFound } = require('../utils/ApiError');
const logActivity = require('../utils/activity');

const spec = {
  title: { type: 'string', required: true, min: 3, max: 160, label: 'Title' },
  body: { type: 'string', required: true, min: 5, max: 6000, label: 'Content' },
  category: { type: 'string', values: C.ANNOUNCEMENT_CATEGORIES, label: 'Category' },
  departments: { type: 'array', values: C.DEPARTMENTS, label: 'Departments' },
  pinned: { type: 'bool' },
  important: { type: 'bool' },
  status: { type: 'string', values: ['draft', 'published'], label: 'Status' },
  publishAt: { type: 'date', label: 'Publish date' },
  expiresAt: { type: 'date', label: 'Expiry date' },
};
const isAdmin = (u) => u.role === 'admin';

exports.list = asyncHandler(async (req, res) => {
  const { q, category, department, status } = req.query;
  let filter;
  if (isAdmin(req.user)) {
    filter = {};
    if (['draft', 'published'].includes(status)) filter.status = status;
  } else {
    filter = Announcement.visibleTo(req.user); // visibility enforced server-side
  }
  const and = filter.$and ? [...filter.$and] : [];
  if (q) and.push({ $or: [{ title: searchRegex(q) }, { body: searchRegex(q) }] });
  if (department && C.DEPARTMENTS.includes(department)) and.push({ $or: [{ departments: { $size: 0 } }, { departments: department }] });
  if (and.length) filter.$and = and;
  if (C.ANNOUNCEMENT_CATEGORIES.includes(category)) filter.category = category;
  const { items, meta } = await paginate(Announcement, filter, { query: req.query, sort: { pinned: -1, publishAt: -1 }, populate: { path: 'author', select: 'name' } });
  ok(res, items, meta);
});

exports.get = asyncHandler(async (req, res) => {
  if (!validObjectId(req.params.id)) throw notFound('Announcement not found');
  const filter = isAdmin(req.user) ? { _id: req.params.id } : Announcement.visibleTo(req.user, { _id: req.params.id });
  const a = await Announcement.findOne(filter).populate('author', 'name');
  if (!a) throw notFound('Announcement not found');
  ok(res, a);
});

exports.create = asyncHandler(async (req, res) => {
  const data = check(req.body, spec);
  const a = await Announcement.create({ ...data, author: req.user._id });
  await logActivity(req.user, 'created', 'announcement', a._id, `Posted announcement "${a.title}"`);
  ok(res, a, null, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const a = await findOr404(Announcement, req.params.id, 'Announcement');
  const data = check(req.body, spec, { partial: true });
  if ('expiresAt' in req.body && !req.body.expiresAt) a.expiresAt = undefined;
  if (req.body.departments !== undefined && !data.departments) data.departments = [];
  Object.assign(a, data);
  await a.save();
  await logActivity(req.user, 'updated', 'announcement', a._id, `Updated announcement "${a.title}"`);
  ok(res, a);
});

exports.pin = asyncHandler(async (req, res) => {
  const a = await findOr404(Announcement, req.params.id, 'Announcement');
  a.pinned = !a.pinned;
  await a.save();
  await logActivity(req.user, a.pinned ? 'pinned' : 'unpinned', 'announcement', a._id, `${a.pinned ? 'Pinned' : 'Unpinned'} "${a.title}"`);
  ok(res, a);
});

exports.remove = asyncHandler(async (req, res) => {
  const a = await findOr404(Announcement, req.params.id, 'Announcement');
  await a.deleteOne();
  await logActivity(req.user, 'deleted', 'announcement', a._id, `Deleted announcement "${a.title}"`);
  ok(res, { deleted: true });
});
