const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Customer, Staff } = require('../models');
const { uploadIdWithValidation } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer
 *     description: Requires ID image upload (2-5 MB, JPEG/PNG)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, password, idImage]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ahmed Al Balushi
 *               email:
 *                 type: string
 *                 example: ahmed@example.com
 *               password:
 *                 type: string
 *                 example: pass123
 *               phone:
 *                 type: string
 *                 example: '+968 9912 3456'
 *               idImage:
 *                 type: string
 *                 format: binary
 *                 description: ID image (2-5 MB, JPEG/PNG)
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already registered
 */
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login via Basic Authentication
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Login successful — returns user profile
 *       401:
 *         description: Invalid credentials
 */
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
