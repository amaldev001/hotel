import dotenv from 'dotenv';
import { z } from 'zod';

if (process.argv.some(arg => arg.includes('jest')) || process.env.NODE_ENV === 'test') {
  process.env.NODE_ENV = 'test';
}

const existingNodeEnv = process.env.NODE_ENV;
dotenv.config();
if (existingNodeEnv) {
  process.env.NODE_ENV = existingNodeEnv;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }).min(1, 'MONGODB_URI cannot be empty'),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(32, 'JWT_SECRET must be at least 32 characters long'),
  FRONTEND_ORIGIN: z.string({ required_error: 'FRONTEND_ORIGIN is required' }).min(1, 'FRONTEND_ORIGIN cannot be empty'),
  APP_TIMEZONE: z.string({ required_error: 'APP_TIMEZONE is required' }).min(1, 'APP_TIMEZONE cannot be empty'),
  CURRENCY: z.string({ required_error: 'CURRENCY is required' }).min(1, 'CURRENCY cannot be empty'),
  TAX_PERCENT: z.string({ required_error: 'TAX_PERCENT is required' }).transform((val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) {
      throw new Error('TAX_PERCENT must be a non-negative number');
    }
    return parsed;
  }),
  APP_NAME: z.string().default('Food Ordering Platform'),
  TRUST_PROXY: z.string().transform((val) => val === 'true' || val === '1').default('false'),
  
  // Payment variables per D11
  PAYMENT_GATEWAY: z.enum(['stripe', 'razorpay', 'fake']).default('stripe'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  PAYMENT_SECRET_KEY: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  // Uploads
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.string().transform((val) => parseInt(val, 10)).default('2'),
}).superRefine((data, ctx) => {
  // Disallow 'fake' provider in production per D11 / AI-CODING-RULES
  if (data.NODE_ENV === 'production' && data.PAYMENT_GATEWAY === 'fake') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fake payment provider is forbidden in production environment',
      path: ['PAYMENT_GATEWAY'],
    });
  }

  // Validate gateway specific secret requirements
  if (data.PAYMENT_GATEWAY === 'stripe') {
    if (!data.STRIPE_SECRET_KEY && !data.PAYMENT_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'STRIPE_SECRET_KEY (or PAYMENT_SECRET_KEY) is required when PAYMENT_GATEWAY is stripe',
        path: ['STRIPE_SECRET_KEY'],
      });
    }
    if (!data.STRIPE_WEBHOOK_SECRET && !data.PAYMENT_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'STRIPE_WEBHOOK_SECRET (or PAYMENT_WEBHOOK_SECRET) is required when PAYMENT_GATEWAY is stripe',
        path: ['STRIPE_WEBHOOK_SECRET'],
      });
    }
  } else if (data.PAYMENT_GATEWAY === 'razorpay') {
    if (!data.RAZORPAY_KEY_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_ID is required when PAYMENT_GATEWAY is razorpay',
        path: ['RAZORPAY_KEY_ID'],
      });
    }
    if (!data.RAZORPAY_KEY_SECRET && !data.PAYMENT_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_SECRET (or PAYMENT_SECRET_KEY) is required when PAYMENT_GATEWAY is razorpay',
        path: ['RAZORPAY_KEY_SECRET'],
      });
    }
  }
});

let env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment Variable Validation Error:');
    error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.') || 'root'}: ${issue.message}`);
    });
  } else {
    console.error('❌ Environment Variable Load Error:', error.message);
  }
  process.exit(1);
}

export default env;
