require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const { cleanupExpiredSlots } = require('./services/cleanupService');

// routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const slotRoutes = require('./routes/slots');
const staffRoutes = require('./routes/staff');
const customerRoutes = require('./routes/customers');
const auditLogRoutes = require('./routes/auditLogs');
const adminRoutes = require('./routes/admin');

const app = express();

// global rate limit — 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, slow down' },
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// mount routes
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/admin', adminRoutes);

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// run cleanup every day at 2am
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled cleanup...');
  try {
    const result = await cleanupExpiredSlots();
    console.log('Cleanup result:', result);
  } catch (err) {
    console.error('Cleanup cron failed:', err.message);
  }
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // sync models (creates tables if they dont exist)
    await sequelize.sync();
    console.log('Tables synced');

    app.listen(config.port, () => {
      console.log(`FlowCare API running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
