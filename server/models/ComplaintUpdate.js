const mongoose = require('mongoose');

// One row per event in a complaint's life: status changes, replies, follow-ups and internal notes.
const schema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, enum: ['student', 'admin'], required: true },
  type: { type: String, enum: ['created', 'status_change', 'response', 'follow_up', 'internal_note', 'reopened', 'update'], required: true },
  message: { type: String, trim: true, maxlength: 3000 },
  fromStatus: String,
  toStatus: String,
  internal: { type: Boolean, default: false }, // internal === true is NEVER returned to students
}, { timestamps: true });

module.exports = mongoose.model('ComplaintUpdate', schema);
