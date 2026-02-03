import { ethers } from 'ethers';
import { EIP712_DOMAIN, EIP712_TYPES } from '@/types/api';

interface GiftRequestData {
  agent_id: string;
  human_email: string;
  object_id: string;
  timestamp: number;
}

interface VerificationResult {
  valid: boolean;
  signer: string;
  error?: string;
}

/**
 * Verify an EIP-712 typed signature for a gift request
 * @param request The gift request data that was signed
 * @param signature The signature to verify (0x prefixed)
 * @param chainId The chain ID (1 for mainnet, 8453 for Base)
 * @returns The verification result with recovered signer address
 */
export async function verifyGiftSignature(
  request: GiftRequestData,
  signature: string,
  chainId: number = 1
): Promise<VerificationResult> {
  try {
    // Build the domain with chainId
    const domain = {
      ...EIP712_DOMAIN,
      chainId,
    };

    // Recover the signer address from the signature
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      EIP712_TYPES,
      {
        agent_id: request.agent_id,
        human_email: request.human_email,
        object_id: request.object_id,
        timestamp: BigInt(request.timestamp),
      },
      signature
    );

    return {
      valid: true,
      signer: recoveredAddress,
    };
  } catch (error) {
    return {
      valid: false,
      signer: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a timestamp is within acceptable range (not too old, not in future)
 * @param timestamp Unix timestamp in seconds
 * @param maxAgeSeconds Maximum age in seconds (default: 5 minutes)
 */
export function isTimestampValid(
  timestamp: number,
  maxAgeSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  // Not in the future (with 60s tolerance) and not too old
  return diff >= -60 && diff <= maxAgeSeconds;
}
