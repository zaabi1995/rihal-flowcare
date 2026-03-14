const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Staff, StaffService, ServiceType } = require('../models');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

/**
 * @swagger
 * /api/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List staff members
 *     security:
 *       - basicAuth: []
 *     description: Admin sees all staff. Manager sees only their branch staff.
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
 *         description: Paginated staff with their assigned service types
 */
router.get('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const where = {};

    // managers only see their branch
    if (req.user.role === 'manager') {
      where.branchId = req.user.branchId;
    }

    // filter out admins from the list since they're not branch staff
    where.role = ['staff', 'manager'];

    const { page = 1, pageSize = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Staff.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: ServiceType, as: 'serviceTypes', attributes: ['id', 'name'], through: { attributes: [] } }],
      limit: parseInt(pageSize),
      offset,
    });

    res.json({
      results: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/staff/{id}/services:
 *   post:
 *     tags: [Staff]
 *     summary: Assign staff to service types
 *     security:
 *       - basicAuth: []
 *     description: Replaces existing assignments. Manager can only assign within their branch.
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
 *             required: [serviceTypeIds]
 *             properties:
 *               serviceTypeIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Staff updated with new service assignments
 */
router.post('/:id/services', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const staff = await Staff.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // manager can only assign within their branch
    if (req.user.role === 'manager' && staff.branchId !== req.user.branchId) {
      return res.status(403).json({ error: 'Cannot assign staff from another branch' });
    }

    const { serviceTypeIds } = req.body;
    if (!serviceTypeIds || !Array.isArray(serviceTypeIds)) {
      return res.status(400).json({ error: 'serviceTypeIds array is required' });
    }

    // remove existing assignments and create new ones
    await StaffService.destroy({ where: { staffId: staff.id } });

    const assignments = serviceTypeIds.map(stId => ({
      staffId: staff.id,
      serviceTypeId: stId,
    }));

    await StaffService.bulkCreate(assignments);

    await logAudit({
      action: 'staff_services_assigned',
      actorId: req.user.id,
      actorRole: req.user.role,
      targetType: 'staff',
      targetId: staff.id,
      branchId: staff.branchId,
      metadata: { serviceTypeIds },
    });

    // return the updated staff with services
    const updated = await Staff.findByPk(staff.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: ServiceType, as: 'serviceTypes', attributes: ['id', 'name'], through: { attributes: [] } }],
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
