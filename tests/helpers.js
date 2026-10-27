const request = require('supertest');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const createApp = require('../server/app'); // loads all models
const fs = require('fs');
fs.readdirSync(require('path').join(__dirname, '../server/models')).forEach((f) => require('../server/models/' + f));
const User = require('../server/models/User');

let app;
const getApp = () => app || (app = createApp());

async function setup() {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
async function teardown() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

const studentPayload = (n = 1, over = {}) => ({
  name: `Test Student ${n}`, email: `student${n}@college.edu`, studentId: `STU${1000 + n}`,
  department: 'Computer Science', course: 'B.Tech', year: 2, password: 'Passw0rd123', confirmPassword: 'Passw0rd123', ...over,
});

// Returns a supertest agent (cookie jar) that is logged in.
async function registerStudent(n = 1, over = {}) {
  const agent = request.agent(getApp());
  const res = await agent.post('/api/auth/register').send(studentPayload(n, over));
  if (res.status !== 201) throw new Error('register failed: ' + JSON.stringify(res.body));
  return { agent, user: res.body.data };
}
async function loginAdmin() {
  let admin = await User.findOne({ email: 'admin@college.edu' });
  if (!admin) admin = await User.create({ name: 'Admin User', email: 'admin@college.edu', password: await User.hash('AdminPass123'), role: 'admin' });
  const agent = request.agent(getApp());
  const res = await agent.post('/api/auth/login').send({ email: 'admin@college.edu', password: 'AdminPass123' });
  if (res.status !== 200) throw new Error('admin login failed');
  return { agent, user: admin };
}

// Minimal valid files for upload tests
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const futureDate = (days, hour = 10) => { const d = new Date(Date.now() + days * 864e5); d.setHours(hour, 0, 0, 0); return d.toISOString(); };

module.exports = { request, getApp, setup, teardown, studentPayload, registerStudent, loginAdmin, PDF, PNG, futureDate };
