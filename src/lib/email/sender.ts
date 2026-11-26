import { Resend } from "resend";
import type { EmailConfig } from "./config";

export type OutgoingEmail = {
  from: string;
  to: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
  // Sending the same key twice makes the email service return the first result instead of sending again.
  idempotencyKey: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string; retryable: boolean };

export interface EmailSender {
  send(email: OutgoingEmail): Promise<SendResult>;
}

type ResendLike = Pick<Resend, "emails">;

// Whether trying again later could help: no response, the service is struggling, or we hit a rate or
// quota limit. A rejected address, an unverified domain or a bad key will never work on a retry.
export function isRetryable(statusCode: number | null): boolean {
  return statusCode === null || statusCode >= 500 || statusCode === 429;
}

const clip = (text: string) => (text.length > 300 ? `${text.slice(0, 299)}…` : text);

export class ResendSender implements EmailSender {
  constructor(private readonly client: ResendLike) {}

  async send(email: OutgoingEmail): Promise<SendResult> {
    try {
      const { data, error } = await this.client.emails.send(
        {
          from: email.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(email.bcc ? { bcc: email.bcc } : {}),
          ...(email.replyTo ? { replyTo: email.replyTo } : {}),
          ...(email.attachments ? { attachments: email.attachments } : {}),
        },
        { idempotencyKey: email.idempotencyKey },
      );
      if (error || !data) {
        return { ok: false, error: clip(`${error?.name ?? "error"}: ${error?.message ?? "no response"}`), retryable: isRetryable(error?.statusCode ?? null) };
      }
      return { ok: true, id: data.id };
    } catch (e) {
      return { ok: false, error: clip(e instanceof Error ? `network error: ${e.message}` : "network error"), retryable: true };
    }
  }
}

export const createEmailSender = (config: EmailConfig): EmailSender => new ResendSender(new Resend(config.apiKey));
