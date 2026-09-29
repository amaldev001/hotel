import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true },
    unitPrice: {
      type: Number,
      required: true,
      validate: { validator: Number.isInteger, message: 'unitPrice must be integer' },
    },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    lineTotal: {
      type: Number,
      required: true,
      validate: { validator: Number.isInteger, message: 'lineTotal must be integer' },
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    byRole: {
      type: String,
      enum: ['system', 'customer', 'restaurant', 'admin'],
      required: true,
    },
    reason: { type: String, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    orderType: {
      type: String,
      enum: ['delivery', 'pickup'],
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    restaurantSnapshot: {
      name: { type: String, required: true },
    },
    items: [orderItemSchema],
    deliveryAddress: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      landmark: String,
    },
    pricing: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, required: true },
      taxPercent: { type: Number, required: true },
      tax: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'pay_at_pickup'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUND_PENDING', 'REFUNDED'],
      default: 'PENDING',
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    status: {
      type: String,
      default: 'PAYMENT_PENDING',
      required: true,
    },
    statusHistory: [statusHistorySchema],
    note: {
      type: String,
      maxlength: 200,
      default: '',
    },
    cancelReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    // Allow createdAt to be overridden in tests (Mongoose 8 default is immutable)
    strict: false,
  }
);

// Override createdAt immutability so expiry job tests can backdate orders
orderSchema.path('createdAt').immutable(false);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ status: 1, createdAt: 1 });

export const Order = mongoose.model('Order', orderSchema);
export default Order;
