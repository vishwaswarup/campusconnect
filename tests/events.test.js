require('./shim');
const h = require('./helpers');
const Event = require('../server/models/Event');

let admin, s1, s2;
const evPayload = (over = {}) => ({
  title: 'Test Hackathon', description: 'A long enough description for the event.', category: 'Technical',
  venue: 'Lab 1', organizer: 'Coding Club', startAt: h.futureDate(5), registrationDeadline: h.futureDate(3), capacity: 2, ...over,
});

beforeAll(async () => {
  await h.setup();
  admin = await h.loginAdmin();
  s1 = await h.registerStudent(1);
  s2 = await h.registerStudent(2);
});
afterAll(h.teardown);

test('student cannot create events; admin can; validation applies', async () => {
  expect((await s1.agent.post('/api/events').send(evPayload())).status).toBe(403);
  expect((await admin.agent.post('/api/events').send(evPayload({ title: '' }))).status).toBe(400);
  expect((await admin.agent.post('/api/events').send(evPayload({ registrationDeadline: h.futureDate(9) }))).status).toBe(400);
  const res = await admin.agent.post('/api/events').send(evPayload());
  expect(res.status).toBe(201);
});

test('students see only published events; admin sees drafts', async () => {
  await admin.agent.post('/api/events').send(evPayload({ title: 'Secret Draft', status: 'draft' }));
  const stu = await s1.agent.get('/api/events?when=all');
  expect(stu.body.data.some((e) => e.title === 'Secret Draft')).toBe(false);
  const adm = await admin.agent.get('/api/events?when=all');
  expect(adm.body.data.some((e) => e.title === 'Secret Draft')).toBe(true);
  const draft = await Event.findOne({ title: 'Secret Draft' });
  expect((await s1.agent.get(`/api/events/${draft._id}`)).status).toBe(404);
  expect((await s1.agent.post(`/api/events/${draft._id}/register`)).status).toBe(404);
});

test('search and category filter', async () => {
  const a = await s1.agent.get('/api/events?q=hackathon');
  expect(a.body.data.length).toBeGreaterThan(0);
  const b = await s1.agent.get('/api/events?q=zzzznomatch');
  expect(b.body.data).toHaveLength(0);
  const c = await s1.agent.get('/api/events?category=Sports');
  expect(c.body.data).toHaveLength(0);
});

test('register, duplicate prevention, capacity and cancel', async () => {
  const ev = await Event.findOne({ title: 'Test Hackathon' });
  const r1 = await s1.agent.post(`/api/events/${ev._id}/register`);
  expect(r1.status).toBe(201);
  expect(r1.body.data.isRegistered).toBe(true);
  expect((await s1.agent.post(`/api/events/${ev._id}/register`)).status).toBe(409); // duplicate
  expect((await s2.agent.post(`/api/events/${ev._id}/register`)).status).toBe(201);
  const s3 = await h.registerStudent(3);
  const full = await s3.agent.post(`/api/events/${ev._id}/register`);
  expect(full.status).toBe(409);
  expect(full.body.message).toMatch(/full/i);
  expect((await Event.findById(ev._id)).registeredCount).toBe(2);

  // cancel frees a seat; re-registration allowed
  expect((await s1.agent.delete(`/api/events/${ev._id}/register`)).status).toBe(200);
  expect((await Event.findById(ev._id)).registeredCount).toBe(1);
  expect((await s1.agent.delete(`/api/events/${ev._id}/register`)).status).toBe(404); // not registered anymore
  expect((await s3.agent.post(`/api/events/${ev._id}/register`)).status).toBe(201);
  const mine = await s3.agent.get('/api/events/mine');
  expect(mine.body.data).toHaveLength(1);
});

test('concurrent registrations never exceed capacity', async () => {
  const create = await admin.agent.post('/api/events').send(evPayload({ title: 'Race Event', capacity: 3 }));
  const id = create.body.data._id;
  const users = await Promise.all([10, 11, 12, 13, 14, 15].map((n) => h.registerStudent(n)));
  const results = await Promise.all(users.map((u) => u.agent.post(`/api/events/${id}/register`)));
  expect(results.filter((r) => r.status === 201)).toHaveLength(3);
  expect((await Event.findById(id)).registeredCount).toBe(3);
});

test('registration closed after deadline', async () => {
  const ev = await Event.create({ ...evPayload({ title: 'Closed', capacity: 0 }), startAt: new Date(Date.now() + 864e5), registrationDeadline: new Date(Date.now() - 1000), createdBy: admin.user._id });
  const res = await s1.agent.post(`/api/events/${ev._id}/register`);
  expect(res.status).toBe(400);
  expect(res.body.message).toMatch(/closed/i);
});

test('participants list: admin only; CSV export', async () => {
  const ev = await Event.findOne({ title: 'Test Hackathon' });
  expect((await s1.agent.get(`/api/events/${ev._id}/participants`)).status).toBe(403);
  const list = await admin.agent.get(`/api/events/${ev._id}/participants`);
  expect(list.status).toBe(200);
  expect(list.body.data).toHaveLength(2);
  const csv = await admin.agent.get(`/api/events/${ev._id}/participants?format=csv`);
  expect(csv.headers['content-type']).toMatch(/csv/);
});

test('admin edit (cannot drop capacity below registrations) and delete', async () => {
  const ev = await Event.findOne({ title: 'Test Hackathon' });
  expect((await admin.agent.put(`/api/events/${ev._id}`).send({ capacity: 1 })).status).toBe(400);
  expect((await admin.agent.put(`/api/events/${ev._id}`).send({ venue: 'Hall 9' })).body.data.venue).toBe('Hall 9');
  expect((await s1.agent.delete(`/api/events/${ev._id}`)).status).toBe(403);
  expect((await admin.agent.delete(`/api/events/${ev._id}`)).status).toBe(200);
  expect((await s1.agent.get(`/api/events/${ev._id}`)).status).toBe(404);
});
