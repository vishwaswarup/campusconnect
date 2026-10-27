const config = require('../config');
const { forbidden } = require('../utils/ApiError');

// Strip Mongo operators ($where, $gt ...) and dotted keys from user input (NoSQL injection defence).
function clean(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else clean(obj[key]);
  }
}
const sanitize = (req, res, next) => {
  clean(req.body);
  clean(req.params);
  clean(req.query);
  next();
};

// CSRF defence in depth (on top of SameSite cookies): unsafe requests must come from our own origin.
const originCheck = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // non-browser clients (curl, tests)
  try {
    const host = new URL(origin).host;
    if (host === req.get('host') || config.corsOrigins.includes(origin)) return next();
  } catch (e) { /* fall through */ }
  next(forbidden('Cross-site request blocked'));
};

module.exports = { sanitize, originCheck };
