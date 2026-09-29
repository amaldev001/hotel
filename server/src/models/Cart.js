import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer between 1 and 20',
      },
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    items: {
      type: [cartItemSchema],
      validate: [
        (val) => val.length <= 30,
        'Cart cannot exceed 30 line items',
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
