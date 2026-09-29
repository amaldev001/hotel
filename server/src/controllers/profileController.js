import User from '../models/User.js';
import Address from '../models/Address.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * @desc    Update profile info (name, phone)
 * @route   PUT /api/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * @desc    Get customer saved addresses
 * @route   GET /api/profile/addresses
 * @access  Private (Customer)
 */
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ customerId: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: addresses,
  });
});

/**
 * @desc    Add new customer address (Max 5)
 * @route   POST /api/profile/addresses
 * @access  Private (Customer)
 */
export const createAddress = asyncHandler(async (req, res, next) => {
  const count = await Address.countDocuments({ customerId: req.user._id });
  if (count >= 5) {
    return next(new AppError('Maximum of 5 saved addresses allowed per customer', 400, 'MAX_ADDRESSES_REACHED'));
  }

  const address = await Address.create({
    ...req.body,
    customerId: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: address,
  });
});

/**
 * @desc    Update customer address
 * @route   PUT /api/profile/addresses/:id
 * @access  Private (Customer)
 */
export const updateAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOne({ _id: req.params.id, customerId: req.user._id });
  if (!address) {
    return next(new AppError('Address not found or does not belong to you', 404, 'NOT_FOUND'));
  }

  Object.assign(address, req.body);
  await address.save();

  res.status(200).json({
    success: true,
    data: address,
  });
});

/**
 * @desc    Delete customer address
 * @route   DELETE /api/profile/addresses/:id
 * @access  Private (Customer)
 */
export const deleteAddress = asyncHandler(async (req, res, next) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, customerId: req.user._id });
  if (!address) {
    return next(new AppError('Address not found or does not belong to you', 404, 'NOT_FOUND'));
  }

  res.status(200).json({
    success: true,
    data: { message: 'Address deleted successfully' },
  });
});
