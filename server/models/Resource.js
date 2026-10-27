const mongoose = require('mongoose');
const C = require('../config/constants');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, trim: true, maxlength: 1500, default: '' },
  subject: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, enum: C.DEPARTMENTS, required: true },
  semester: { type: Number, min: 1, max: 10, required: true },
  category: { type: String, enum: C.RESOURCE_CATEGORIES, required: true },
  file: {
    filename: { type: String, required: true }, // stored name on disk
    originalName: String,
    size: Number,
    ext: String,
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: C.RESOURCE_STATUS, default: 'pending' },
  reviewNote: { type: String, trim: true, maxlength: 300 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  downloads: { type: Number, default: 0 },
}, { timestamps: true });

resourceSchema.index({ title: 'text', subject: 'text', description: 'text' });
resourceSchema.index({ status: 1, department: 1, semester: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
