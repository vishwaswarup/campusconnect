require('dotenv').config();
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set (32+ chars) in production');
}
if (isProd && !process.env.MONGODB_URI) throw new Error('MONGODB_URI must be set in production');

module.exports = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 3000,
  mongoUri: isTest
    ? process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/campusconnect_test'
    : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')),
  trustProxy: process.env.TRUST_PROXY === 'true',
  studentUploads: process.env.STUDENT_UPLOADS !== 'false',
};
