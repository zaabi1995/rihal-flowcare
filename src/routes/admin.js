const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { cleanupExpiredSlots } = require('../services/cleanupService');
const config = require('../config/config');

router.use(authenticate);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/admin/soft-delete-retention:
 *   post:
 *     tags: [Admin]
 *     summary: Configure soft-delete retention period
 *     security:
 *       - basicAuth: []
 *     description: Sets how many days soft-deleted slots are kept before hard-delete cleanup.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [days]
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 example: 30
 *     responses:
 *       200:
 *         description: Retention period updated
 */
router.post('/soft-delete-retention', async (req, res, next) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) {
      return res.status(400).json({ error: 'days must be a positive number' });
    }

    // update the runtime config (resets on restart, but good enough for now)
    config.softDeleteRetentionDays = parseInt(days);

    res.json({
      message: `Retention period set to ${days} days`,
      retentionDays: config.softDeleteRetentionDays,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/admin/cleanup:
 *   post:
 *     tags: [Admin]
 *     summary: Manually trigger hard-delete cleanup
 *     security:
 *       - basicAuth: []
 *     description: Hard-deletes soft-deleted slots past retention period. Cascades to related appointments. Audit logs are preserved.
 *     responses:
 *       200:
 *         description: Cleanup results (slots and appointments deleted)
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const result = await cleanupExpiredSlots(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
