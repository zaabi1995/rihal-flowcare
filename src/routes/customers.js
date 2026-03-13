const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Customer } = require('../models');
const { Op } = require('sequelize');

router.use(authenticate);
router.use(requireRole('admin'));

// GET /api/customers — admin only
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

// GET /api/customers/:id — with ID image path
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
