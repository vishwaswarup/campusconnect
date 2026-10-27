const C = require('../config/constants');
const config = require('../config');
const { ok } = require('../utils/helpers');

exports.options = (req, res) => ok(res, { ...C, studentUploads: config.studentUploads });
