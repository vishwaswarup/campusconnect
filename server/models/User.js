const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const C = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  studentId: { type: String, trim: true, uppercase: true, unique: true, sparse: true, maxlength: 30 },
  department: { type: String, enum: C.DEPARTMENTS },
  course: { type: String, enum: C.COURSES },
  year: { type: Number, min: 1, max: 5 },
  phone: { type: String, trim: true, maxlength: 20 },
  bio: { type: String, trim: true, maxlength: 300 },
  avatar: { type: String },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: C.ROLES, default: 'student' },
  active: { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true });

userSchema.index({ name: 'text', email: 'text', studentId: 'text' });
userSchema.index({ role: 1, createdAt: -1 });

userSchema.statics.hash = (plain) => bcrypt.hash(plain, 12);
userSchema.methods.verifyPassword = function (plain) { return bcrypt.compare(plain, this.password); };

// Never leak the hash or internal fields in API responses.
userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.password;
  delete o.__v;
  o.hasAvatar = !!o.avatar;
  delete o.avatar;
  return o;
};

module.exports = mongoose.model('User', userSchema);
