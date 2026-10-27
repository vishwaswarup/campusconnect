const mongoose = require('mongoose');
const C = require('../config/constants');

const schema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  category: { type: String, enum: C.COMPLAINT_CATEGORIES, required: true },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  attachment: { filename: String, originalName: String, size: Number },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: C.COMPLAINT_STATUS, default: 'submitted' },
  priority: { type: String, enum: C.COMPLAINT_PRIORITY, default: 'medium' },
  assignedTo: { type: String, trim: true, maxlength: 100 },
  resolvedAt: Date,
}, { timestamps: true });

schema.index({ student: 1, createdAt: -1 });
schema.index({ status: 1, priority: 1 });
schema.index({ title: 'text', description: 'text', ticketId: 'text' });

schema.pre('validate', function () {
  if (!this.ticketId) {
    // CC-YYYY-xxxxxx, random suffix keeps IDs unguessable and collision-free in practice
    this.ticketId = `CC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
});

module.exports = mongoose.model('Complaint', schema);
