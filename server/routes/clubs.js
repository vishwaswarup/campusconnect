const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/clubController');

router.get('/', c.list);
router.post('/', requireAdmin, c.create);
// Static paths must be declared before '/:id'
router.get('/memberships/mine', c.myMemberships);
router.get('/memberships', requireAdmin, c.listMemberships);
router.patch('/memberships/:id', requireAdmin, c.decide);
router.get('/:id', c.get);
router.put('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);
router.post('/:id/join', c.join);
router.delete('/:id/join', c.withdraw);

module.exports = router;
