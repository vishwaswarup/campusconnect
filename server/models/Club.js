const mongoose = require('mongoose');
const C = require('../config/constants');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { type: String, enum: C.CLUB_CATEGORIES, required: true },
  activities: [{ type: String, trim: true, maxlength: 100 }],
  coordinator: { type: String, required: true, trim: true, maxlength: 100 },
  coordinatorEmail: { type: String, trim: true, lowercase: true, maxlength: 120 },
  meetingSchedule: { type: String, trim: true, maxlength: 120 },
  capacity: { type: Number, default: 0, min: 0 }, // 0 = unlimited
  active: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Club', schema);
