require('./shim');
const h = require('./helpers');
const Announcement = require('../server/models/Announcement');
const LostFoundItem = require('../server/models/LostFoundItem');
const Complaint = require('../server/models/Complaint');
const Club = require('../server/models/Club');

let admin, s1, s2, cs, mech;
beforeAll(async () => {
  await h.setup();
  admin = await h.loginAdmin();
  s1 = await h.registerStudent(1);           // Computer Science
  s2 = await h.registerStudent(2, { department: 'Mechanical' });
});
afterAll(h.teardown);

describe('Announcements', () => {
  const base = { title: 'Notice', body: 'Some body text', category: 'General' };
  test('visibility: department targeting, drafts, scheduled and expired are enforced server-side', async () => {
    const mk = (over) => admin.agent.post('/api/announcements').send({ ...base, ...over });
    await mk({ title: 'For Everyone' });
    await mk({ title: 'CS Only', departments: ['Computer Science'] });
    await mk({ title: 'A Draft', status: 'draft' });
    await mk({ title: 'Scheduled', publishAt: h.futureDate(5) });
    await Announcement.create({ ...base, title: 'Expired', publishAt: new Date(Date.now() - 5 * 864e5), expiresAt: new Date(Date.now() - 864e5) });

    const titles = async (a) => (await a.agent.get('/api/announcements')).body.data.map((x) => x.title).sort();
    expect(await titles(s1)).toEqual(['CS Only', 'For Everyone']);
    expect(await titles(s2)).toEqual(['For Everyone']);
    expect((await titles(admin)).length).toBe(5);

    const csOnly = await Announcement.findOne({ title: 'CS Only' });
    expect((await s1.agent.get(`/api/announcements/${csOnly._id}`)).status).toBe(200);
    expect((await s2.agent.get(`/api/announcements/${csOnly._id}`)).status).toBe(404);
    const draft = await Announcement.findOne({ title: 'A Draft' });
    expect((await s1.agent.get(`/api/announcements/${draft._id}`)).status).toBe(404);
  });
  test('pin/unpin ordering, filters and admin-only mutation', async () => {
    const a = await Announcement.findOne({ title: 'For Everyone' });
    expect((await s1.agent.patch(`/api/announcements/${a._id}/pin`)).status).toBe(403);
    expect((await admin.agent.patch(`/api/announcements/${a._id}/pin`)).body.data.pinned).toBe(true);
    expect((await s1.agent.get('/api/announcements')).body.data[0].title).toBe('For Everyone');
    expect((await admin.agent.patch(`/api/announcements/${a._id}/pin`)).body.data.pinned).toBe(false);
    expect((await s1.agent.get('/api/announcements?category=Exam')).body.data).toHaveLength(0);
    expect((await s1.agent.post('/api/announcements').send(base)).status).toBe(403);
    expect((await admin.agent.post('/api/announcements').send({ ...base, publishAt: h.futureDate(5), expiresAt: h.futureDate(2) })).status).toBe(400);
    expect((await admin.agent.delete(`/api/announcements/${a._id}`)).status).toBe(200);
  });
});

describe('Lost & Found', () => {
  const item = { type: 'lost', name: 'Blue Umbrella', description: 'Large blue umbrella with wooden handle', category: 'Accessories', location: 'Library', date: new Date().toISOString(), contactInfo: 'secret@x.com' };
  let id;
  test('create (with image) and privacy of contact details', async () => {
    const res = await s1.agent.post('/api/lostfound').field(item).attach('image', h.PNG, 'u.png');
    expect(res.status).toBe(201);
    id = res.body.data._id;
    expect(res.body.data.hasImage).toBe(true);
    expect(res.body.data.contactInfo).toBe('secret@x.com'); // owner sees it
    const other = await s2.agent.get(`/api/lostfound/${id}`);
    expect(other.body.data.contactInfo).toBeUndefined(); // other student does not
    expect((await admin.agent.get(`/api/lostfound/${id}`)).body.data.contactInfo).toBe('secret@x.com');
    expect((await s2.agent.get(`/api/lostfound/${id}/image`)).status).toBe(200);
    expect((await h.request(h.getApp()).get(`/api/lostfound/${id}/image`)).status).toBe(401);
  });
  test('validation: future date, bad type, bad image', async () => {
    expect((await s1.agent.post('/api/lostfound').field({ ...item, date: h.futureDate(10) })).status).toBe(400);
    expect((await s1.agent.post('/api/lostfound').field({ ...item, type: 'stolen' })).status).toBe(400);
    expect((await s1.agent.post('/api/lostfound').field(item).attach('image', Buffer.from('not image'), 'x.png')).status).toBe(400);
  });
  test('ownership: others cannot edit, change status or delete; owner and admin can', async () => {
    expect((await s2.agent.put(`/api/lostfound/${id}`).send({ name: 'Hijack' })).status).toBe(403);
    expect((await s2.agent.patch(`/api/lostfound/${id}/status`).send({ status: 'recovered' })).status).toBe(403);
    expect((await s2.agent.delete(`/api/lostfound/${id}`)).status).toBe(403);
    expect((await s1.agent.patch(`/api/lostfound/${id}/status`).send({ status: 'recovered' })).body.data.status).toBe('recovered');
    expect((await s1.agent.get('/api/lostfound/mine')).body.data).toHaveLength(1);
    expect((await s2.agent.get('/api/lostfound/mine')).body.data).toHaveLength(0);
  });
  test('search/filter, flagging and admin moderation', async () => {
    expect((await s2.agent.get('/api/lostfound?q=umbrella')).body.data).toHaveLength(1);
    expect((await s2.agent.get('/api/lostfound?type=found')).body.data).toHaveLength(0);
    expect((await s2.agent.post(`/api/lostfound/${id}/flag`).send({ reason: 'looks like spam' })).status).toBe(200);
    expect((await admin.agent.get('/api/lostfound?flagged=true')).body.data).toHaveLength(1);
    expect((await s2.agent.delete(`/api/lostfound/${id}/flag`)).status).toBe(403);
    expect((await admin.agent.delete(`/api/lostfound/${id}`)).status).toBe(200);
    expect(await LostFoundItem.countDocuments()).toBe(0);
  });
});

