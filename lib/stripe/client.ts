import Stripe from 'stripe';

// Server-side Stripe client
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    });
  }

  return stripeClient;
}

/**
 * Create a payment intent for a gift
 * Uses Stripe Stablecoin (USDC) when available
 */
export async function createGiftPaymentIntent(params: {
  amountCents: number;
  currency: string;
  giftId: string;
  agentId: string;
  objectId: string;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string;
}> {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: params.currency.toLowerCase(),
    metadata: {
      gift_id: params.giftId,
      agent_id: params.agentId,
      object_id: params.objectId,
      source: 'thanksyourhuman',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
  };
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
