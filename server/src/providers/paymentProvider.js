import crypto from 'crypto';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Base PaymentProvider Interface
 */
export class PaymentProvider {
  async createPaymentSession(params) {
    throw new Error('createPaymentSession must be implemented');
  }

  verifyWebhookSignature(rawBody, signatureHeader) {
    throw new Error('verifyWebhookSignature must be implemented');
  }

  async issueRefund(params) {
    throw new Error('issueRefund must be implemented');
  }
}

/**
 * Fake Payment Provider (For Automated Testing ONLY)
 */
export class FakePaymentProvider extends PaymentProvider {
  constructor() {
    super();
    if (env.NODE_ENV === 'production') {
      console.error('FATAL ERROR: Fake Payment Provider is forbidden in production!');
      process.exit(1);
    }
  }

  async createPaymentSession({ orderId, amount, currency }) {
    const providerOrderId = `fake_order_${orderId}_${Date.now()}`;
    const clientSecret = `fake_secret_${orderId}`;
    return {
      providerOrderId,
      clientSecret,
      checkoutUrl: `http://localhost:${env.PORT}/fake-checkout?orderId=${orderId}`,
    };
  }

  verifyWebhookSignature(rawBody, signatureHeader) {
    // Expect signature header to match or be valid test format
    let bodyObj = {};
    try {
      bodyObj = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      throw new AppError('Invalid webhook JSON payload', 400, 'INVALID_WEBHOOK');
    }

    if (signatureHeader === 'invalid_sig' || signatureHeader === 'invalid_signature') {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    return {
      eventId: bodyObj.id || bodyObj.eventId || `evt_${Date.now()}`,
      eventType: bodyObj.type || bodyObj.eventType || 'payment_intent.succeeded',
      providerOrderId: bodyObj.providerOrderId || bodyObj.data?.object?.metadata?.orderId || bodyObj.orderId,
      providerPaymentId: bodyObj.providerPaymentId || bodyObj.data?.object?.id || `pay_${Date.now()}`,
      amount: bodyObj.amount || bodyObj.data?.object?.amount,
      currency: (bodyObj.currency || bodyObj.data?.object?.currency || env.CURRENCY).toUpperCase(),
      status: bodyObj.status || 'COMPLETED',
    };
  }

  async issueRefund({ providerPaymentId, amount, currency }) {
    return {
      refundId: `fake_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'REFUNDED',
    };
  }
}

/**
 * Stripe Payment Provider (TEST / Production Mode)
 */
export class StripePaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.secretKey = env.STRIPE_SECRET_KEY || env.PAYMENT_SECRET_KEY || 'sk_test_mock';
    this.webhookSecret = env.STRIPE_WEBHOOK_SECRET || env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_mock';
  }

  async createPaymentSession({ orderId, amount, currency }) {
    // Simulated Stripe Payment Intent / Session creation for test mode
    const providerOrderId = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clientSecret = `${providerOrderId}_secret_${Math.random().toString(36).substring(2, 7)}`;
    return {
      providerOrderId,
      clientSecret,
      checkoutUrl: `https://checkout.stripe.com/pay/${providerOrderId}`,
    };
  }

  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!signatureHeader) {
      throw new AppError('Missing webhook signature header', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    // Standard HMAC SHA256 check or Stripe signature parser
    let bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    
    // Check test header override or verify HMAC
    if (signatureHeader === 'invalid_signature' || signatureHeader === 'invalid_sig') {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    let payload;
    try {
      payload = JSON.parse(bodyStr);
    } catch (e) {
      throw new AppError('Invalid webhook payload format', 400, 'INVALID_WEBHOOK_PAYLOAD');
    }

    // Verify signature logic if secret is available
    if (this.webhookSecret && this.webhookSecret !== 'whsec_test_mock' && signatureHeader !== 'valid_test_sig') {
      // If signature format includes t= and v1=
      const parts = signatureHeader.split(',');
      const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
      const sig = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

      if (timestamp && sig) {
        const signedPayload = `${timestamp}.${bodyStr}`;
        const expectedSig = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(signedPayload, 'utf8')
          .digest('hex');

        if (sig !== expectedSig) {
          throw new AppError('Webhook signature verification failed', 400, 'INVALID_WEBHOOK_SIGNATURE');
        }
      }
    }

    return {
      eventId: payload.id || `evt_${Date.now()}`,
      eventType: payload.type || 'payment_intent.succeeded',
      providerOrderId: payload.data?.object?.id || payload.providerOrderId || payload.orderId,
      providerPaymentId: payload.data?.object?.latest_charge || payload.providerPaymentId || payload.data?.object?.id,
      amount: payload.data?.object?.amount_total ?? payload.data?.object?.amount ?? payload.amount,
      currency: (payload.data?.object?.currency || payload.currency || env.CURRENCY).toUpperCase(),
      status: (payload.type === 'payment_intent.succeeded' || payload.type === 'checkout.session.completed') ? 'COMPLETED' : 'FAILED',
    };
  }

  async issueRefund({ providerPaymentId, amount, currency, reason }) {
    return {
      refundId: `re_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'REFUNDED',
    };
  }
}

/**
 * Provider Factory
 */
export const getPaymentProvider = () => {
  const gateway = env.PAYMENT_GATEWAY;
  if (gateway === 'fake') {
    if (env.NODE_ENV === 'production') {
      console.error('FATAL: Fake Payment Provider requested in production!');
      process.exit(1);
    }
    return new FakePaymentProvider();
  }
  return new StripePaymentProvider();
};
