const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Announcement = require('../models/Announcement');
const Resource = require('../models/Resource');
const Complaint = require('../models/Complaint');
const ComplaintUpdate = require('../models/ComplaintUpdate');
const LostFoundItem = require('../models/LostFoundItem');
const ClubMembership = require('../models/ClubMembership');
const { ok, asyncHandler } = require('../utils/helpers');

exports.student = asyncHandler(async (req, res) => {
  const u = req.user;
  const now = new Date();
  const [events, announcements, resources, memberships, complaints, lostFound, regCount, myUploads, openComplaints, myClubCount] = await Promise.all([
    Event.find({ status: 'published', startAt: { $gte: now } }).sort({ startAt: 1 }).limit(4),
    Announcement.find(Announcement.visibleTo(u)).sort({ pinned: -1, publishAt: -1 }).limit(4),
    Resource.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(4).populate('uploadedBy', 'name'),
    ClubMembership.find({ user: u._id, status: { $in: ['pending', 'approved'] } }).populate('club', 'name category').sort({ updatedAt: -1 }).limit(4),
    Complaint.find({ student: u._id }).sort({ updatedAt: -1 }).limit(4),
    LostFoundItem.find({ status: 'open' }).sort({ createdAt: -1 }).limit(4),
    EventRegistration.countDocuments({ user: u._id, status: 'registered' }),
    Resource.countDocuments({ uploadedBy: u._id }),
    Complaint.countDocuments({ student: u._id, status: { $ne: 'resolved' } }),
    ClubMembership.countDocuments({ user: u._id, status: 'approved' }),
  ]);
  const myRegs = await EventRegistration.find({ user: u._id, status: 'registered', event: { $in: events.map((e) => e._id) } }).select('event');
  const registered = new Set(myRegs.map((r) => String(r.event)));
  ok(res, {
    stats: { registeredEvents: regCount, myUploads, openComplaints, clubs: myClubCount },
    events: events.map((e) => ({ ...e.toObject(), isRegistered: registered.has(String(e._id)) })),
    announcements,
    resources,
    memberships: memberships.filter((m) => m.club),
    complaints: complaints.map((c) => ({ _id: c._id, ticketId: c.ticketId, title: c.title, status: c.status, updatedAt: c.updatedAt })),
    lostFound: lostFound.map((i) => ({ _id: i._id, type: i.type, name: i.name, location: i.location, date: i.date, hasImage: !!i.image })),
  });
});

exports.profileSummary = asyncHandler(async (req, res) => {
  const u = req.user;
  const [regs, memberships, resources, complaints] = await Promise.all([
    EventRegistration.find({ user: u._id, status: 'registered' }).populate('event', 'title startAt venue').sort({ createdAt: -1 }).limit(20),
    ClubMembership.find({ user: u._id, status: { $ne: 'withdrawn' } }).populate('club', 'name').sort({ updatedAt: -1 }),
    Resource.find({ uploadedBy: u._id }).sort({ createdAt: -1 }).limit(20).select('title status createdAt subject'),
    Complaint.find({ student: u._id }).sort({ createdAt: -1 }).limit(20).select('ticketId title status createdAt'),
  ]);
  ok(res, {
    events: regs.filter((r) => r.event).map((r) => r.event),
    memberships: memberships.filter((m) => m.club),
    resources,
    complaints,
  });
});
