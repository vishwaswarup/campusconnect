const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/eventController');

router.get('/', c.list);
router.get('/mine', c.mine);
router.post('/', requireAdmin, c.create);
router.get('/:id', c.get);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);
router.get('/:id/participants', requireAdmin, c.participants);
router.post('/:id/register', c.register);
router.delete('/:id/register', c.cancel);

module.exports = router;
