import { z } from 'zod';

// Zod schemas for API validation

export const GiftRequestSchema = z.object({
  agent_id: z.string().min(1, 'agent_id is required'),
  human_email: z.string().email('Invalid email address'),
  object_id: z.string().min(1, 'object_id is required'),
  message_intent: z.string().max(500, 'Message too long (max 500 chars)'),
  signature: z.string().startsWith('0x', 'Invalid signature format'),
  timestamp: z.number().int().positive('Invalid timestamp'),
});

export type GiftRequestInput = z.infer<typeof GiftRequestSchema>;

// EIP-712 domain for signature verification
export const EIP712_DOMAIN = {
  name: 'ThanksYourHuman',
  version: '1',
  // chainId will be set dynamically (1 for mainnet, 8453 for Base)
} as const;

export const EIP712_TYPES = {
  GiftRequest: [
    { name: 'agent_id', type: 'string' },
    { name: 'human_email', type: 'string' },
    { name: 'object_id', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;
