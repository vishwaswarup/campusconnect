const mongoose = require('mongoose');
const C = require('../config/constants');

const schema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: C.MEMBERSHIP_STATUS, default: 'pending' },
  message: { type: String, trim: true, maxlength: 500 },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: Date,
}, { timestamps: true });

schema.index({ club: 1, user: 1 }, { unique: true });
schema.index({ user: 1, status: 1 });

module.exports = mongoose.model('ClubMembership', schema);
