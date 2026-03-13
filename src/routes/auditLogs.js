const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const auditService = require('../services/auditService');

router.use(authenticate);
router.use(requireRole('admin', 'manager'));

// GET /api/audit-logs — list audit logs
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, search } = req.query;
    const result = await auditService.getAuditLogs({
      user: req.user,
      page: page || 1,
      pageSize: pageSize || 20,
      search,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/audit-logs/export — CSV export (admin only)
router.post('/export', requireRole('admin'), async (req, res, next) => {
  try {
    const csv = await auditService.exportAuditCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
