const router = require('express').Router();
const { Branch, ServiceType, Slot, Staff } = require('../models');
const { getAvailableSlots } = require('../services/slotService');

/**
 * @swagger
 * /api/branches:
 *   get:
 *     tags: [Public]
 *     summary: List all branches
 *     responses:
 *       200:
 *         description: Array of branches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Branch'
 */
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

/**
 * @swagger
 * /api/branches/{id}/services:
 *   get:
 *     tags: [Public]
 *     summary: List services for a branch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Array of service types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceType'
 */
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

/**
 * @swagger
 * /api/slots/available:
 *   get:
 *     tags: [Public]
 *     summary: Find available slots
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: serviceTypeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-03-20'
 *     responses:
 *       200:
 *         description: Array of available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Slot'
 *       400:
 *         description: Missing required parameters
 */
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
