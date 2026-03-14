const router = require('express').Router();
const { Branch, ServiceType, Slot, Staff } = require('../models');
const { getAvailableSlots } = require('../services/slotService');

// GET /api/branches - list all branches
router.get('/branches', async (req, res, next) => {
  try {
    const branches = await Branch.findAll({
      attributes: ['id', 'name', 'location', 'phone'],
    });
    res.json(branches);
  } catch (err) {
    next(err);
  }
});

// GET /api/branches/:id/services - services for a branch
router.get('/branches/:id/services', async (req, res, next) => {
  try {
    const services = await ServiceType.findAll({
      where: { branchId: req.params.id },
      attributes: ['id', 'name', 'description', 'durationMinutes', 'price'],
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// GET /api/slots/available - find open slots
router.get('/slots/available', async (req, res, next) => {
  try {
    const { branchId, serviceTypeId, date } = req.query;
    if (!branchId || !serviceTypeId || !date) {
      return res.status(400).json({
        error: 'branchId, serviceTypeId, and date are all required',
      });
    }

    const slots = await getAvailableSlots({ branchId, serviceTypeId, date });
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
