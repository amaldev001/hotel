import express from 'express';
import {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/profileController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { updateProfileSchema, addressSchema, addressIdParamsSchema } from '../validators/profileValidator.js';

const router = express.Router();

router.use(protect);

router.get('/', getProfile);
router.put('/', validate({ body: updateProfileSchema }), updateProfile);

router.get('/addresses', restrictTo('customer'), getAddresses);
router.post('/addresses', restrictTo('customer'), validate({ body: addressSchema }), createAddress);
router.put(
  '/addresses/:id',
  restrictTo('customer'),
  validate({ params: addressIdParamsSchema, body: addressSchema.partial() }),
  updateAddress
);
router.delete('/addresses/:id', restrictTo('customer'), validate({ params: addressIdParamsSchema }), deleteAddress);

export default router;
