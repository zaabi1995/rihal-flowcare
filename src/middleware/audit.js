const { AuditLog } = require('../models');

// log an audit event - called from services, not as express middleware
async function logAudit({ action, actorId, actorRole, targetType, targetId, branchId, metadata }) {
  try {
    await AuditLog.create({
      action,
      actorId,
      actorRole,
      targetType,
      targetId,
      branchId: branchId || null,
      metadata: metadata || {},
    });
  } catch (err) {
    // don't let audit failures break the main flow
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
