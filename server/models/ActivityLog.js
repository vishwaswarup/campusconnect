const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: mongoose.Schema.Types.ObjectId,
  summary: { type: String, maxlength: 300 },
}, { timestamps: true });

schema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', schema);
