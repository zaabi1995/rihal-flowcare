const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Customer } = require('../models');
const { Op } = require('sequelize');

router.use(authenticate);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: List all customers (Admin only)
 *     security:
 *       - basicAuth: []
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
 *         description: Paginated customer list
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(pageSize),
      offset,
      order: [['createdAt', 'DESC']],
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
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer details including ID image
 *     security:
 *       - basicAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Customer profile with ID image path
 *       404:
 *         description: Customer not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