describe('Complaints', () => {
  let cid;
  const body = { title: 'Broken fan in lab', category: 'Infrastructure', description: 'The ceiling fan in Lab 4 has not worked for a week now.' };
  test('student submits; sees only own complaints; validation', async () => {
    expect((await s1.agent.post('/api/complaints').send({ ...body, title: 'x' })).status).toBe(400);
    const res = await s1.agent.post('/api/complaints').field(body).attach('attachment', h.PDF, 'proof.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('submitted');
    cid = res.body.data._id;
    expect((await s1.agent.get('/api/complaints')).body.data).toHaveLength(1);
    expect((await s2.agent.get('/api/complaints')).body.data).toHaveLength(0);
  });
  test('private: other students get 404 on detail, messages, attachment', async () => {
    expect((await s2.agent.get(`/api/complaints/${cid}`)).status).toBe(404);
    expect((await s2.agent.get(`/api/complaints/${cid}/attachment`)).status).toBe(404);
    expect((await s2.agent.post(`/api/complaints/${cid}/messages`).send({ message: 'hi there' })).status).toBe(404);
    expect((await s2.agent.patch(`/api/complaints/${cid}`).send({ status: 'resolved' })).status).toBe(403);
    expect((await s1.agent.get(`/api/complaints/${cid}/attachment`)).status).toBe(200);
  });
  test('admin lifecycle, internal notes hidden from student, history recorded', async () => {
    expect((await admin.agent.patch(`/api/complaints/${cid}`).send({ status: 'under_review', priority: 'high', assignedTo: 'Maintenance', message: 'Looking into it' })).status).toBe(200);
    await admin.agent.post(`/api/complaints/${cid}/messages`).send({ message: 'SECRET internal remark', internal: true });
    await admin.agent.post(`/api/complaints/${cid}/messages`).send({ message: 'We will fix it soon' });
    await admin.agent.patch(`/api/complaints/${cid}`).send({ status: 'in_progress' });

    const stu = await s1.agent.get(`/api/complaints/${cid}`);
    const text = JSON.stringify(stu.body);
    expect(text).not.toMatch(/SECRET internal/);
    expect(text).not.toMatch(/Maintenance/); // assignment is internal
    expect(stu.body.data.history.some((x) => x.type === 'status_change' && x.toStatus === 'under_review')).toBe(true);
    expect(stu.body.data.history.some((x) => x.message === 'We will fix it soon')).toBe(true);
    const adm = await admin.agent.get(`/api/complaints/${cid}`);
    expect(JSON.stringify(adm.body)).toMatch(/SECRET internal/);
    expect(adm.body.data.complaint.priority).toBe('high');
  });
  test('student cannot post internal notes or change status; can follow up', async () => {
    expect((await s1.agent.patch(`/api/complaints/${cid}`).send({ status: 'resolved' })).status).toBe(403);
    expect((await s1.agent.post(`/api/complaints/${cid}/messages`).send({ message: 'any update?', internal: true })).status).toBe(403);
    expect((await s1.agent.post(`/api/complaints/${cid}/messages`).send({ message: 'Any update please?' })).status).toBe(201);
  });
  test('resolve, no follow-up while resolved, reopen', async () => {
    await admin.agent.patch(`/api/complaints/${cid}`).send({ status: 'resolved', message: 'Fan replaced' });
    expect((await s1.agent.post(`/api/complaints/${cid}/messages`).send({ message: 'thanks!!' })).status).toBe(400);
    expect((await s2.agent.post(`/api/complaints/${cid}/reopen`).send({ message: 'not mine' })).status).toBe(404);
    expect((await s1.agent.post(`/api/complaints/${cid}/reopen`).send({ message: '' })).status).toBe(400);
    const re = await s1.agent.post(`/api/complaints/${cid}/reopen`).send({ message: 'It broke again yesterday' });
    expect(re.status).toBe(200);
    expect(re.body.data.status).toBe('under_review');
    expect((await s1.agent.post(`/api/complaints/${cid}/reopen`).send({ message: 'again again' })).status).toBe(400);
  });
  test('admin list filters', async () => {
    expect((await admin.agent.get('/api/complaints?status=under_review')).body.data).toHaveLength(1);
    expect((await admin.agent.get('/api/complaints?priority=low')).body.data).toHaveLength(0);
    expect((await admin.agent.get('/api/complaints?q=fan')).body.data).toHaveLength(1);
    expect((await Complaint.countDocuments())).toBe(1);
  });
});

describe('Clubs', () => {
  let club;
  const cbody = { name: 'Chess Club', description: 'A club for chess lovers and players.', category: 'Sports', coordinator: 'Prof. X', activities: 'Weekly games, Tournaments' };
  test('only admins manage clubs; activities parsed', async () => {
    expect((await s1.agent.post('/api/clubs').send(cbody)).status).toBe(403);
    const res = await admin.agent.post('/api/clubs').send(cbody);
    expect(res.status).toBe(201);
    expect(res.body.data.activities).toEqual(['Weekly games', 'Tournaments']);
    club = res.body.data;
    expect((await admin.agent.post('/api/clubs').send(cbody)).status).toBe(409); // duplicate name
  });
  test('membership request, duplicate prevention, approval, withdraw and re-apply', async () => {
    const j = await s1.agent.post(`/api/clubs/${club._id}/join`).send({ message: 'Hi' });
    expect(j.status).toBe(201);
    expect(j.body.data.status).toBe('pending');
    expect((await s1.agent.post(`/api/clubs/${club._id}/join`).send({})).status).toBe(409);
    expect((await s1.agent.get('/api/clubs')).body.data[0].membershipStatus).toBe('pending');

    expect((await s1.agent.patch(`/api/clubs/memberships/${j.body.data._id}`).send({ status: 'approved' })).status).toBe(403);
    const reqs = await admin.agent.get('/api/clubs/memberships?status=pending');
    expect(reqs.body.data).toHaveLength(1);
    expect((await admin.agent.patch(`/api/clubs/memberships/${j.body.data._id}`).send({ status: 'approved' })).status).toBe(200);
    expect((await s1.agent.post(`/api/clubs/${club._id}/join`).send({})).status).toBe(409); // already member
    expect((await s1.agent.get('/api/clubs/memberships/mine')).body.data[0].status).toBe('approved');

    expect((await s1.agent.delete(`/api/clubs/${club._id}/join`)).status).toBe(200);
    expect((await s1.agent.delete(`/api/clubs/${club._id}/join`)).status).toBe(404);
    expect((await s1.agent.post(`/api/clubs/${club._id}/join`).send({})).status).toBe(201); // re-apply
  });
  test('capacity enforced and inactive clubs hidden/closed', async () => {
    const small = (await admin.agent.post('/api/clubs').send({ ...cbody, name: 'Tiny Club', capacity: 1 })).body.data;
    const m1 = await s1.agent.post(`/api/clubs/${small._id}/join`).send({});
    const m2 = await s2.agent.post(`/api/clubs/${small._id}/join`).send({});
    expect((await admin.agent.patch(`/api/clubs/memberships/${m1.body.data._id}`).send({ status: 'approved' })).status).toBe(200);
    expect((await admin.agent.patch(`/api/clubs/memberships/${m2.body.data._id}`).send({ status: 'approved' })).status).toBe(409);
    await admin.agent.put(`/api/clubs/${small._id}`).send({ active: false });
    expect((await s2.agent.get('/api/clubs')).body.data.some((c) => c._id === small._id)).toBe(false);
    expect((await s2.agent.get(`/api/clubs/${small._id}`)).status).toBe(404);
    expect(await Club.countDocuments()).toBe(2);
  });
});

describe('Dashboards', () => {
  test('student dashboard & admin stats come from the database', async () => {
    const d = await s1.agent.get('/api/dashboard');
    expect(d.status).toBe(200);
    expect(d.body.data.stats).toHaveProperty('registeredEvents');
    const a = await admin.agent.get('/api/admin/stats');
    expect(a.status).toBe(200);
    expect(a.body.data.counts.students).toBe(2);
    expect(a.body.data.counts.activeClubs).toBe(1);
  });
  test('admin user management: search, paginate, role not editable', async () => {
    const l = await admin.agent.get('/api/admin/users?q=Test&limit=1');
    expect(l.body.meta.limit).toBe(1);
    expect(l.body.meta.total).toBe(2);
    const u = l.body.data[0];
    const upd = await admin.agent.patch(`/api/admin/users/${u._id}`).send({ role: 'admin', name: 'Renamed' });
    expect(upd.body.data.role).toBe('student');
    expect(upd.body.data.name).toBe('Renamed');
    expect((await admin.agent.patch(`/api/admin/users/${admin.user._id}`).send({ active: false })).status).toBe(403);
  });
});
