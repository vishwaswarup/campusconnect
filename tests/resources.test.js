require('./shim');
const h = require('./helpers');
const Resource = require('../server/models/Resource');

let admin, s1, s2;
const fields = (r, over = {}) => r.field({ title: 'DS Notes', subject: 'Data Structures', department: 'Computer Science', semester: '3', category: 'Lecture Notes', description: 'Notes', ...over });

beforeAll(async () => { await h.setup(); admin = await h.loginAdmin(); s1 = await h.registerStudent(1); s2 = await h.registerStudent(2); });
afterAll(h.teardown);

test('student upload is pending and hidden from other students; owner can see it', async () => {
  const res = await fields(s1.agent.post('/api/resources').attach('file', h.PDF, 'notes.pdf'));
  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe('pending');
  const id = res.body.data._id;
  expect((await s2.agent.get('/api/resources')).body.data).toHaveLength(0);
  expect((await s2.agent.get(`/api/resources/${id}`)).status).toBe(404);
  expect((await s2.agent.get(`/api/resources/${id}/download`)).status).toBe(404); // unauthorized download blocked
  expect((await s1.agent.get(`/api/resources/${id}/download`)).status).toBe(200);
  expect((await s1.agent.get('/api/resources/mine')).body.data).toHaveLength(1);
});

test('admin approves -> everyone can download; student cannot review', async () => {
  const r = await Resource.findOne({ title: 'DS Notes' });
  expect((await s1.agent.patch(`/api/resources/${r._id}/review`).send({ status: 'approved' })).status).toBe(403);
  expect((await admin.agent.patch(`/api/resources/${r._id}/review`).send({ status: 'rejected' })).status).toBe(400); // reason required
  expect((await admin.agent.patch(`/api/resources/${r._id}/review`).send({ status: 'approved' })).status).toBe(200);
  const dl = await s2.agent.get(`/api/resources/${r._id}/download`);
  expect(dl.status).toBe(200);
  expect(dl.headers['content-disposition']).toMatch(/attachment/);
  expect((await Resource.findById(r._id)).downloads).toBe(2); // owner + this student
});

test('search and filters', async () => {
  expect((await s2.agent.get('/api/resources?q=data')).body.data).toHaveLength(1);
  expect((await s2.agent.get('/api/resources?department=Mechanical')).body.data).toHaveLength(0);
  expect((await s2.agent.get('/api/resources?semester=3&category=Lecture%20Notes')).body.data).toHaveLength(1);
  expect((await s2.agent.get('/api/resources?semester=5')).body.data).toHaveLength(0);
});

test('upload validation: no file, wrong type, spoofed content, bad metadata', async () => {
  expect((await fields(s1.agent.post('/api/resources'))).status).toBe(400);
  expect((await fields(s1.agent.post('/api/resources').attach('file', Buffer.from('MZ binary'), 'virus.exe'))).status).toBe(400);
  expect((await fields(s1.agent.post('/api/resources').attach('file', Buffer.from('<html>evil</html>'), 'fake.pdf'))).status).toBe(400);
  expect((await fields(s1.agent.post('/api/resources').attach('file', h.PDF, 'ok.pdf'), { semester: '99' })).status).toBe(400);
});

test('oversize file rejected with 413', async () => {
  const big = Buffer.concat([h.PDF, Buffer.alloc(11 * 1024 * 1024)]);
  expect((await fields(s1.agent.post('/api/resources').attach('file', big, 'big.pdf'))).status).toBe(413);
});

test('only owner (while pending) or admin can edit/delete', async () => {
  const up = await fields(s1.agent.post('/api/resources').attach('file', h.PDF, 'b.pdf'), { title: 'Mine' });
  const id = up.body.data._id;
  expect((await s2.agent.put(`/api/resources/${id}`).send({ title: 'Stolen' })).status).toBe(403);
  expect((await s2.agent.delete(`/api/resources/${id}`)).status).toBe(403);
  expect((await s1.agent.put(`/api/resources/${id}`).send({ title: 'Mine v2' })).status).toBe(200);
  expect((await admin.agent.delete(`/api/resources/${id}`)).status).toBe(200);
});

test('admin upload is auto-approved', async () => {
  const res = await fields(admin.agent.post('/api/resources').attach('file', h.PDF, 'a.pdf'), { title: 'Admin Notes' });
  expect(res.body.data.status).toBe('approved');
});
