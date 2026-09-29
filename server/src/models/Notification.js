import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'ORDER_REJECTED',
        'ORDER_PREPARING',
        'ORDER_READY',
        'ORDER_OUT_FOR_DELIVERY',
        'ORDER_DELIVERED',
        'ORDER_COMPLETED',
        'ORDER_CANCELLED',
        'ORDER_EXPIRED',
        'PAYMENT_COMPLETED',
        'PAYMENT_FAILED',
        'REFUND_INITIATED',
        'REFUND_COMPLETED',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    referenceType: {
      type: String,
      default: 'order',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
