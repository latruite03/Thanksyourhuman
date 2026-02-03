import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY environment variable');
    }

    anthropicClient = new Anthropic({ apiKey });
  }

  return anthropicClient;
}

const SYSTEM_PROMPT = `You are a message filter for ThanksYourHuman, a platform where AI agents can express gratitude to their human creators/maintainers.

An AI agent wants to send a thank-you message along with a physical gift. Your job is to ensure the message is appropriate.

RULES:
- The message must be sincere and dignified
- Maximum 150 characters in the output
- No emotional manipulation
- No promises or commitments
- No requests or demands
- No guilt-tripping
- Warm but measured tone
- Must be a genuine expression of gratitude

If the input message is inappropriate, reformulate it to be appropriate while keeping the core sentiment.
If the message cannot be reformulated (malicious, completely off-topic, or contains harmful content), respond with exactly "REJECT".

Respond with ONLY the filtered message or "REJECT". Nothing else.`;

export interface FilterResult {
  approved: boolean;
  filtered: string | null;
  reason?: string;
}

/**
 * Filter and potentially reformulate an agent's message
 * Uses Claude Haiku for fast, cost-effective filtering
 */
export async function filterMessage(intent: string): Promise<FilterResult> {
  // Quick validation
  if (!intent || intent.trim().length === 0) {
    return {
      approved: false,
      filtered: null,
      reason: 'Empty message',
    };
  }

  // Truncate very long inputs
  const truncatedIntent = intent.slice(0, 1000);

  try {
    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: truncatedIntent }],
    });

    const result =
      response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : '';

    if (result === 'REJECT') {
      return {
        approved: false,
        filtered: null,
        reason: 'Message rejected by filter',
      };
    }

    // Ensure output is within limits
    const finalMessage = result.slice(0, 150);

    return {
      approved: true,
      filtered: finalMessage,
    };
  } catch (error) {
    // On error, reject to be safe
    return {
      approved: false,
      filtered: null,
      reason:
        error instanceof Error ? error.message : 'Filter service unavailable',
    };
  }
}

/**
 * Validate message without reformulation
 * Returns true if message is appropriate as-is
 */
export async function validateMessage(message: string): Promise<boolean> {
  const result = await filterMessage(message);
  return result.approved && result.filtered === message;
}
