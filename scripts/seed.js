/* Development seed data. Safe to re-run: it WIPES the collections and recreates demo data.
 * Refuses to run in production unless SEED_FORCE=true.
 * Demo credentials (development only):
 *   admin@campusconnect.edu / Admin@12345
 *   student@campusconnect.edu / Student@123  (and other students with the same password)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const config = require('../server/config');
const M = {
  User: require('../server/models/User'), Event: require('../server/models/Event'), EventRegistration: require('../server/models/EventRegistration'),
  Resource: require('../server/models/Resource'), Announcement: require('../server/models/Announcement'), LostFoundItem: require('../server/models/LostFoundItem'),
  Complaint: require('../server/models/Complaint'), ComplaintUpdate: require('../server/models/ComplaintUpdate'), Club: require('../server/models/Club'),
  ClubMembership: require('../server/models/ClubMembership'), ActivityLog: require('../server/models/ActivityLog'),
};
const fs = require('fs');
const path = require('path');

const day = 864e5;
const at = (days, hour = 10) => { const d = new Date(Date.now() + days * day); d.setHours(hour, 0, 0, 0); return d; };

// A minimal valid PDF so seeded resources are really downloadable.
const pdf = (title) => Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 72>>stream
BT /F1 20 Tf 72 700 Td (${title.replace(/[()\\]/g, '')}) Tj ET
BT /F1 12 Tf 72 670 Td (Campus Connect demo resource) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`);

(async () => {
  if (config.isProd && process.env.SEED_FORCE !== 'true') throw new Error('Refusing to seed in production (set SEED_FORCE=true to override)');
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(M).map((m) => m.init()));
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const adminPw = await M.User.hash('Admin@12345');
  const studentPw = await M.User.hash('Student@123');
  const admin = await M.User.create({ name: 'Dr. Meera Iyer', email: 'admin@campusconnect.edu', password: adminPw, role: 'admin', phone: '+91 98765 00001' });
  const s = await M.User.insertMany([
    ['Aarav Sharma', 'student@campusconnect.edu', 'CS2021001', 'Computer Science', 'B.Tech', 3],
    ['Priya Nair', 'priya.nair@campusconnect.edu', 'CS2022014', 'Computer Science', 'B.Tech', 2],
    ['Rohan Mehta', 'rohan.mehta@campusconnect.edu', 'ME2020033', 'Mechanical', 'B.Tech', 4],
    ['Sneha Kulkarni', 'sneha.k@campusconnect.edu', 'EC2021027', 'Electronics', 'B.Tech', 3],
    ['Imran Qureshi', 'imran.q@campusconnect.edu', 'BA2023008', 'Business Administration', 'BBA', 1],
    ['Ananya Das', 'ananya.das@campusconnect.edu', 'IT2022040', 'Information Technology', 'B.Tech', 2],
  ].map(([name, email, studentId, department, course, year]) => ({ name, email, studentId, department, course, year, password: studentPw, role: 'student' })));
  const [aarav, priya, rohan, sneha, imran, ananya] = s;

  const events = await M.Event.insertMany([
    { title: 'CodeSprint 2026 — 24-hour Hackathon', category: 'Technical', venue: 'Innovation Lab, Block C', organizer: 'Coding Club', startAt: at(9, 9), endAt: at(10, 9), registrationDeadline: at(7), capacity: 60, description: 'Team up with up to three friends and build a working prototype in 24 hours. Themes: campus sustainability, student wellbeing and open data. Mentors from industry will be available throughout. Food and refreshments provided.' },
    { title: 'Resume & LinkedIn Workshop', category: 'Career', venue: 'Seminar Hall 2', organizer: 'Training & Placement Cell', startAt: at(4, 14), endAt: at(4, 17), registrationDeadline: at(3), capacity: 100, description: 'A practical session on building an ATS-friendly resume, writing a strong LinkedIn headline and preparing for campus recruitment drives. Bring your current resume for live feedback.' },
    { title: 'Inter-Department Football League', category: 'Sports', venue: 'Main Ground', organizer: 'Sports Committee', startAt: at(14, 16), endAt: at(14, 19), registrationDeadline: at(10), capacity: 0, description: 'Knockout tournament open to all departments. Each department may field one team of 11 plus 5 substitutes. Fixtures will be announced after the registration deadline.' },
    { title: 'Annual Cultural Fest — Rangotsav', category: 'Cultural', venue: 'Open Air Theatre', organizer: 'Cultural Committee', startAt: at(25, 17), endAt: at(25, 22), registrationDeadline: at(20), capacity: 400, description: 'An evening of music, dance, theatre and food stalls. Register to perform or attend. Performers should submit their item details to the committee by the registration deadline.' },
    { title: 'Intro to Machine Learning with Python', category: 'Workshop', venue: 'Computer Lab 3', organizer: 'AI & Data Science Society', startAt: at(6, 10), endAt: at(6, 16), registrationDeadline: at(5), capacity: 3, description: 'Hands-on workshop covering regression, classification and model evaluation using scikit-learn. Laptop required. Very limited seats.' },
    { title: 'Guest Lecture: Careers in Cybersecurity', category: 'Seminar', venue: 'Auditorium', organizer: 'Department of Computer Science', startAt: at(-12, 11), endAt: at(-12, 13), registrationDeadline: at(-14), capacity: 200, description: 'An industry expert spoke about starting a career in security operations, ethical hacking and compliance.' },
    { title: 'Blood Donation Camp', category: 'Social', venue: 'Health Centre', organizer: 'NSS Unit', startAt: at(-30, 9), endAt: at(-30, 15), capacity: 0, description: 'Annual blood donation drive in association with the city Red Cross.' },
    { title: 'Startup Pitch Day (Draft)', category: 'Career', venue: 'Incubation Centre', organizer: 'E-Cell', startAt: at(40, 10), capacity: 50, status: 'draft', description: 'Draft event: student startups pitch to angel investors. Details to be finalised.' },
  ].map((e) => ({ ...e, createdBy: admin._id })));
  const regs = [[events[0], aarav], [events[0], priya], [events[1], aarav], [events[4], priya], [events[4], rohan], [events[4], sneha], [events[3], ananya], [events[5], aarav]];
  for (const [e, u] of regs) await M.EventRegistration.create({ event: e._id, user: u._id });
  for (const e of events) await M.Event.updateOne({ _id: e._id }, { registeredCount: regs.filter(([ev]) => ev._id.equals(e._id)).length });

  const resData = [
    ['Data Structures — Complete Unit Notes', 'Data Structures', 'Computer Science', 3, 'Lecture Notes', 'Unit-wise notes covering arrays, linked lists, trees, graphs and hashing with solved examples.', 'approved', admin],
    ['Operating Systems Previous Year Papers (2019–2024)', 'Operating Systems', 'Computer Science', 4, 'Question Paper', 'Six years of end-semester papers with solution hints.', 'approved', admin],
    ['DBMS Lab Manual', 'Database Management Systems', 'Information Technology', 4, 'Lab Manual', 'SQL exercises, ER diagrams and normalisation practice sets.', 'approved', admin],
    ['Thermodynamics Formula Sheet', 'Thermodynamics', 'Mechanical', 3, 'Lecture Notes', 'One-page formula sheet for quick revision before exams.', 'approved', rohan],
    ['Digital Electronics Assignment 2', 'Digital Electronics', 'Electronics', 3, 'Assignment', 'Boolean algebra and K-map problems with solutions.', 'approved', sneha],
    ['Machine Learning Cheat Sheet', 'Machine Learning', 'Computer Science', 6, 'Lecture Notes', 'Algorithms overview, when to use what, and key metrics.', 'pending', priya],
    ['Marketing Management Case Studies', 'Marketing', 'Business Administration', 2, 'Reference Book', 'Collection of case studies discussed in class.', 'pending', imran],
  ];
  for (const [title, subject, department, semester, category, description, status, by] of resData) {
    const filename = `seed-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.pdf`;
    fs.writeFileSync(path.join(config.uploadDir, filename), pdf(title));
    await M.Resource.create({ title, subject, department, semester, category, description, status, uploadedBy: by._id, reviewedBy: status === 'approved' ? admin._id : undefined, downloads: Math.floor(Math.random() * 120), file: { filename, originalName: `${title}.pdf`, size: 700, ext: 'pdf' } });
  }

  await M.Announcement.insertMany([
    { title: 'Mid-Semester Examination Schedule Released', category: 'Exam', pinned: true, important: true, body: 'The mid-semester examination timetable for all departments is now available at the examination cell. Exams begin in two weeks. Students must carry their ID cards to the examination hall. Hall tickets will be issued after clearing library dues.', publishAt: at(-2) },
    { title: 'Campus Placement Drive: Infosys & TCS', category: 'Placement', important: true, departments: ['Computer Science', 'Information Technology', 'Electronics'], body: 'Eligible final-year students of CS, IT and Electronics may register with the Training & Placement Cell by Friday. Minimum 60% aggregate is required with no active backlogs.', publishAt: at(-1) },
    { title: 'Library Timings Extended During Exams', category: 'Academic', body: 'The central library will remain open until 11 PM from Monday to Saturday during the examination period. Reading hall seats can be reserved at the help desk.', publishAt: at(-3) },
    { title: 'Holiday on Account of Founders Day', category: 'Holiday', body: 'The college will remain closed on Founders Day. Regular classes resume the next working day. Hostel mess will operate on the holiday schedule.', publishAt: at(-5), expiresAt: at(20) },
    { title: 'Mechanical Department: Workshop Safety Orientation', category: 'Academic', departments: ['Mechanical'], body: 'All second-year Mechanical students must attend the mandatory workshop safety orientation before the first lab session.', publishAt: at(-1) },
    { title: 'Scholarship Applications Open', category: 'General', body: 'Applications for merit and need-based scholarships are open. Submit documents at the administration office within 15 days.', publishAt: at(-4), pinned: true },
    { title: 'Old Notice (Expired)', category: 'General', body: 'This notice has expired and should not be visible to students.', publishAt: at(-30), expiresAt: at(-10) },
    { title: 'Upcoming Notice (Scheduled)', category: 'General', body: 'This notice is scheduled for the future.', publishAt: at(7) },
  ].map((a) => ({ ...a, author: admin._id, status: 'published' })));

  await M.LostFoundItem.insertMany([
    { type: 'lost', name: 'Black Boat Earbuds Case', description: 'Black charging case with a small scratch on the lid and a blue sticker. Lost after the algorithms lecture.', category: 'Electronics', location: 'Block B, Room 204', date: at(-2), reporter: priya._id, contactInfo: 'priya.nair@campusconnect.edu', showContact: true },
    { type: 'found', name: 'Student ID Card — Rohan M.', description: 'Found an ID card near the canteen entrance. Handed over to the security desk is possible on request.', category: 'ID / Cards', location: 'Canteen entrance', date: at(-1), reporter: aarav._id },
    { type: 'lost', name: 'Blue Water Bottle (Milton)', description: 'Dark blue steel bottle with initials "SK" engraved at the bottom.', category: 'Accessories', location: 'Library reading hall', date: at(-4), reporter: sneha._id, contactInfo: '+91 90000 11111' },
    { type: 'found', name: 'Set of Keys with Red Keychain', description: 'Three keys on a red ring with a small football keychain. Found on a bench.', category: 'Keys', location: 'Main Ground bleachers', date: at(-3), reporter: imran._id },
    { type: 'found', name: 'Scientific Calculator (Casio fx-991)', description: 'Left behind after the physics lab. Name is not written on it.', category: 'Electronics', location: 'Physics Lab', date: at(-6), reporter: rohan._id, status: 'recovered' },
    { type: 'lost', name: 'Grey Laptop Backpack', description: 'Grey backpack with a laptop sleeve and a "Wildcraft" tag. Contains notebooks.', category: 'Bags', location: 'Bus stop near Gate 2', date: at(-1), reporter: ananya._id, flagged: true, flagReason: 'Possible duplicate of an earlier report', flaggedBy: aarav._id },
  ]);

  const mkComplaint = async (student, title, category, description, status, priority, extra = {}) => {
    const c = await M.Complaint.create({ student: student._id, title, category, description, status, priority, ...extra });
    await M.ComplaintUpdate.create({ complaint: c._id, author: student._id, authorRole: 'student', type: 'created', message: 'Complaint submitted', toStatus: 'submitted' });
    return c;
  };
  const c1 = await mkComplaint(aarav, 'Wi-Fi extremely slow in Hostel Block A', 'IT / Network', 'The Wi-Fi in Hostel Block A has been very slow in the evenings for the past two weeks, making it impossible to attend online lectures or download study material.', 'in_progress', 'high', { assignedTo: 'IT Services' });
  await M.ComplaintUpdate.insertMany([
    { complaint: c1._id, author: admin._id, authorRole: 'admin', type: 'status_change', fromStatus: 'submitted', toStatus: 'under_review', message: 'We have received your complaint and are checking the access points.' },
    { complaint: c1._id, author: admin._id, authorRole: 'admin', type: 'internal_note', internal: true, message: 'Router on floor 2 is overloaded. Vendor visit scheduled Thursday. Do not promise a date to the student.' },
    { complaint: c1._id, author: admin._id, authorRole: 'admin', type: 'status_change', fromStatus: 'under_review', toStatus: 'in_progress', message: 'Additional access points are being installed this week.' },
  ]);
  const c2 = await mkComplaint(aarav, 'Water cooler not working in Block C', 'Infrastructure', 'The water cooler on the second floor of Block C has not been working for a week. Students have to walk to another block for drinking water.', 'resolved', 'medium', { resolvedAt: new Date(Date.now() - 3 * day) });
  await M.ComplaintUpdate.create({ complaint: c2._id, author: admin._id, authorRole: 'admin', type: 'status_change', fromStatus: 'submitted', toStatus: 'resolved', message: 'The cooler has been repaired. Thank you for reporting.' });
  await mkComplaint(priya, 'Library missing recent reference editions', 'Library', 'Several recommended reference books for Operating Systems are only available in older editions. Please consider procuring the latest editions.', 'submitted', 'low');
  await mkComplaint(rohan, 'Canteen hygiene concerns', 'Canteen', 'I noticed unclean utensils and inadequate hygiene practices at the canteen counter on multiple occasions this week.', 'under_review', 'high');

  const clubs = await M.Club.insertMany([
    { name: 'Coding Club', category: 'Technical', coordinator: 'Prof. R. Venkatesh', coordinatorEmail: 'venkatesh@campusconnect.edu', meetingSchedule: 'Wednesdays, 4:30 PM — Lab 2', activities: ['Weekly coding contests', 'Hackathons', 'Open-source sprints'], description: 'A community of programmers who learn together through contests, peer mentoring and project building. All skill levels welcome.' },
    { name: 'Robotics Society', category: 'Technical', coordinator: 'Dr. S. Banerjee', coordinatorEmail: 'banerjee@campusconnect.edu', meetingSchedule: 'Saturdays, 10 AM — Workshop', activities: ['Line-follower bots', 'Drone building', 'Inter-college competitions'], capacity: 40, description: 'Design, build and compete with autonomous robots. We participate in national robotics championships.' },
    { name: 'Dramatics & Theatre Club', category: 'Cultural', coordinator: 'Prof. Lata Menon', meetingSchedule: 'Tuesdays & Thursdays, 5 PM — OAT', activities: ['Street plays', 'Annual stage production', 'Improv nights'], description: 'Express yourself through acting, scriptwriting and stagecraft. We perform at the annual fest and inter-college competitions.' },
    { name: 'Photography Club', category: 'Cultural', coordinator: 'Prof. Karan Oberoi', meetingSchedule: 'Fridays, 3 PM — Studio', activities: ['Photo walks', 'Editing workshops', 'Annual exhibition'], description: 'Learn composition, lighting and editing, and showcase your work in the annual campus photo exhibition.' },
    { name: 'NSS Unit', category: 'Social Service', coordinator: 'Dr. Anita Rao', meetingSchedule: 'Sundays, 9 AM — Admin Block', activities: ['Blood donation drives', 'Village adoption', 'Tree plantation'], description: 'National Service Scheme volunteers working on community development, health camps and environmental projects.' },
    { name: 'Entrepreneurship Cell (E-Cell)', category: 'Entrepreneurship', coordinator: 'Prof. Naveen Gupta', meetingSchedule: 'Mondays, 5 PM — Incubation Centre', activities: ['Startup weekends', 'Investor talks', 'Pitch competitions'], description: 'Turn ideas into ventures. E-Cell offers mentorship, funding connections and a co-working space.' },
    { name: 'Literary Society', category: 'Literary', coordinator: 'Dr. Farah Siddiqui', meetingSchedule: 'Thursdays, 4 PM — Library Hall', activities: ['Debates', 'Poetry slams', 'Quiz nights'], description: 'For readers, writers and debaters. We host open mics, quizzes and the annual literary festival.' },
    { name: 'Chess Club (Inactive)', category: 'Sports', coordinator: 'Prof. D. Kapoor', activities: ['Weekly games'], active: false, description: 'Currently on a break while a new coordinator is appointed.' },
  ]);
  await M.ClubMembership.insertMany([
    { club: clubs[0]._id, user: aarav._id, status: 'approved', decidedBy: admin._id, decidedAt: new Date(), message: 'I love competitive programming.' },
    { club: clubs[1]._id, user: aarav._id, status: 'pending', message: 'Interested in drones.' },
    { club: clubs[0]._id, user: priya._id, status: 'pending', message: 'Keen to join hackathons.' },
    { club: clubs[2]._id, user: sneha._id, status: 'approved', decidedBy: admin._id, decidedAt: new Date() },
    { club: clubs[4]._id, user: rohan._id, status: 'rejected', decidedBy: admin._id, decidedAt: new Date() },
    { club: clubs[5]._id, user: imran._id, status: 'pending', message: 'Want to start my own venture.' },
  ]);

  await M.ActivityLog.insertMany([
    { actor: admin._id, action: 'created', entityType: 'event', summary: 'Created event "CodeSprint 2026 — 24-hour Hackathon"' },
    { actor: admin._id, action: 'created', entityType: 'announcement', summary: 'Posted announcement "Mid-Semester Examination Schedule Released"' },
    { actor: admin._id, action: 'approved', entityType: 'resource', summary: 'Approved resource "Thermodynamics Formula Sheet"' },
    { actor: admin._id, action: 'approved', entityType: 'membership', summary: 'Approved Aarav Sharma for Coding Club' },
  ]);

  console.log('Seed complete.\n  Admin:   admin@campusconnect.edu / Admin@12345\n  Student: student@campusconnect.edu / Student@123');
  await mongoose.disconnect();
})().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
