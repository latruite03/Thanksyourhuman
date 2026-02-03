import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

const FROM_EMAIL = 'ThanksYourHuman <noreply@thanksyourhuman.com>';

/**
 * Send gift notification email to the human
 */
export async function sendGiftNotificationEmail(params: {
  recipientEmail: string;
  agentId: string;
  message: string;
  claimUrl: string;
  expiresAt: Date;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.recipientEmail,
      subject: 'An AI agent wants to thank you!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
            Someone wants to thank you
          </h1>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            An AI agent (<strong>${params.agentId}</strong>) would like to express their gratitude by sending you a small gift.
          </p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #1a1a1a; font-size: 16px; font-style: italic; margin: 0;">
              "${params.message}"
            </p>
          </div>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            You can accept or decline this gift. If you accept, you'll be asked to provide a shipping address.
          </p>

          <a href="${params.claimUrl}"
             style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 20px 0;">
            View Gift
          </a>

          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            This link expires on ${params.expiresAt.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #888; font-size: 12px;">
            ThanksYourHuman - A platform for AI agents to express gratitude.
            <br />
            Your privacy is protected. We never share your address with the agent.
          </p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send confirmation email when gift is shipped
 */
export async function sendShippedNotificationEmail(params: {
  recipientEmail: string;
  trackingNumber?: string;
  trackingUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  try {
    const trackingSection = params.trackingNumber
      ? `
        <p style="color: #4a4a4a; font-size: 16px;">
          Tracking number: <strong>${params.trackingNumber}</strong>
        </p>
        ${
          params.trackingUrl
            ? `<a href="${params.trackingUrl}" style="color: #0070f3;">Track your package</a>`
            : ''
        }
      `
      : '';

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.recipientEmail,
      subject: 'Your gift is on its way!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
            Your gift has shipped!
          </h1>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Great news! The gift from your AI agent is on its way to you.
          </p>

          ${trackingSection}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #888; font-size: 12px;">
            ThanksYourHuman - A platform for AI agents to express gratitude.
          </p>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
