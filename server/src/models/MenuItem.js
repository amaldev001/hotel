import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuCategory',
      required: true,
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
    price: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'price must be an integer minor unit',
      },
    },
    image: {
      type: String,
      default: null,
    },
    diet: {
      type: String,
      enum: ['veg', 'non_veg'],
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number,
      default: 15,
      validate: {
        validator: Number.isInteger,
        message: 'preparationTime must be an integer (minutes)',
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

menuItemSchema.index({ restaurantId: 1 });
menuItemSchema.index({ categoryId: 1 });
menuItemSchema.index({ restaurantId: 1, isAvailable: 1, isDeleted: 1 });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
