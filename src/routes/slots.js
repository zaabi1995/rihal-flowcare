const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const slotService = require('../services/slotService');

router.use(authenticate);

/**
 * @swagger
 * /api/slots:
 *   get:
 *     tags: [Slots]
 *     summary: List slots (Manager/Admin)
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: boolean, default: false }
 *         description: Admin can see soft-deleted slots
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
 *         description: Paginated slots
 */
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

/**
 * @swagger
 * /api/slots:
 *   post:
 *     tags: [Slots]
 *     summary: Create slot(s) — single or batch
 *     security:
 *       - basicAuth: []
 *     description: Pass a single object or array for batch creation. Conflict detection prevents double-booking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchId, serviceTypeId, date, startTime, endTime]
 *             properties:
 *               branchId:
 *                 type: string
 *                 format: uuid
 *               serviceTypeId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *                 example: '2026-03-20'
 *               startTime:
 *                 type: string
 *                 example: '09:00'
 *               endTime:
 *                 type: string
 *                 example: '09:30'
 *     responses:
 *       201:
 *         description: Slot(s) created
 *       400:
 *         description: Missing fields or time conflict
 */
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

/**
 * @swagger
 * /api/slots/{id}:
 *   put:
 *     tags: [Slots]
 *     summary: Update a slot
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Slot updated
 */
router.put('/:id', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const slot = await slotService.updateSlot(req.params.id, req.body, req.user);
    res.json(slot);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/slots/{id}:
 *   delete:
 *     tags: [Slots]
 *     summary: Soft-delete a slot
 *     security:
 *       - basicAuth: []
 *     description: Sets deletedAt timestamp. Slot is hidden from normal listings but retained for audit. Hard-deleted after retention period.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Slot soft-deleted
 */
router.delete('/:id', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const result = await slotService.softDeleteSlot(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
