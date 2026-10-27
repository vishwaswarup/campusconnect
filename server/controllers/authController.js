const path = require('path');
const User = require('../models/User');
const C = require('../config/constants');
const config = require('../config');
const { check } = require('../utils/validate');
const { ok, asyncHandler, findOr404 } = require('../utils/helpers');
const { bad, unauthorized, forbidden, notFound } = require('../utils/ApiError');
const { removeFile } = require('../utils/files');

const PASSWORD = { type: 'string', required: true, min: 8, max: 72, label: 'Password' };
const strongPassword = (p) => /[A-Za-z]/.test(p) && /\d/.test(p);

const profileSpec = {
  name: { type: 'string', required: true, min: 2, max: 80, label: 'Full name' },
  department: { type: 'string', required: true, values: C.DEPARTMENTS, label: 'Department' },
  course: { type: 'string', required: true, values: C.COURSES, label: 'Course' },
  year: { type: 'int', required: true, min: 1, max: 5, label: 'Academic year' },
  phone: { type: 'string', max: 20, pattern: /^[0-9+\-\s()]*$/, message: 'Phone may only contain digits, spaces, + - ( )', label: 'Phone' },
  bio: { type: 'string', max: 300, label: 'Bio' },
};

function startSession(req, user) {
  return new Promise((resolve, reject) => {
    // regenerate to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = String(user._id);
      resolve();
    });
  });
}

exports.register = asyncHandler(async (req, res) => {
  const data = check(req.body, {
    ...profileSpec,
    email: { type: 'email', required: true, max: 120, label: 'College email' },
    studentId: { type: 'string', required: true, min: 3, max: 30, pattern: /^[A-Za-z0-9\-/]+$/, message: 'Student ID may only contain letters, digits, - and /', label: 'Student ID' },
    password: PASSWORD,
    confirmPassword: { type: 'string', required: true, label: 'Password confirmation' },
  });
  const errors = {};
  if (!strongPassword(data.password)) errors.password = 'Password must contain at least one letter and one number';
  if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  if (Object.keys(errors).length) throw bad('Please fix the highlighted fields', errors);

  const dupe = await User.findOne({ $or: [{ email: data.email }, { studentId: data.studentId.toUpperCase() }] });
  if (dupe) {
    const field = dupe.email === data.email ? 'email' : 'studentId';
    throw new (require('../utils/ApiError').ApiError)(409, 'Account already exists', { [field]: field === 'email' ? 'This email is already registered' : 'This student ID is already registered' });
  }
  const { confirmPassword, password, ...rest } = data;
  // role is never read from the request body: public registration always creates a student
  const user = await User.create({ ...rest, password: await User.hash(password), role: 'student' });
  await startSession(req, user);
  ok(res, user, null, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = check(req.body, {
    email: { type: 'email', required: true, label: 'Email' },
    password: { type: 'string', required: true, label: 'Password' },
  });
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown user and wrong password: no account enumeration
  if (!user || !(await user.verifyPassword(password))) throw unauthorized('Invalid email or password');
  if (!user.active) throw forbidden('This account has been deactivated. Please contact the administrator.');
  user.lastLogin = new Date();
  await user.save();
  await startSession(req, user);
  ok(res, user);
});

exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('cc.sid');
    ok(res, { loggedOut: true });
  });
};

exports.me = (req, res) => ok(res, req.user);

// Public-page check: 200 with null when logged out (avoids noisy 401s in the browser console).
exports.session = asyncHandler(async (req, res) => {
  const user = req.session && req.session.userId ? await User.findById(req.session.userId) : null;
  ok(res, user && user.active ? user : null);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  // email, studentId and role are intentionally absent from the spec: they cannot be self-edited
  const data = check(req.body, profileSpec, { partial: req.user.role === 'admin' });
  Object.assign(req.user, data);
  await req.user.save();
  ok(res, req.user);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const data = check(req.body, {
    currentPassword: { type: 'string', required: true, label: 'Current password' },
    newPassword: { ...PASSWORD, label: 'New password' },
    confirmPassword: { type: 'string', required: true, label: 'Password confirmation' },
  });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.verifyPassword(data.currentPassword))) throw bad('Current password is incorrect', { currentPassword: 'Current password is incorrect' });
  if (!strongPassword(data.newPassword)) throw bad('Weak password', { newPassword: 'Password must contain at least one letter and one number' });
  if (data.newPassword !== data.confirmPassword) throw bad('Passwords do not match', { confirmPassword: 'Passwords do not match' });
  user.password = await User.hash(data.newPassword);
  await user.save();
  ok(res, { changed: true });
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw bad('Please choose an image', { image: 'Image is required' });
  removeFile(req.user.avatar, config.uploadDir);
  req.user.avatar = req.file.filename;
  await req.user.save();
  ok(res, req.user);
});

exports.avatar = asyncHandler(async (req, res) => {
  const user = await findOr404(User, req.params.id, 'User');
  if (!user.avatar) throw notFound('No avatar');
  res.set('Cache-Control', 'private, max-age=300');
  res.sendFile(path.join(config.uploadDir, path.basename(user.avatar)));
});
