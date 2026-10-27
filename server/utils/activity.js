const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget audit trail; failure to log must never break the request.
async function logActivity(actor, action, entityType, entityId, summary) {
  try {
    await ActivityLog.create({ actor: actor?._id || actor, action, entityType, entityId, summary });
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') console.error('activity log failed:', e.message);
  }
}
module.exports = logActivity;
