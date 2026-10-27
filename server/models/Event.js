const mongoose = require('mongoose');
const C = require('../config/constants');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  category: { type: String, enum: C.EVENT_CATEGORIES, required: true },
  venue: { type: String, required: true, trim: true, maxlength: 140 },
  organizer: { type: String, required: true, trim: true, maxlength: 120 },
  startAt: { type: Date, required: true },
  endAt: { type: Date },
  registrationDeadline: { type: Date },
  capacity: { type: Number, default: 0, min: 0 }, // 0 = unlimited
  registeredCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: C.EVENT_STATUS, default: 'published' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

eventSchema.index({ title: 'text', description: 'text', organizer: 'text' });
eventSchema.index({ status: 1, startAt: 1 });

eventSchema.pre('validate', function (next) {
  if (this.endAt && this.endAt < this.startAt) this.invalidate('endAt', 'End time must be after start time');
  if (this.registrationDeadline && this.registrationDeadline > this.startAt) this.invalidate('registrationDeadline', 'Deadline must be before the event starts');
  next();
});

module.exports = mongoose.model('Event', eventSchema);
