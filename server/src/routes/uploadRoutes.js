import express from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { singleImageUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post(
  '/image',
  protect,
  restrictTo('restaurant', 'admin'),
  singleImageUpload('image'),
  uploadImage
);

export default router;
