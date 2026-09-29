import mongoose from 'mongoose';

const operatingHourSchema = new mongoose.Schema(
  {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '22:00' },
    isOpen: { type: Boolean, default: true },
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: null,
    },
    banner: {
      type: String,
      default: null,
    },
    cuisineCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CuisineTag',
      },
    ],
    contact: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    address: {
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    servicePostalCodes: [
      {
        type: String,
        trim: true,
      },
    ],
    operatingHours: {
      monday: { type: operatingHourSchema, default: () => ({}) },
      tuesday: { type: operatingHourSchema, default: () => ({}) },
      wednesday: { type: operatingHourSchema, default: () => ({}) },
      thursday: { type: operatingHourSchema, default: () => ({}) },
      friday: { type: operatingHourSchema, default: () => ({}) },
      saturday: { type: operatingHourSchema, default: () => ({}) },
      sunday: { type: operatingHourSchema, default: () => ({}) },
    },
    acceptingOrders: {
      type: Boolean,
      default: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'deliveryFee must be an integer minor unit',
      },
    },
    minOrderAmount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'minOrderAmount must be an integer minor unit',
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

restaurantSchema.index({ status: 1 });

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;
