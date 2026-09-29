import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    providerOrderId: {
      type: String,
      default: null,
    },
    providerPaymentId: {
      type: String,
    },
    providerEventId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      validate: { validator: Number.isInteger, message: 'amount must be integer minor unit' },
    },
    currency: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUND_PENDING', 'REFUNDED'],
      default: 'PENDING',
      required: true,
    },
    refundId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ providerEventId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ orderId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
