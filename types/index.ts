// ThanksYourHuman - Core Types

// Gift status state machine
export type GiftStatus =
  | 'pending_claim'      // En attente accept/decline
  | 'claimed'            // Accepté, adresse collectée
  | 'declined'           // Refusé
  | 'expired'            // Délai dépassé
  | 'payment_pending'    // Paiement en cours
  | 'payment_confirmed'  // Paiement OK
  | 'payment_failed'     // Paiement échoué
  | 'in_production'      // POD en cours
  | 'shipped'            // Expédié
  | 'delivered';         // Livré

// Database types
export interface Gift {
  id: string;
  agent_id: string;
  agent_wallet: string;
  human_email: string;
  object_id: string;
  message_intent: string | null;
  message_filtered: string | null;
  status: GiftStatus;
  claim_token: string;
  claim_expires_at: string;
  shopify_draft_order_id: string | null;
  shopify_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogObject {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number;
  currency: string;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  image_url: string | null;
  available: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  gift_id: string;
  stripe_payment_intent_id: string | null;
  stripe_status: string | null;
  onchain_tx_hash: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

// API types
export interface GiftRequest {
  agent_id: string;
  human_email: string;
  object_id: string;
  message_intent: string;
  signature: string;
  timestamp: number;
}

export interface GiftResponse {
  success: boolean;
  gift_id: string;
  status: GiftStatus;
  claim_expires_at: string;
}

export interface CatalogResponse {
  objects: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price_cents: number;
    currency: string;
    image_url: string | null;
  }>;
}

// Provider abstraction
export interface GiftProvider {
  createGiftIntent(params: {
    productId: string;
    recipientEmail: string;
    message: string;
    metadata: Record<string, string>;
  }): Promise<{ giftId: string; claimUrl: string }>;

  getStatus(giftId: string): Promise<GiftStatus>;

  handleWebhook(payload: unknown, headers: Record<string, string>): Promise<void>;
}
