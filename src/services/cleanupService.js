const { Slot } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../middleware/audit');
const config = require('../config/config');

// hard-delete soft-deleted slots that passed the retention period
async function cleanupExpiredSlots(actorId) {
  const retentionDays = config.softDeleteRetentionDays;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const expired = await Slot.findAll({
    where: {
      deletedAt: {
        [Op.ne]: null,
        [Op.lt]: cutoff,
      },
    },
  });

  if (expired.length === 0) {
    return { deleted: 0, message: 'No expired records to clean up' };
  }

  const ids = expired.map(s => s.id);

  // actually remove them from the database
  await Slot.destroy({
    where: { id: { [Op.in]: ids } },
  });

  // log the hard delete
  for (const slot of expired) {
    await logAudit({
      action: 'slot_hard_deleted',
      actorId: actorId || 'system',
      actorRole: actorId ? 'admin' : 'system',
      targetType: 'slot',
      targetId: slot.id,
      branchId: slot.branchId,
      metadata: { deletedAt: slot.deletedAt, date: slot.date },
    });
  }

  // console.log(`Cleaned up ${ids.length} expired slots`);
  return { deleted: ids.length, message: `Removed ${ids.length} expired slot(s)` };
}

module.exports = { cleanupExpiredSlots };
