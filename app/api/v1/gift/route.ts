import { NextRequest, NextResponse } from 'next/server';
import { GiftRequestSchema } from '@/types/api';
import { verifyGiftSignature, isTimestampValid } from '@/lib/ethereum/verify-signature';
import { filterMessage } from '@/lib/message-filter/filter';
import { getServerClient } from '@/lib/supabase/client';
import { sendGiftNotificationEmail } from '@/lib/email/client';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = GiftRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const giftRequest = parseResult.data;

    // Validate timestamp (not too old, not in future)
    if (!isTimestampValid(giftRequest.timestamp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid timestamp',
        },
        { status: 400 }
      );
    }

    // Verify EIP-712 signature
    const chainId = parseInt(process.env.CHAIN_ID || '1', 10);
    const verificationResult = await verifyGiftSignature(
      {
        agent_id: giftRequest.agent_id,
        human_email: giftRequest.human_email,
        object_id: giftRequest.object_id,
        timestamp: giftRequest.timestamp,
      },
      giftRequest.signature,
      chainId
    );

    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature',
          details: verificationResult.error,
        },
        { status: 401 }
      );
    }

    const agentWallet = verificationResult.signer;

    // Filter/reformulate the message
    const filterResult = await filterMessage(giftRequest.message_intent);

    if (!filterResult.approved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message rejected',
          reason: filterResult.reason,
        },
        { status: 400 }
      );
    }

    // Verify object exists in catalog
    const supabase = getServerClient();
    const { data: catalogObject, error: catalogError } = await supabase
      .from('catalog_objects')
      .select('id, name, price_cents, available')
      .eq('id', giftRequest.object_id)
      .single();

    if (catalogError || !catalogObject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Object not found in catalog',
        },
        { status: 404 }
      );
    }

    if (!catalogObject.available) {
      return NextResponse.json(
        {
          success: false,
          error: 'Object is not available',
        },
        { status: 400 }
      );
    }

    // Create gift record
    const claimToken = randomUUID();
    const claimExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: gift, error: insertError } = await supabase
      .from('gifts')
      .insert({
        agent_id: giftRequest.agent_id,
        agent_wallet: agentWallet,
        human_email: giftRequest.human_email,
        object_id: giftRequest.object_id,
        message_intent: giftRequest.message_intent,
        message_filtered: filterResult.filtered,
        status: 'pending_claim',
        claim_token: claimToken,
        claim_expires_at: claimExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError || !gift) {
      console.error('Failed to create gift:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create gift',
        },
        { status: 500 }
      );
    }

    // Send notification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const claimUrl = `${appUrl}/claim/${claimToken}`;

    const emailResult = await sendGiftNotificationEmail({
      recipientEmail: giftRequest.human_email,
      agentId: giftRequest.agent_id,
      message: filterResult.filtered!,
      claimUrl,
      expiresAt: claimExpiresAt,
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      // Don't fail the request, gift is created
    }

    return NextResponse.json({
      success: true,
      gift_id: gift.id,
      status: gift.status,
      claim_expires_at: gift.claim_expires_at,
    });
  } catch (error) {
    console.error('Gift creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
