import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';
import { sendShippedNotificationEmail } from '@/lib/email/client';
import crypto from 'crypto';

/**
 * Verify Shopify webhook HMAC signature
 */
function verifyShopifyWebhook(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');

    // Verify webhook signature
    if (!verifyShopifyWebhook(body, signature)) {
      console.error('Invalid Shopify webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const supabase = getServerClient();

    switch (topic) {
      case 'orders/fulfilled': {
        // Order has been fulfilled (shipped)
        const orderId = payload.id?.toString();
        const trackingNumber = payload.fulfillments?.[0]?.tracking_number;
        const trackingUrl = payload.fulfillments?.[0]?.tracking_url;

        if (!orderId) break;

        // Find the gift by Shopify order ID
        const { data: gift, error } = await supabase
          .from('gifts')
          .select('id, human_email')
          .eq('shopify_order_id', orderId)
          .single();

        if (error || !gift) {
          console.log(`No gift found for Shopify order ${orderId}`);
          break;
        }

        // Update gift status
        await supabase
          .from('gifts')
          .update({
            status: 'shipped',
            updated_at: new Date().toISOString(),
          })
          .eq('id', gift.id);

        // Send shipping notification
        await sendShippedNotificationEmail({
          recipientEmail: gift.human_email,
          trackingNumber,
          trackingUrl,
        });

        console.log(`Gift ${gift.id} marked as shipped`);
        break;
      }

      case 'orders/paid': {
        // Order payment confirmed (backup for Stripe webhook)
        const orderId = payload.id?.toString();

        if (!orderId) break;

        // Update gift status if not already confirmed
        await supabase
          .from('gifts')
          .update({
            status: 'payment_confirmed',
            shopify_order_id: orderId,
            updated_at: new Date().toISOString(),
          })
          .eq('shopify_order_id', orderId)
          .eq('status', 'payment_pending');

        break;
      }

      case 'fulfillments/create': {
        // Fulfillment created (production started)
        const orderId = payload.order_id?.toString();

        if (!orderId) break;

        await supabase
          .from('gifts')
          .update({
            status: 'in_production',
            updated_at: new Date().toISOString(),
          })
          .eq('shopify_order_id', orderId)
          .eq('status', 'payment_confirmed');

        break;
      }

      default:
        console.log(`Unhandled Shopify webhook topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
