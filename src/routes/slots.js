const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const slotService = require('../services/slotService');

router.use(authenticate);

// GET /api/slots — list slots (manager/admin)
router.get('/', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { includeDeleted, page, pageSize, search } = req.query;
    const result = await slotService.listSlots({
      user: req.user,
      includeDeleted: includeDeleted === 'true',
      page: page || 1,
      pageSize: pageSize || 20,
      search,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/slots — create slot(s) (manager/admin)
router.post('/', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const data = req.body;

    // basic validation
    const slots = Array.isArray(data) ? data : [data];
    for (const s of slots) {
      if (!s.branchId || !s.serviceTypeId || !s.date || !s.startTime || !s.endTime) {
        return res.status(400).json({
          error: 'Each slot needs branchId, serviceTypeId, date, startTime, and endTime'
        });
      }
    }

    const result = await slotService.createSlot(data, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/slots/:id — update slot
router.put('/:id', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const slot = await slotService.updateSlot(req.params.id, req.body, req.user);
    res.json(slot);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/slots/:id — soft delete
router.delete('/:id', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const result = await slotService.softDeleteSlot(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
