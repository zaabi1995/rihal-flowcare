const { Staff, Customer } = require('../models');
const bcrypt = require('bcryptjs');

// decode Basic Auth header and attach user to request
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const base64 = authHeader.split(' ')[1];
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const [email, password] = decoded.split(':');

  if (!email || !password) {
    return res.status(401).json({ error: 'Invalid credentials format' });
  }

  try {
    // check staff first (admin, manager, staff)
    let user = await Staff.findOne({ where: { email } });
    if (user) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Wrong password' });
      }
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
        type: 'staff',
      };
      return next();
    }

    // then check customers
    let customer = await Customer.findOne({ where: { email } });
    if (customer) {
      const valid = await bcrypt.compare(password, customer.password);
      if (!valid) {
        return res.status(401).json({ error: 'Wrong password' });
      }
      req.user = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: 'customer',
        type: 'customer',
      };
      return next();
    }

    return res.status(401).json({ error: 'User not found' });
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticate };
