const { AuditLog } = require('../models');
const { Op } = require('sequelize');

async function getAuditLogs({ user, page = 1, pageSize = 20, search }) {
  const where = {};

  // managers can only see their branch's logs
  if (user.role === 'manager') {
    where.branchId = user.branchId;
  }

  if (search) {
    where[Op.or] = [
      { action: { [Op.iLike]: `%${search}%` } },
      { targetType: { [Op.iLike]: `%${search}%` } },
      { actorRole: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * pageSize;
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  return {
    results: rows,
    total: count,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

// generate CSV string from audit logs
async function exportAuditCSV() {
  const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']] });

  const header = 'id,action,actorId,actorRole,targetType,targetId,branchId,metadata,createdAt';
  const rows = logs.map(log => {
    const meta = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
    return `${log.id},${log.action},${log.actorId},${log.actorRole},${log.targetType},${log.targetId},${log.branchId || ''},"${meta}",${log.createdAt.toISOString()}`;
  });

  return [header, ...rows].join('\n');
}

module.exports = { getAuditLogs, exportAuditCSV };
