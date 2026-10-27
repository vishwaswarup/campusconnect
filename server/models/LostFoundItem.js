const mongoose = require('mongoose');
const C = require('../config/constants');

const schema = new mongoose.Schema({
  type: { type: String, enum: C.LF_TYPES, required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 1500 },
  category: { type: String, enum: C.LF_CATEGORIES, required: true },
  location: { type: String, required: true, trim: true, maxlength: 140 },
  date: { type: Date, required: true },
  image: { type: String },
  status: { type: String, enum: C.LF_STATUS, default: 'open' },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Contact details are private by default; only the owner and admins can see them unless the reporter opts in.
  contactInfo: { type: String, trim: true, maxlength: 120 },
  showContact: { type: Boolean, default: false },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, trim: true, maxlength: 300 },
  flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ name: 'text', description: 'text', location: 'text' });
schema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LostFoundItem', schema);
