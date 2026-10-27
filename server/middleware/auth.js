const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

// Loads the user for every request so deactivation or role changes take effect immediately.
const authenticate = asyncHandler(async (req, res, next) => {
  const id = req.session && req.session.userId;
  if (!id) throw unauthorized();
  const user = await User.findById(id);
  if (!user || !user.active) {
    req.session.destroy(() => {});
    throw unauthorized('Your session has expired or the account is inactive');
  }
  req.user = user;
  next();
});

const requireAdmin = (req, res, next) => (req.user && req.user.role === 'admin' ? next() : next(forbidden('Admin access required')));

module.exports = { authenticate, requireAdmin, adminOnly: [authenticate, requireAdmin] };
