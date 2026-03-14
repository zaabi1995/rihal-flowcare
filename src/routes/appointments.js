const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { uploadAttachmentOptional } = require('../middleware/upload');
const appointmentService = require('../services/appointmentService');

// all routes need auth
router.use(authenticate);

// POST /api/appointments - book an appointment (customer only)
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

// GET /api/appointments - list (scoped by role)
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

// GET /api/appointments/:id - single appointment
router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointment(req.params.id, req.user);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id - cancel (customer cancels own)
router.delete('/:id', requireRole('customer', 'admin'), async (req, res, next) => {
  try {
    const result = await appointmentService.cancelAppointment(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id - reschedule to different slot
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

// PATCH /api/appointments/:id/status - update status (staff/manager/admin)
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
