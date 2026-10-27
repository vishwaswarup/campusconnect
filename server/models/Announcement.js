const mongoose = require('mongoose');
const C = require('../config/constants');

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 6000 },
  category: { type: String, enum: C.ANNOUNCEMENT_CATEGORIES, default: 'General' },
  departments: [{ type: String, enum: C.DEPARTMENTS }], // empty = visible to everyone
  pinned: { type: Boolean, default: false },
  important: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  publishAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ title: 'text', body: 'text' });
schema.index({ status: 1, publishAt: -1 });

schema.pre('validate', function (next) {
  if (this.expiresAt && this.publishAt && this.expiresAt <= this.publishAt) this.invalidate('expiresAt', 'Expiry must be after the publish date');
  next();
});

// Visibility rule shared by list, detail and dashboard queries.
schema.statics.visibleTo = function (user, extra = {}) {
  const now = new Date();
  return {
    status: 'published',
    publishAt: { $lte: now },
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] },
      { $or: [{ departments: { $size: 0 } }, { departments: user.department || '__none__' }] },
    ],
    ...extra,
  };
};

module.exports = mongoose.model('Announcement', schema);
