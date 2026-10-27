const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { uploadAttachment } = require('../middleware/upload');
const c = require('../controllers/complaintController');

router.get('/', c.list);
router.post('/', uploadAttachment('attachment'), c.create);
router.get('/:id', c.get);
router.get('/:id/attachment', c.attachment);
router.post('/:id/messages', c.addMessage);
router.post('/:id/reopen', c.reopen);
router.patch('/:id', requireAdmin, c.update);

module.exports = router;
