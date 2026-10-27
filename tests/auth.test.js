require('./shim');
const h = require('./helpers');
const User = require('../server/models/User');

beforeAll(h.setup);
afterAll(h.teardown);

describe('Registration', () => {
  test('registers a student, hashes the password and starts a session', async () => {
    const { agent, user } = await h.registerStudent(1);
    expect(user.role).toBe('student');
    expect(user.password).toBeUndefined();
    const dbUser = await User.findOne({ email: 'student1@college.edu' }).select('+password');
    expect(dbUser.password).not.toBe('Passw0rd123');
    expect(dbUser.password).toMatch(/^\$2[aby]\$/);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('student1@college.edu');
  });

  test('cannot self-register as admin via role field', async () => {
    const res = await h.request(h.getApp()).post('/api/auth/register').send(h.studentPayload(2, { role: 'admin' }));
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('student');
  });

  test('rejects duplicate email and student ID', async () => {
    const a = await h.request(h.getApp()).post('/api/auth/register').send(h.studentPayload(1, { studentId: 'OTHER99' }));
    expect(a.status).toBe(409);
    expect(a.body.errors.email).toBeDefined();
    const b = await h.request(h.getApp()).post('/api/auth/register').send(h.studentPayload(1, { email: 'new@college.edu' }));
    expect(b.status).toBe(409);
    expect(b.body.errors.studentId).toBeDefined();
  });

  test.each([
    ['short password', { password: 'abc1', confirmPassword: 'abc1' }, 'password'],
    ['password without digit', { password: 'abcdefghij', confirmPassword: 'abcdefghij' }, 'password'],
    ['mismatched confirm', { confirmPassword: 'Different123' }, 'confirmPassword'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['invalid department', { department: 'Wizardry' }, 'department'],
    ['missing name', { name: '' }, 'name'],
  ])('validation: %s', async (_, over, field) => {
    const res = await h.request(h.getApp()).post('/api/auth/register').send(h.studentPayload(50, over));
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  test('NoSQL injection payload in login is rejected', async () => {
    const res = await h.request(h.getApp()).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('Login / logout', () => {
  test('valid login works and logout ends the session', async () => {
    const agent = h.request.agent(h.getApp());
    const res = await agent.post('/api/auth/login').send({ email: 'student1@college.edu', password: 'Passw0rd123' });
    expect(res.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect((await agent.post('/api/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  test('wrong password and unknown user get the same generic 401', async () => {
    const a = await h.request(h.getApp()).post('/api/auth/login').send({ email: 'student1@college.edu', password: 'WrongPass1' });
    const b = await h.request(h.getApp()).post('/api/auth/login').send({ email: 'nobody@college.edu', password: 'WrongPass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('deactivated user cannot log in and existing sessions stop working', async () => {
    const { agent, user } = await h.registerStudent(7);
    const admin = await h.loginAdmin();
    expect((await admin.agent.patch(`/api/admin/users/${user._id}`).send({ active: false })).status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    const login = await h.request(h.getApp()).post('/api/auth/login').send({ email: 'student7@college.edu', password: 'Passw0rd123' });
    expect(login.status).toBe(403);
  });

  test('protected route without session returns 401', async () => {
    expect((await h.request(h.getApp()).get('/api/events')).status).toBe(401);
  });
});

describe('Profile permissions', () => {
  test('student can edit permitted fields but not email, studentId or role', async () => {
    const { agent } = await h.registerStudent(10);
    const res = await agent.patch('/api/me').send({ name: 'New Name', department: 'Mechanical', course: 'B.Tech', year: 3, role: 'admin', email: 'hack@x.com', studentId: 'HACK1' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.role).toBe('student');
    expect(res.body.data.email).toBe('student10@college.edu');
    expect(res.body.data.studentId).toBe('STU1010');
  });

  test('student cannot modify another profile or use admin endpoints', async () => {
    const { agent } = await h.registerStudent(11);
    const other = await User.findOne({ email: 'student10@college.edu' });
    expect((await agent.patch(`/api/admin/users/${other._id}`).send({ name: 'Pwned' })).status).toBe(403);
    expect((await agent.get('/api/admin/users')).status).toBe(403);
    expect((await agent.get('/api/admin/stats')).status).toBe(403);
  });

  test('password change requires the correct current password', async () => {
    const { agent } = await h.registerStudent(12);
    const bad = await agent.post('/api/me/password').send({ currentPassword: 'nope', newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
    expect(bad.status).toBe(400);
    const good = await agent.post('/api/me/password').send({ currentPassword: 'Passw0rd123', newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
    expect(good.status).toBe(200);
    const login = await h.request(h.getApp()).post('/api/auth/login').send({ email: 'student12@college.edu', password: 'NewPass123' });
    expect(login.status).toBe(200);
  });

  test('avatar upload accepts a real image, rejects a fake one', async () => {
    const { agent, user } = await h.registerStudent(13);
    const okRes = await agent.post('/api/me/avatar').attach('image', h.PNG, 'a.png');
    expect(okRes.status).toBe(200);
    expect((await agent.get(`/api/users/${user._id}/avatar`)).status).toBe(200);
    const fake = await agent.post('/api/me/avatar').attach('image', Buffer.from('<script>alert(1)</script>'), 'x.png');
    expect(fake.status).toBe(400);
  });
});

describe('Misc API behaviour', () => {
  test('health check', async () => {
    const res = await h.request(h.getApp()).get('/api/health');
    expect(res.body.status).toBe('ok');
  });
  test('unknown API route returns JSON 404', async () => {
    const res = await h.request(h.getApp()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
  test('malformed JSON returns 400', async () => {
    const res = await h.request(h.getApp()).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
  test('invalid ObjectId returns 404 not 500', async () => {
    const { agent } = await h.registerStudent(20);
    expect((await agent.get('/api/events/not-an-id')).status).toBe(404);
  });
  test('cross-origin state-changing request is blocked', async () => {
    const res = await h.request(h.getApp()).post('/api/auth/logout').set('Origin', 'https://evil.example').send({});
    expect(res.status).toBe(403);
  });
});
