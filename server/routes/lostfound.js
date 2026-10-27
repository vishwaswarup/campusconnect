const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const c = require('../controllers/lostFoundController');

router.get('/', c.list);
router.get('/mine', c.mine);
router.post('/', uploadImage('image'), c.create);
router.get('/:id', c.get);
router.get('/:id/image', c.image);
router.put('/:id', uploadImage('image'), c.update);
router.patch('/:id/status', c.setStatus);
router.post('/:id/flag', c.flag);
router.delete('/:id/flag', requireAdmin, c.clearFlag);
router.delete('/:id', c.remove);

module.exports = router;
