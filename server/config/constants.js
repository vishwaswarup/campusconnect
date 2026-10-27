// Single source of truth for enumerated values (used by models, validation and the UI via /api/meta).
module.exports = {
  DEPARTMENTS: [
    'Computer Science', 'Information Technology', 'Electronics', 'Mechanical',
    'Civil', 'Electrical', 'Business Administration', 'Humanities',
  ],
  COURSES: ['B.Tech', 'B.Sc', 'BCA', 'BBA', 'M.Tech', 'MCA', 'MBA'],
  YEARS: [1, 2, 3, 4, 5],
  ROLES: ['student', 'admin'],
  EVENT_CATEGORIES: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Career', 'Social'],
  EVENT_STATUS: ['draft', 'published', 'cancelled'],
  RESOURCE_CATEGORIES: ['Lecture Notes', 'Question Paper', 'Assignment', 'Lab Manual', 'Reference Book', 'Other'],
  RESOURCE_STATUS: ['pending', 'approved', 'rejected'],
  ANNOUNCEMENT_CATEGORIES: ['Academic', 'Exam', 'Placement', 'Event', 'Holiday', 'General'],
  LF_TYPES: ['lost', 'found'],
  LF_CATEGORIES: ['Electronics', 'ID / Cards', 'Books', 'Clothing', 'Accessories', 'Keys', 'Bags', 'Other'],
  LF_STATUS: ['open', 'recovered'],
  COMPLAINT_CATEGORIES: ['Academic', 'Hostel', 'Library', 'Canteen', 'Transport', 'Infrastructure', 'Harassment', 'IT / Network', 'Other'],
  COMPLAINT_STATUS: ['submitted', 'under_review', 'in_progress', 'resolved'],
  COMPLAINT_PRIORITY: ['low', 'medium', 'high', 'urgent'],
  CLUB_CATEGORIES: ['Technical', 'Cultural', 'Sports', 'Social Service', 'Literary', 'Entrepreneurship'],
  MEMBERSHIP_STATUS: ['pending', 'approved', 'rejected', 'withdrawn'],
};
