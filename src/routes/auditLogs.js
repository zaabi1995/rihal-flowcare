const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const auditService = require('../services/auditService');

router.use(authenticate);
router.use(requireRole('admin', 'manager'));

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: List audit logs
 *     security:
 *       - basicAuth: []
 *     description: Admin sees all logs. Manager sees only their branch logs.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated audit logs with JSONB metadata
 */
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

/**
 * @swagger
 * /api/audit-logs/export:
 *   post:
 *     tags: [Audit Logs]
 *     summary: Export audit logs as CSV
 *     security:
 *       - basicAuth: []
 *     description: Admin-only. Downloads all audit logs as a CSV file for compliance reporting.
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
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
