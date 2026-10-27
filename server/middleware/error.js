const multer = require('multer');
const config = require('../config');
const { removeFile } = require('../utils/files');

const notFoundHandler = (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'API endpoint not found' });
  res.status(404).sendFile(require('path').join(__dirname, '../../public/404.html'));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Remove any uploaded file if the request ultimately failed
  if (req.file) removeFile(req.file.filename, config.uploadDir);

  let status = err.status || 500;
  let message = err.message;
  let errors = err.errors;

  if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload error';
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400; message = 'Invalid identifier or value';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `That ${field} is already in use`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413; message = 'Request body too large';
  }

  if (status >= 500) {
    if (!config.isTest) console.error(err); // log server-side only
    message = 'Something went wrong on our side. Please try again.';
  }
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
};

module.exports = { notFoundHandler, errorHandler };
