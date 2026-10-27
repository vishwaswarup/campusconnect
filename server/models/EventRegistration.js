const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
  registeredAt: { type: Date, default: Date.now },
  cancelledAt: Date,
}, { timestamps: true });

schema.index({ event: 1, user: 1 }, { unique: true }); // duplicate prevention at DB level
schema.index({ user: 1, status: 1 });

module.exports = mongoose.model('EventRegistration', schema);
