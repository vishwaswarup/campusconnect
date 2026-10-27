const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { uploadDoc } = require('../middleware/upload');
const c = require('../controllers/resourceController');

router.get('/', c.list);
router.get('/mine', c.mine);
router.post('/', uploadDoc('file'), c.create);
router.get('/:id', c.get);
router.get('/:id/download', c.download);
router.put('/:id', c.update);
router.patch('/:id/review', requireAdmin, c.review);
router.delete('/:id', c.remove);

module.exports = router;
