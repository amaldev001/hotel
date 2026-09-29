import defaultStorageProvider from '../providers/storageProvider.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Upload image asset (magic byte check, size <= 2 MB)
 * @route   POST /api/uploads/image
 * @access  Private (Restaurant Owner, Admin)
 */
export const uploadImage = asyncHandler(async (req, res, next) => {
  const file = req.file;
  if (!file) {
    return next(new AppError('No image file uploaded', 400, 'INVALID_INPUT'));
  }

  try {
    const relativeUrl = await defaultStorageProvider.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    res.status(201).json({
      success: true,
      data: {
        url: relativeUrl,
      },
    });
  } catch (error) {
    if (error.message === 'INVALID_FILE_TYPE') {
      return next(new AppError('Invalid image file content signature. Only JPEG, PNG, and WebP are allowed.', 400, 'INVALID_FILE_TYPE'));
    }
    next(error);
  }
});
