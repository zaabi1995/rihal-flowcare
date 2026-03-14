const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { uploadAttachmentOptional } = require('../middleware/upload');
const appointmentService = require('../services/appointmentService');

// all routes need auth
router.use(authenticate);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Book an appointment
 *     security:
 *       - basicAuth: []
 *     description: Customer books a slot. Optional file attachment allowed.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [slotId]
 *             properties:
 *               slotId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               attachment:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Appointment booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Missing slotId or slot already booked
 */
router.post('/', requireRole('customer'), uploadAttachmentOptional, async (req, res, next) => {
  try {
    const { slotId, notes } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const appointment = await appointmentService.bookAppointment({
      customerId: req.user.id,
      slotId,
      notes,
      attachment: req.file ? req.file.path : null,
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: List appointments (role-scoped)
 *     security:
 *       - basicAuth: []
 *     description: Admin sees all, manager sees branch, staff sees assigned, customer sees own.
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
 *         description: Paginated appointments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, search } = req.query;
    const result = await appointmentService.listAppointments({
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
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment details
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Appointment details with slot, branch, service, and staff
 */
router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointment(req.params.id, req.user);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     tags: [Appointments]
 *     summary: Cancel an appointment
 *     security:
 *       - basicAuth: []
 *     description: Customer can cancel own appointment. Admin can cancel any.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Appointment cancelled, slot freed
 */
router.delete('/:id', requireRole('customer', 'admin'), async (req, res, next) => {
  try {
    const result = await appointmentService.cancelAppointment(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     tags: [Appointments]
 *     summary: Reschedule to a different slot
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slotId]
 *             properties:
 *               slotId:
 *                 type: string
 *                 format: uuid
 *                 description: New slot to reschedule to
 *     responses:
 *       200:
 *         description: Appointment rescheduled
 */
router.put('/:id', requireRole('customer', 'admin'), async (req, res, next) => {
  try {
    const { slotId } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'New slotId is required for rescheduling' });
    }

    const appointment = await appointmentService.rescheduleAppointment(
      req.params.id,
      { slotId },
      req.user
    );
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Update appointment status
 *     security:
 *       - basicAuth: []
 *     description: Staff/manager/admin can update status (checked-in, no-show, completed).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [checked-in, no-show, completed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', requireRole('staff', 'manager', 'admin'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const appointment = await appointmentService.updateStatus(
      req.params.id,
      { status, notes },
      req.user
    );
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
