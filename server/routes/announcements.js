const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/announcementController');

router.get('/', c.list);
router.post('/', requireAdmin, c.create);
router.get('/:id', c.get);
router.put('/:id', requireAdmin, c.update);
router.patch('/:id/pin', requireAdmin, c.pin);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
