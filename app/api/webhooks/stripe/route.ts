import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe/client';
import { getServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const giftId = paymentIntent.metadata?.gift_id;

        if (!giftId) {
          console.error('No gift_id in payment intent metadata');
          break;
        }

        // Update transaction status
        await supabase
          .from('transactions')
          .update({
            stripe_status: 'succeeded',
            status: 'completed',
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update gift status
        await supabase
          .from('gifts')
          .update({
            status: 'payment_confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', giftId);

        console.log(`Payment confirmed for gift ${giftId}`);

        // TODO: Trigger POD order creation via Shopify/Printful
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const giftId = paymentIntent.metadata?.gift_id;

        if (!giftId) break;

        // Update transaction status
        await supabase
          .from('transactions')
          .update({
            stripe_status: 'failed',
            status: 'failed',
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update gift status
        await supabase
          .from('gifts')
          .update({
            status: 'payment_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', giftId);

        console.log(`Payment failed for gift ${giftId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
