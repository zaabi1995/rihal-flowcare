const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { cleanupExpiredSlots } = require('../services/cleanupService');
const config = require('../config/config');

router.use(authenticate);
router.use(requireRole('admin'));

// POST /api/admin/soft-delete-retention - configure retention days
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

// POST /api/admin/cleanup - manually trigger cleanup
router.post('/cleanup', async (req, res, next) => {
  try {
    const result = await cleanupExpiredSlots(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
