import { GiftStatus } from '@/types';

/**
 * Gift Provider interface
 * Abstraction for different gift fulfillment providers
 * MVP: Shopify + Gipht + POD (Printful/Printify)
 * Future: Amazon manual, other platforms
 */
export interface GiftProvider {
  /**
   * Provider identifier
   */
  readonly providerId: string;

  /**
   * Create a gift intent (draft order)
   * Returns a claim URL that the human can use to complete the gift
   */
  createGiftIntent(params: {
    productId: string;
    recipientEmail: string;
    message: string;
    metadata: Record<string, string>;
  }): Promise<{
    giftId: string;
    claimUrl: string;
    draftOrderId?: string;
  }>;

  /**
   * Get the current status of a gift
   */
  getStatus(giftId: string): Promise<GiftStatus>;

  /**
   * Handle incoming webhook from the provider
   */
  handleWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult>;

  /**
   * Cancel a gift (if possible)
   */
  cancelGift?(giftId: string): Promise<boolean>;
}

/**
 * Result from processing a webhook
 */
export interface WebhookResult {
  success: boolean;
  giftId?: string;
  newStatus?: GiftStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  error?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  shopify?: {
    shopDomain: string;
    accessToken: string;
    giphtEnabled: boolean;
  };
  printful?: {
    apiKey: string;
  };
  printify?: {
    apiKey: string;
    shopId: string;
  };
}

/**
 * Catalog item representation (provider-agnostic)
 */
export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  available: boolean;
  providerProductId: string;
  providerVariantId?: string;
}
