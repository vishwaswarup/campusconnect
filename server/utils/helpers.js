const mongoose = require('mongoose');
const { notFound } = require('./ApiError');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data, meta, status = 200) => res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Returns a case-insensitive regex for user-supplied search text (escaped to prevent ReDoS / injection).
const searchRegex = (q) => new RegExp(escapeRegex(String(q).slice(0, 80).trim()), 'i');

function parsePaging(query, defaultLimit = 10) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

async function paginate(model, filter, { query, sort = { createdAt: -1 }, populate, select, limit: dl }) {
  const { page, limit, skip } = parsePaging(query, dl);
  let q = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (select) q = q.select(select);
  if (populate) q = q.populate(populate);
  const [items, total] = await Promise.all([q, model.countDocuments(filter)]);
  return { items, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } };
}

// Validates :id params and loads the document, or 404.
function validObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}
async function findOr404(model, id, label = 'Record') {
  if (!validObjectId(id)) throw notFound(`${label} not found`);
  const doc = await model.findById(id);
  if (!doc) throw notFound(`${label} not found`);
  return doc;
}

// Allow only a fixed whitelist for ?sort= values
function pickSort(value, allowed, fallback) {
  return allowed[value] || fallback;
}

module.exports = { asyncHandler, ok, escapeRegex, searchRegex, parsePaging, paginate, validObjectId, findOr404, pickSort };
