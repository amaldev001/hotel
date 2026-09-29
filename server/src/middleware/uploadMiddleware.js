import multer from 'multer';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const storage = multer.memoryStorage();

const maxSizeBytes = (env.MAX_FILE_SIZE_MB || 2) * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
  },
  fileFilter: (_req, file, cb) => {
    // Explicitly reject SVG
    if (file.mimetype === 'image/svg+xml' || file.originalname.endsWith('.svg')) {
      return cb(new AppError('SVG image format is strictly forbidden', 400, 'INVALID_FILE_TYPE'));
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400, 'INVALID_FILE_TYPE'));
    }

    cb(null, true);
  },
});

export const singleImageUpload = (fieldName = 'image') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(`File size exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_MB || 2} MB`, 400, 'FILE_TOO_LARGE'));
        }
        return next(err);
      }
      if (!req.file) {
        return next(new AppError('Image file is required', 400, 'INVALID_INPUT'));
      }
      next();
    });
  };
};

export default singleImageUpload;
