const multer = require('multer');
const path = require('path');
const config = require('../config/config');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dest);
  },
  filename: (req, file, cb) => {
    // prefix with timestamp to avoid collisions
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1000)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// only images for ID uploads
const idImageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed for ID'), false);
  }
};

// images + PDF for appointment attachments
const attachmentFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'), false);
  }
};

const uploadIdImage = multer({
  storage,
  fileFilter: idImageFilter,
  limits: { fileSize: config.upload.maxSize },
}).single('idImage');

const uploadAttachment = multer({
  storage,
  fileFilter: attachmentFilter,
  limits: { fileSize: config.upload.maxSize },
}).single('attachment');

// wrapper that checks minimum file size for ID images (2MB)
function uploadIdWithValidation(req, res, next) {
  uploadIdImage(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'ID image must be under 5MB' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'ID image is required (2-5MB, JPEG or PNG)' });
    }

    if (req.file.size < config.upload.idMinSize) {
      return res.status(400).json({ error: 'ID image must be at least 2MB' });
    }

    next();
  });
}

function uploadAttachmentOptional(req, res, next) {
  uploadAttachment(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Attachment must be under 5MB' });
      }
      return res.status(400).json({ error: err.message });
    }
    // attachment is optional, so no check for missing file
    next();
  });
}

module.exports = { uploadIdWithValidation, uploadAttachmentOptional };
