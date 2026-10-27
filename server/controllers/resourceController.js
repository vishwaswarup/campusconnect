const path = require('path');
const Resource = require('../models/Resource');
const C = require('../config/constants');
const config = require('../config');
const { check } = require('../utils/validate');
const { ok, asyncHandler, paginate, searchRegex, findOr404 } = require('../utils/helpers');
const { bad, forbidden, notFound } = require('../utils/ApiError');
const { removeFile } = require('../utils/files');
const logActivity = require('../utils/activity');

const spec = {
  title: { type: 'string', required: true, min: 3, max: 140, label: 'Title' },
  description: { type: 'string', max: 1500, label: 'Description' },
  subject: { type: 'string', required: true, max: 100, label: 'Subject' },
  department: { type: 'string', required: true, values: C.DEPARTMENTS, label: 'Department' },
  semester: { type: 'int', required: true, min: 1, max: 10, label: 'Semester' },
  category: { type: 'string', required: true, values: C.RESOURCE_CATEGORIES, label: 'Category' },
};
const isAdmin = (u) => u.role === 'admin';
const populate = [{ path: 'uploadedBy', select: 'name department' }];

// A student may see approved resources, plus their own uploads in any state. Admins see everything.
function canView(user, r) {
  return isAdmin(user) || r.status === 'approved' || String(r.uploadedBy._id || r.uploadedBy) === String(user._id);
}

exports.list = asyncHandler(async (req, res) => {
  const { q, department, semester, subject, category, status } = req.query;
  const filter = {};
  if (isAdmin(req.user)) { if (C.RESOURCE_STATUS.includes(status)) filter.status = status; }
  else filter.status = 'approved';
  if (q) filter.$or = [{ title: searchRegex(q) }, { subject: searchRegex(q) }];
  if (C.DEPARTMENTS.includes(department)) filter.department = department;
  if (C.RESOURCE_CATEGORIES.includes(category)) filter.category = category;
  if (semester && Number.isInteger(+semester)) filter.semester = +semester;
  if (subject) filter.subject = searchRegex(subject);
  const { items, meta } = await paginate(Resource, filter, { query: req.query, populate, limit: 9 });
  ok(res, items, meta);
});

exports.mine = asyncHandler(async (req, res) => {
  const { items, meta } = await paginate(Resource, { uploadedBy: req.user._id }, { query: req.query, populate });
  ok(res, items, meta);
});

exports.get = asyncHandler(async (req, res) => {
  const r = await findOr404(Resource, req.params.id, 'Resource');
  await r.populate(populate);
  if (!canView(req.user, r)) throw notFound('Resource not found');
  ok(res, r);
});

exports.download = asyncHandler(async (req, res) => {
  const r = await findOr404(Resource, req.params.id, 'Resource');
  if (!canView(req.user, r)) throw notFound('Resource not found');
  Resource.updateOne({ _id: r._id }, { $inc: { downloads: 1 } }).catch(() => {});
  res.set('X-Content-Type-Options', 'nosniff');
  res.download(path.join(config.uploadDir, path.basename(r.file.filename)), `${r.title.replace(/[^\w\- ]+/g, '')}.${r.file.ext}`);
});

exports.create = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user) && !config.studentUploads) throw forbidden('Student uploads are currently disabled');
  if (!req.file) throw bad('Please attach a file', { file: 'File is required' });
  const data = check(req.body, spec);
  const admin = isAdmin(req.user);
  const r = await Resource.create({
    ...data,
    file: { filename: req.file.filename, originalName: req.file.originalname.slice(0, 120), size: req.file.size, ext: path.extname(req.file.filename).slice(1) },
    uploadedBy: req.user._id,
    status: admin ? 'approved' : 'pending', // student uploads always need approval
    reviewedBy: admin ? req.user._id : undefined,
  });
  await logActivity(req.user, 'uploaded', 'resource', r._id, `${admin ? 'Published' : 'Uploaded (pending)'} "${r.title}"`);
  ok(res, r, null, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const r = await findOr404(Resource, req.params.id, 'Resource');
  const owner = String(r.uploadedBy) === String(req.user._id);
  if (!isAdmin(req.user) && !(owner && r.status === 'pending')) throw forbidden('You cannot edit this resource');
  Object.assign(r, check(req.body, spec, { partial: true }));
  await r.save();
  await logActivity(req.user, 'updated', 'resource', r._id, `Edited resource "${r.title}"`);
  ok(res, r);
});

exports.review = asyncHandler(async (req, res) => {
  const r = await findOr404(Resource, req.params.id, 'Resource');
  const { status, reviewNote } = check(req.body, {
    status: { type: 'string', required: true, values: ['approved', 'rejected', 'pending'], label: 'Status' },
    reviewNote: { type: 'string', max: 300 },
  });
  if (status === 'rejected' && !reviewNote) throw bad('Please give a reason for rejection', { reviewNote: 'Reason is required' });
  r.status = status; r.reviewNote = reviewNote; r.reviewedBy = req.user._id;
  await r.save();
  await logActivity(req.user, status, 'resource', r._id, `${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Reset'} resource "${r.title}"`);
  ok(res, r);
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await findOr404(Resource, req.params.id, 'Resource');
  const owner = String(r.uploadedBy) === String(req.user._id);
  if (!isAdmin(req.user) && !(owner && r.status !== 'approved')) throw forbidden('You cannot delete this resource');
  removeFile(r.file.filename, config.uploadDir);
  await r.deleteOne();
  await logActivity(req.user, 'deleted', 'resource', r._id, `Deleted resource "${r.title}"`);
  ok(res, { deleted: true });
});
