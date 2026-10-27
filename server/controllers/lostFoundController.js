const path = require('path');
const LostFoundItem = require('../models/LostFoundItem');
const C = require('../config/constants');
const config = require('../config');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404 } = require('../utils/helpers');
const { bad, forbidden, notFound } = require('../utils/ApiError');
const { removeFile } = require('../utils/files');
const logActivity = require('../utils/activity');

const spec = {
  type: { type: 'string', required: true, values: C.LF_TYPES, label: 'Type' },
  name: { type: 'string', required: true, min: 2, max: 100, label: 'Item name' },
  description: { type: 'string', required: true, min: 10, max: 1500, label: 'Description' },
  category: { type: 'string', required: true, values: C.LF_CATEGORIES, label: 'Category' },
  location: { type: 'string', required: true, max: 140, label: 'Location' },
  date: { type: 'date', required: true, label: 'Date' },
  contactInfo: { type: 'string', max: 120, label: 'Contact info' },
  showContact: { type: 'bool' },
};
const isAdmin = (u) => u.role === 'admin';
const isOwner = (u, item) => String(item.reporter._id || item.reporter) === String(u._id);

// Strip private fields unless viewer is owner/admin (or the reporter opted in to sharing contact details).
function present(item, user) {
  const o = item.toObject();
  const priv = isOwner(user, item) || isAdmin(user);
  o.isOwner = isOwner(user, item);
  if (!priv) {
    if (!(item.showContact && item.contactInfo)) delete o.contactInfo;
    delete o.flagReason; delete o.flaggedBy; delete o.flagged;
  }
  o.hasImage = !!o.image;
  delete o.image;
  return o;
}
const populate = { path: 'reporter', select: 'name department' };

exports.list = asyncHandler(async (req, res) => {
  const { q, type, category, status, flagged } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: searchRegex(q) }, { description: searchRegex(q) }, { location: searchRegex(q) }];
  if (C.LF_TYPES.includes(type)) filter.type = type;
  if (C.LF_CATEGORIES.includes(category)) filter.category = category;
  if (C.LF_STATUS.includes(status)) filter.status = status;
  if (isAdmin(req.user) && flagged === 'true') filter.flagged = true;
  const { items, meta } = await paginate(LostFoundItem, filter, { query: req.query, populate, limit: 9 });
  ok(res, items.map((i) => present(i, req.user)), meta);
});

exports.mine = asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(LostFoundItem, { reporter: req.user._id }, { query: req.query, populate });
  ok(res, items.map((i) => present(i, req.user)), meta);
});

exports.get = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  await item.populate(populate);
  ok(res, present(item, req.user));
});

exports.image = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  if (!item.image) throw notFound('No image');
  res.set({ 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' });
  res.sendFile(path.join(config.uploadDir, path.basename(item.image)));
});

exports.create = asyncHandler(async (req, res) => {
  const data = check(req.body, spec);
  if (data.date > new Date(Date.now() + 864e5)) throw bad('Date cannot be in the future', { date: 'Date cannot be in the future' });
  const item = await LostFoundItem.create({ ...data, reporter: req.user._id, image: req.file && req.file.filename });
  await item.populate(populate);
  ok(res, present(item, req.user), null, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  if (!isOwner(req.user, item) && !isAdmin(req.user)) throw forbidden('You can only edit your own reports');
  Object.assign(item, check(req.body, spec, { partial: true }));
  if (req.file) { removeFile(item.image, config.uploadDir); item.image = req.file.filename; }
  await item.save();
  await item.populate(populate);
  ok(res, present(item, req.user));
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  const { status } = check(req.body, { status: { type: 'string', required: true, values: C.LF_STATUS, label: 'Status' } });
  if (!isOwner(req.user, item) && !isAdmin(req.user)) throw forbidden('Only the reporter or an admin can change the status');
  item.status = status;
  await item.save();
  if (isAdmin(req.user)) await logActivity(req.user, 'status', 'lostfound', item._id, `Marked "${item.name}" as ${status}`);
  await item.populate(populate);
  ok(res, present(item, req.user));
});

// Any student can flag a suspicious/duplicate post; admins review flagged posts.
exports.flag = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  const { reason } = check(req.body, { reason: { type: 'string', required: true, min: 3, max: 300, label: 'Reason' } });
  item.flagged = true; item.flagReason = reason; item.flaggedBy = req.user._id;
  await item.save();
  ok(res, { flagged: true });
});

exports.clearFlag = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  item.flagged = false; item.flagReason = undefined; item.flaggedBy = undefined;
  await item.save();
  await logActivity(req.user, 'cleared-flag', 'lostfound', item._id, `Cleared flag on "${item.name}"`);
  ok(res, { flagged: false });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await findOr404(LostFoundItem, req.params.id, 'Listing');
  if (!isOwner(req.user, item) && !isAdmin(req.user)) throw forbidden('You can only delete your own reports');
  removeFile(item.image, config.uploadDir);
  await item.deleteOne();
  if (isAdmin(req.user)) await logActivity(req.user, 'deleted', 'lostfound', item._id, `Removed listing "${item.name}"`);
  ok(res, { deleted: true });
});
