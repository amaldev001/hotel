import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import NotificationService from './notificationService.js';

/**
 * Background job to expire unpaid online orders older than 15 minutes.
 * Safe to execute concurrently across multiple server instances.
 */
export const runExpiryJob = async () => {
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - FIFTEEN_MINUTES_MS);

  try {
    // Find candidate orders
    const candidateOrders = await Order.find({
      status: 'PAYMENT_PENDING',
      createdAt: { $lt: cutoffTime },
    }).select('_id customerId restaurantId idempotencyKey');

    let expiredCount = 0;

    for (const candidate of candidateOrders) {
      const now = new Date();
      // Atomic status update prevents race condition on multi-instance setups
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: candidate._id,
          status: 'PAYMENT_PENDING',
        },
        {
          $set: {
            status: 'EXPIRED',
            paymentStatus: 'FAILED',
          },
          $push: {
            statusHistory: {
              status: 'EXPIRED',
              at: now,
              byRole: 'system',
              reason: 'Unpaid online order expired after 15 minutes',
            },
          },
        },
        { new: true }
      );

      if (updatedOrder) {
        expiredCount++;

        // Update payment record if exists
        await Payment.updateOne(
          { orderId: updatedOrder._id, status: 'PENDING' },
          { $set: { status: 'FAILED' } }
        );

        // Record Audit Log
        await AuditLog.create({
          action: 'ORDER_EXPIRED',
          actorId: updatedOrder.customerId,
          actorRole: 'system',
          targetModel: 'Order',
          targetId: updatedOrder._id,
          metadata: { reason: 'Automatic 15-minute payment window expiration' },
        });

        // Notify customer
        await NotificationService.notifyOrderEvent({
          order: updatedOrder,
          eventType: 'ORDER_EXPIRED',
          title: 'Order Expired',
          customerMessage: `Your order #${updatedOrder._id} was expired because payment was not completed within 15 minutes.`,
        });
      }
    }

    return { processed: candidateOrders.length, expiredCount };
  } catch (err) {
    console.error('Error running expiry job:', err);
    return { error: err.message };
  }
};

let jobInterval = null;

export const startExpiryJobScheduler = (intervalMs = 60000) => {
  if (jobInterval) return;
  // Run once immediately on start
  runExpiryJob();
  jobInterval = setInterval(runExpiryJob, intervalMs);
};

export const stopExpiryJobScheduler = () => {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
  }
};
