const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Customer, Staff } = require('../models');
const { uploadIdWithValidation } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register - customer registration
router.post('/register', uploadIdWithValidation, async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // check if email already taken
    const existingCustomer = await Customer.findOne({ where: { email } });
    const existingStaff = await Staff.findOne({ where: { email } });
    if (existingCustomer || existingStaff) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      idImage: req.file.path,
    });

    res.status(201).json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      role: 'customer',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - basic auth login
router.post('/login', authenticate, async (req, res) => {
  // if we get here, auth middleware already validated credentials
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    branchId: req.user.branchId || null,
  });
});

module.exports = router;
