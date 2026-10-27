const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const auth = require('../controllers/authController');
const admin = require('../controllers/adminController');
const meta = require('../controllers/metaController');
const dashboard = require('../controllers/dashboardController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime(), time: new Date().toISOString() }));
router.get('/meta/options', meta.options);

router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);
router.get('/auth/session', auth.session);

router.patch('/me', authenticate, auth.updateProfile);
router.post('/me/password', authenticate, authLimiter, auth.changePassword);
router.post('/me/avatar', authenticate, uploadImage('image'), auth.uploadAvatar);
router.get('/me/summary', authenticate, dashboard.profileSummary);
router.get('/users/:id/avatar', authenticate, auth.avatar);
router.get('/dashboard', authenticate, dashboard.student);

router.get('/admin/stats', authenticate, requireAdmin, admin.stats);
router.get('/admin/users', authenticate, requireAdmin, admin.listUsers);
router.patch('/admin/users/:id', authenticate, requireAdmin, admin.updateUser);
router.get('/admin/activity', authenticate, requireAdmin, admin.activity);

router.use('/events', authenticate, require('./events'));
router.use('/resources', authenticate, require('./resources'));
router.use('/announcements', authenticate, require('./announcements'));
router.use('/lostfound', authenticate, require('./lostfound'));
router.use('/complaints', authenticate, require('./complaints'));
router.use('/clubs', authenticate, require('./clubs'));

module.exports = router;
