const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../config');
const { bad } = require('../utils/ApiError');
const { contentMatches, removeFile } = require('../utils/files');

fs.mkdirSync(config.uploadDir, { recursive: true });

const IMAGE = { exts: ['jpg', 'jpeg', 'png', 'webp'], max: 3 * 1024 * 1024 };
const DOC = { exts: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'txt'], max: 10 * 1024 * 1024 };
const ATTACH = { exts: ['pdf', 'jpg', 'jpeg', 'png'], max: 5 * 1024 * 1024 };

const MIME_OK = /^(application\/(pdf|msword|vnd\.|octet-stream|zip)|text\/plain|image\/(jpeg|png|webp))/;

function makeUploader(kind, field) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: config.uploadDir,
      // Never trust the client filename: random name + validated extension
      filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: kind.max, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(1).toLowerCase();
      if (!kind.exts.includes(ext) || !MIME_OK.test(file.mimetype)) {
        return cb(bad(`Unsupported file type. Allowed: ${kind.exts.join(', ')}`));
      }
      cb(null, true);
    },
  }).single(field);

  return (req, res, next) =>
    upload(req, res, async (err) => {
      if (err) return next(err);
      if (req.file) {
        const ext = path.extname(req.file.filename).slice(1);
        if (!(await contentMatches(req.file.path, ext).catch(() => false))) {
          removeFile(req.file.filename, config.uploadDir);
          req.file = undefined;
          return next(bad('File content does not match its extension'));
        }
      }
      next();
    });
}

module.exports = {
  uploadImage: (field = 'image') => makeUploader(IMAGE, field),
  uploadDoc: (field = 'file') => makeUploader(DOC, field),
  uploadAttachment: (field = 'attachment') => makeUploader(ATTACH, field),
};
