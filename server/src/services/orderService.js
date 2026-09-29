import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Address from '../models/Address.js';
import Restaurant from '../models/Restaurant.js';
import AuditLog from '../models/AuditLog.js';
import CartService from './cartService.js';
import NotificationService from './notificationService.js';
import { getPaymentProvider } from '../providers/paymentProvider.js';
import { AppError } from '../utils/AppError.js';
import env from '../config/env.js';

// Valid status state machine transitions
const ALLOWED_TRANSITIONS = {
  PAYMENT_PENDING: ['PLACED', 'EXPIRED'],
  PLACED: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'], // OUT_FOR_DELIVERY only for delivery; COMPLETED for pickup
  OUT_FOR_DELIVERY: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const ACTIVE_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

export class OrderService {
  /**
   * 1. CHECKOUT: Create order from customer cart
   */
  static async checkout({ customerId, idempotencyKey, orderType, deliveryAddressId, paymentMethod, note }) {
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      throw new AppError('Idempotency-Key header is required', 400, 'IDEMPOTENCY_KEY_REQUIRED');
    }

    // 1. Idempotency-Key deduplication: Check if order already exists for this customer & key
    const existingOrder = await Order.findOne({ customerId, idempotencyKey });
    if (existingOrder) {
      let existingPaymentSession = null;
      if (existingOrder.paymentMethod === 'online' && existingOrder.status === 'PAYMENT_PENDING') {
        const payment = await Payment.findOne({ orderId: existingOrder._id });
        if (payment) {
          existingPaymentSession = {
            providerOrderId: payment.providerOrderId,
            paymentId: payment._id,
          };
        }
      }
      return {
        order: existingOrder,
        isExisting: true,
        paymentSession: existingPaymentSession,
      };
    }

    // 2. Re-run quote from current database prices
    const quote = await CartService.calculateQuote(customerId, { orderType, addressId: deliveryAddressId });
    if (!quote || !quote.lines || quote.lines.length === 0) {
      throw new AppError('Cart is empty or not orderable', 400, 'EMPTY_CART');
    }

    const restaurantId = quote.restaurantId || quote.restaurant?._id || (quote.restaurant && quote.restaurant._id);
    if (!restaurantId) {
      throw new AppError('Could not determine restaurant from cart', 400, 'EMPTY_CART');
    }
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404, 'RESTAURANT_NOT_FOUND');
    }

    const isAccepting = restaurant.acceptingOrders !== undefined ? restaurant.acceptingOrders : restaurant.isAcceptingOrders;
    if (restaurant.status !== 'ACTIVE' || !isAccepting) {
      throw new AppError('Restaurant is currently not accepting orders', 400, 'RESTAURANT_NOT_ACCEPTING');
    }

    // 3. Address verification
    let addressSnapshot = null;
    if (orderType === 'delivery') {
      if (!deliveryAddressId) {
        throw new AppError('Delivery address is required for delivery orders', 400, 'ADDRESS_REQUIRED');
      }

      const address = await Address.findOne({ _id: deliveryAddressId, customerId });
      if (!address) {
        throw new AppError('Delivery address not found or does not belong to customer', 404, 'ADDRESS_NOT_FOUND');
      }

      // Verify service area
      if (restaurant.servicePostalCodes && restaurant.servicePostalCodes.length > 0) {
        if (!restaurant.servicePostalCodes.includes(address.postalCode)) {
          throw new AppError(`Restaurant does not deliver to postal code ${address.postalCode}`, 400, 'OUT_OF_SERVICE_AREA');
        }
      }

      addressSnapshot = {
        name: address.name,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        landmark: address.landmark || '',
      };
    } else {
      // Pickup order checks
      if (paymentMethod === 'cod') {
        throw new AppError('Cash on delivery is not valid for pickup orders', 400, 'INVALID_PAYMENT_METHOD');
      }
    }

    if (orderType === 'delivery' && paymentMethod === 'pay_at_pickup') {
      throw new AppError('Pay at pickup is not valid for delivery orders', 400, 'INVALID_PAYMENT_METHOD');
    }

    // 4. Initial status determination
    const initialOrderStatus = paymentMethod === 'online' ? 'PAYMENT_PENDING' : 'PLACED';
    const initialPaymentStatus = 'PENDING';

    const orderItems = quote.lines.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    }));

    // Create Order document (Snapshot everything D5)
    const newOrder = new Order({
      customerId,
      restaurantId,
      orderType,
      idempotencyKey,
      restaurantSnapshot: {
        name: restaurant.name,
      },
      items: orderItems,
      deliveryAddress: addressSnapshot,
      pricing: {
        subtotal: quote.pricing.subtotal,
        deliveryFee: quote.pricing.deliveryFee,
        taxPercent: quote.pricing.taxPercent,
        tax: quote.pricing.tax,
        total: quote.pricing.total,
      },
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      status: initialOrderStatus,
      statusHistory: [
        {
          status: initialOrderStatus,
          at: new Date(),
          byRole: 'customer',
          reason: 'Order submitted at checkout',
        },
      ],
      note: note || '',
    });

    let paymentSession = null;
    let paymentRecord = null;

    // 5. Payment Session Creation if Online
    if (paymentMethod === 'online') {
      const provider = getPaymentProvider();
      paymentSession = await provider.createPaymentSession({
        orderId: newOrder._id.toString(),
        amount: quote.pricing.total,
        currency: env.CURRENCY,
      });

      paymentRecord = await Payment.create({
        orderId: newOrder._id,
        customerId,
        provider: env.PAYMENT_GATEWAY,
        providerOrderId: paymentSession.providerOrderId,
        amount: quote.pricing.total,
        currency: env.CURRENCY,
        status: 'PENDING',
      });

      newOrder.paymentId = paymentRecord._id;
    }

    // Save Order
    await newOrder.save();

    // Clear customer cart only AFTER order is stored
    await CartService.clearCart(customerId);

    // Send notifications
    await NotificationService.notifyOrderEvent({
      order: newOrder,
      eventType: 'ORDER_PLACED',
      title: 'Order Placed Successfully',
      customerMessage: `Your order #${newOrder._id} has been placed successfully.`,
      restaurantMessage: `New incoming order #${newOrder._id} received!`,
    });

    return {
      order: newOrder,
      isExisting: false,
      paymentSession,
    };
  }

  /**
   * 2. PAYMENTS: Handle Payment Webhook
   */
  static async handlePaymentWebhook({ rawBody, signatureHeader }) {
    const provider = getPaymentProvider();
    const eventInfo = provider.verifyWebhookSignature(rawBody, signatureHeader);

    const { eventId, eventType, providerOrderId, providerPaymentId, amount, currency, status } = eventInfo;

    // Check duplicate event idempotency
    const existingPayment = await Payment.findOne({ providerEventId: eventId });
    if (existingPayment) {
      return { success: true, duplicate: true, message: 'Event already processed' };
    }

    // Find payment by providerOrderId or payment ID
    let payment = await Payment.findOne({ providerOrderId });
    if (!payment && providerPaymentId) {
      payment = await Payment.findOne({ providerPaymentId });
    }

    let order;
    if (payment) {
      order = await Order.findById(payment.orderId);
    } else if (providerOrderId) {
      // Find order directly by ID or metadata
      order = await Order.findById(providerOrderId);
    }

    if (!order) {
      throw new AppError('Order not found for payment webhook', 404, 'ORDER_NOT_FOUND');
    }

    if (!payment) {
      payment = new Payment({
        orderId: order._id,
        customerId: order.customerId,
        provider: env.PAYMENT_GATEWAY,
        providerOrderId,
        amount: order.pricing.total,
        currency: env.CURRENCY,
      });
    }

    // Amount & currency verification - gracefully fail the payment rather than rejecting the webhook
    if (amount !== undefined && amount !== null && amount !== order.pricing.total) {
      console.error(`Webhook amount mismatch: received ${amount}, expected ${order.pricing.total}`);
      // Do not throw - record the failure gracefully so delivery platform confirms receipt
      if (!payment._id) {
        await payment.save();
      }
      payment.providerEventId = eventId;
      payment.status = 'FAILED';
      await payment.save();
      order.paymentStatus = 'FAILED';
      await order.save();
      return { success: true, orderId: order._id, status: order.status, mismatch: true };
    }

    if (currency && currency.toUpperCase() !== env.CURRENCY.toUpperCase()) {
      console.error(`Webhook currency mismatch: received ${currency}, expected ${env.CURRENCY}`);
      payment.providerEventId = eventId;
      payment.status = 'FAILED';
      await payment.save();
      order.paymentStatus = 'FAILED';
      await order.save();
      return { success: true, orderId: order._id, status: order.status, mismatch: true };
    }

    // Mark Payment completed
    payment.providerPaymentId = providerPaymentId || payment.providerPaymentId;
    payment.providerEventId = eventId;
    payment.status = status === 'COMPLETED' || eventType === 'payment_intent.succeeded' ? 'COMPLETED' : 'FAILED';
    await payment.save();

    // Advance order status from PAYMENT_PENDING -> PLACED
    if (payment.status === 'COMPLETED') {
      if (order.status === 'PAYMENT_PENDING') {
        order.status = 'PLACED';
        order.paymentStatus = 'COMPLETED';
        order.paymentId = payment._id;
        order.statusHistory.push({
          status: 'PLACED',
          at: new Date(),
          byRole: 'system',
          reason: 'Online payment confirmed via webhook',
        });
        await order.save();

        // Audit Log
        await AuditLog.create({
          action: 'PAYMENT_WEBHOOK_PROCESSED',
          actorId: order.customerId,
          actorRole: 'system',
          targetModel: 'Order',
          targetId: order._id,
          metadata: { providerEventId: eventId, providerOrderId, providerPaymentId },
        });

        // Notify
        await NotificationService.notifyOrderEvent({
          order,
          eventType: 'PAYMENT_COMPLETED',
          title: 'Payment Received',
          customerMessage: `Payment of ${order.pricing.total} minor units for order #${order._id} was confirmed.`,
          restaurantMessage: `Order #${order._id} payment completed and ready for processing!`,
        });
      }
    } else {
      order.paymentStatus = 'FAILED';
      await order.save();
    }

    return { success: true, orderId: order._id, status: order.status };
  }

  /**
   * 3. ORDER STATUS STATE MACHINE
   */
  static async transitionOrderStatus({ orderId, newStatus, user, reason }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    const currentStatus = order.status;

    // Validate if transition is valid in State Machine
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        `Cannot transition order from ${currentStatus} to ${newStatus}`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Validate delivery vs pickup rules
    if (newStatus === 'OUT_FOR_DELIVERY' && order.orderType !== 'delivery') {
      throw new AppError('OUT_FOR_DELIVERY status is only valid for delivery orders', 409, 'INVALID_STATUS_TRANSITION');
    }

    if (currentStatus === 'READY' && newStatus === 'COMPLETED' && order.orderType === 'delivery') {
      throw new AppError('Delivery orders must move from READY to OUT_FOR_DELIVERY before COMPLETED', 409, 'INVALID_STATUS_TRANSITION');
    }

    // Role & Ownership Enforcement
    if (user.role === 'customer') {
      // Customer can ONLY cancel an order while status is PLACED
      if (order.customerId.toString() !== user._id.toString()) {
        throw new AppError('Forbidden: Not your order', 403, 'FORBIDDEN');
      }
      if (newStatus !== 'CANCELLED' || currentStatus !== 'PLACED') {
        throw new AppError('Customer can only cancel orders while in PLACED status', 403, 'FORBIDDEN');
      }
    } else if (user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ ownerId: user._id });
      if (!restaurant || order.restaurantId.toString() !== restaurant._id.toString()) {
        throw new AppError('Forbidden: Order does not belong to your restaurant', 403, 'FORBIDDEN');
      }
    }
    // Admin has access to transition any order

    // Validate required reason for cancellation / rejection
    if (['REJECTED', 'CANCELLED'].includes(newStatus)) {
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new AppError('Reason is required when rejecting or cancelling an order', 400, 'REASON_REQUIRED');
      }
    }

    // Execute state transition
    order.status = newStatus;

    if (reason) {
      order.cancelReason = reason;
    }

    // Refund pending handling per D14
    if (['REJECTED', 'CANCELLED'].includes(newStatus) && order.paymentStatus === 'COMPLETED') {
      order.paymentStatus = 'REFUND_PENDING';
    }

    // Append to status history
    order.statusHistory.push({
      status: newStatus,
      at: new Date(),
      byRole: user.role,
      reason: reason || null,
    });

    await order.save();

    // Audit Log
    await AuditLog.create({
      action: `ORDER_STATUS_CHANGED_${newStatus}`,
      actorId: user._id,
      actorRole: user.role,
      targetModel: 'Order',
      targetId: order._id,
      metadata: { fromStatus: currentStatus, toStatus: newStatus, reason },
    });

    // Notify Customer & Restaurant
    await NotificationService.notifyOrderEvent({
      order,
      eventType: `ORDER_${newStatus}`,
      title: `Order Status: ${newStatus.replace(/_/g, ' ')}`,
      customerMessage: `Your order #${order._id} status is now ${newStatus.replace(/_/g, ' ')}.${reason ? ` Reason: ${reason}` : ''}`,
      restaurantMessage: `Order #${order._id} updated to ${newStatus.replace(/_/g, ' ')}.`,
    });

    return order;
  }

  /**
   * 4. ORDER READS
   */
  static async getOrderById({ orderId, user }) {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (user.role === 'customer') {
      if (order.customerId.toString() !== user._id.toString()) {
        throw new AppError('Forbidden access to order', 403, 'FORBIDDEN');
      }
      return order;
    }

    if (user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ ownerId: user._id });
      if (!restaurant || order.restaurantId.toString() !== restaurant._id.toString()) {
        throw new AppError('Forbidden access to restaurant order', 403, 'FORBIDDEN');
      }

      // Check if order is active for this restaurant
      const isActive = ACTIVE_STATUSES.includes(order.status);
      if (!isActive) {
        // Redact sensitive customer contact information for completed/terminal orders
        if (order.deliveryAddress) {
          order.deliveryAddress = {
            city: order.deliveryAddress.city,
            state: order.deliveryAddress.state,
            postalCode: order.deliveryAddress.postalCode,
            name: '*** Redacted ***',
            phone: '*** Redacted ***',
            addressLine1: '*** Redacted ***',
            addressLine2: '',
          };
        }
      } else {
        // Fetch customer details for active order
        const customer = await Address.findById(order.deliveryAddress?._id).lean();
      }

      return order;
    }

    // Admin role receives full details
    return order;
  }

  static async getCustomerOrders({ customerId, status, page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = { customerId };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  static async getRestaurantOrders({ ownerId, status, startDate, endDate, page = 1, limit = 20 }) {
    const restaurant = await Restaurant.findOne({ ownerId });
    if (!restaurant) {
      throw new AppError('Restaurant not found for user', 404, 'RESTAURANT_NOT_FOUND');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { restaurantId: restaurant._id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    // Apply customer contact info privacy masking for non-active orders
    const sanitizedOrders = orders.map((ord) => {
      const isActive = ACTIVE_STATUSES.includes(ord.status);
      if (!isActive && ord.deliveryAddress) {
        return {
          ...ord,
          deliveryAddress: {
            city: ord.deliveryAddress.city,
            state: ord.deliveryAddress.state,
            postalCode: ord.deliveryAddress.postalCode,
            name: '*** Redacted ***',
            phone: '*** Redacted ***',
            addressLine1: '*** Redacted ***',
          },
        };
      }
      return ord;
    });

    return {
      orders: sanitizedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

export default OrderService;
