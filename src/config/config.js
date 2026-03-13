require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'flowcare',
    user: process.env.DB_USER || 'flowcare',
    password: process.env.DB_PASSWORD || 'flowcare123',
  },
  // how long soft-deleted records stick around before cleanup
  softDeleteRetentionDays: parseInt(process.env.SOFT_DELETE_RETENTION_DAYS) || 30,
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    idMinSize: 2 * 1024 * 1024, // 2MB min for ID images
    dest: 'uploads/',
  },
};
