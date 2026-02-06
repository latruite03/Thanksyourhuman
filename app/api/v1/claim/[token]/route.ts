import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/v1/claim/[token]
 * Fetch gift details for the claim page
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const supabase = getServerClient();

    // Fetch gift with catalog object details
    const { data: gift, error } = await supabase
      .from('gifts')
      .select(`
        id,
        agent_id,
        message_filtered,
        status,
        claim_expires_at,
        object_id,
        catalog_objects (
          name,
          image_url
        )
      `)
      .eq('claim_token', token)
      .single();

    if (error || !gift) {
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      );
    }

    // Check if expired
    const expiresAt = new Date(gift.claim_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This gift link has expired' },
        { status: 410 }
      );
    }

    // Check if already claimed or declined
    if (gift.status !== 'pending_claim') {
      return NextResponse.json(
        { error: 'This gift has already been processed' },
        { status: 400 }
      );
    }

    const catalogObject = gift.catalog_objects as { name: string; image_url: string | null } | null;

    return NextResponse.json({
      gift: {
        id: gift.id,
        agent_id: gift.agent_id,
        message_filtered: gift.message_filtered,
        object_name: catalogObject?.name || 'Gift',
        object_image_url: catalogObject?.image_url || null,
        status: gift.status,
        expires_at: gift.claim_expires_at,
      },
    });
  } catch (error) {
    console.error('Claim fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/claim/[token]
 * Process claim response (accept/decline)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { action } = body as { action: 'accept' | 'decline' };

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // Fetch gift
    const { data: gift, error: fetchError } = await supabase
      .from('gifts')
      .select('id, status, claim_expires_at, object_id')
      .eq('claim_token', token)
      .single();

    if (fetchError || !gift) {
      return NextResponse.json(
        { error: 'Gift not found' },
        { status: 404 }
      );
    }

    // Check if expired
    const expiresAt = new Date(gift.claim_expires_at);
    if (expiresAt < new Date()) {
      await supabase
        .from('gifts')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', gift.id);

      return NextResponse.json(
        { error: 'This gift link has expired' },
        { status: 410 }
      );
    }

    // Check if already processed
    if (gift.status !== 'pending_claim') {
      return NextResponse.json(
        { error: 'This gift has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'decline') {
      // Update gift status to declined
      await supabase
        .from('gifts')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
        .eq('id', gift.id);

      return NextResponse.json({
        success: true,
        status: 'declined',
      });
    }

    // Action is 'accept'
    // Update gift status to claimed
    await supabase
      .from('gifts')
      .update({
        status: 'claimed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gift.id);

    // TODO: Create Shopify draft order and get Gipht checkout URL
    // For now, return a configurable placeholder
    const baseUrl = process.env.GIPHT_CHECKOUT_BASE_URL;
    const checkoutUrl = baseUrl
      ? `${baseUrl}?gift_id=${gift.id}`
      : `/checkout/${gift.id}`;

    return NextResponse.json({
      success: true,
      status: 'claimed',
      checkout_url: checkoutUrl,
    });
  } catch (error) {
    console.error('Claim process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
