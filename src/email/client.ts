/**
 * Email Client — Template-based transactional email sender.
 *
 * Supports Postmark (primary) and Resend (fallback) transports.
 * Transport is selected automatically based on which env var is set:
 *   POSTMARK_API_KEY → Postmark
 *   RESEND_API_KEY   → Resend (legacy fallback)
 */

import { ServerClient as PostmarkClient } from "postmark";
import { Resend } from "resend";
import { logger } from "../config/logger.js";

export type EmailTransport = "postmark" | "resend";

export interface EmailClientConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
  transport: EmailTransport;
}

export interface SendTemplateEmailOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Audit metadata: who triggered this email */
  userId?: string;
  /** Audit metadata: which template was used */
  templateName?: string;
}

export interface EmailSendResult {
  id: string;
  success: boolean;
}

/**
 * Transactional email client supporting Postmark and Resend transports.
 *
 * Usage:
 * ```ts
 * const client = new EmailClient({ apiKey: "xxx", from: "noreply@wopr.bot", transport: "postmark" });
 * const template = verifyEmailTemplate(url, email);
 * await client.send({ to: email, ...template, userId: "user-123", templateName: "verify-email" });
 * ```
 */
export class EmailClient {
  private transport: EmailTransport;
  private resend: Resend | null = null;
  private postmark: PostmarkClient | null = null;
  private from: string;
  private replyTo: string | undefined;
  private onSend: ((opts: SendTemplateEmailOpts, result: EmailSendResult) => void) | null = null;

  constructor(config: EmailClientConfig) {
    this.transport = config.transport;
    this.from = config.from;
    this.replyTo = config.replyTo;

    if (this.transport === "postmark") {
      this.postmark = new PostmarkClient(config.apiKey);
    } else {
      this.resend = new Resend(config.apiKey);
    }
  }

  /** Register a callback invoked after each successful send (for audit logging). */
  onEmailSent(callback: (opts: SendTemplateEmailOpts, result: EmailSendResult) => void): void {
    this.onSend = callback;
  }

  /** Send a transactional email. */
  async send(opts: SendTemplateEmailOpts): Promise<EmailSendResult> {
    if (this.transport === "postmark") {
      return this.sendViaPostmark(opts);
    }
    return this.sendViaResend(opts);
  }

  private async sendViaPostmark(opts: SendTemplateEmailOpts): Promise<EmailSendResult> {
    try {
      const payload: Parameters<PostmarkClient["sendEmail"]>[0] = {
        From: this.from,
        To: opts.to,
        Subject: opts.subject,
        HtmlBody: opts.html,
        TextBody: opts.text,
        MessageStream: "outbound",
      };

      if (this.replyTo) {
        payload.ReplyTo = this.replyTo;
      }

      const response = await (this.postmark as PostmarkClient).sendEmail(payload);

      const result: EmailSendResult = {
        id: response.MessageID,
        success: true,
      };

      logger.info("Email sent via Postmark", {
        emailId: result.id,
        to: opts.to,
        template: opts.templateName,
        userId: opts.userId,
      });

      this.invokeOnSend(opts, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Failed to send email via Postmark", {
        to: opts.to,
        template: opts.templateName,
        error: message,
      });
      throw new Error(`Failed to send email: ${message}`);
    }
  }

  private async sendViaResend(opts: SendTemplateEmailOpts): Promise<EmailSendResult> {
    const { data, error } = await (this.resend as Resend).emails.send({
      from: this.from,
      replyTo: this.replyTo,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (error) {
      logger.error("Failed to send email via Resend", {
        to: opts.to,
        template: opts.templateName,
        error: error.message,
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }

    const result: EmailSendResult = {
      id: data?.id || "",
      success: true,
    };

    logger.info("Email sent via Resend", {
      emailId: result.id,
      to: opts.to,
      template: opts.templateName,
      userId: opts.userId,
    });

    this.invokeOnSend(opts, result);
    return result;
  }

  private invokeOnSend(opts: SendTemplateEmailOpts, result: EmailSendResult): void {
    if (this.onSend) {
      try {
        this.onSend(opts, result);
      } catch {
        // Audit callback failure should not break email sending
      }
    }
  }
}

/**
 * Create a lazily-initialized singleton EmailClient from environment variables.
 *
 * Priority:
 *   1. POSTMARK_API_KEY → Postmark transport
 *   2. RESEND_API_KEY   → Resend transport (legacy fallback)
 *
 * Sender address env vars:
 *   EMAIL_FROM     (default: "noreply@wopr.bot")
 *   EMAIL_REPLY_TO (default: "support@wopr.bot")
 *   RESEND_FROM / RESEND_REPLY_TO still work as legacy fallback
 */
let _client: EmailClient | null = null;

export function getEmailClient(): EmailClient {
  if (!_client) {
    const postmarkKey = process.env.POSTMARK_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || "noreply@wopr.bot";
    const replyTo = process.env.EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO || "support@wopr.bot";

    if (postmarkKey) {
      logger.info("Email client initialized with Postmark");
      _client = new EmailClient({ apiKey: postmarkKey, from, replyTo, transport: "postmark" });
    } else if (resendKey) {
      logger.info("Email client initialized with Resend");
      _client = new EmailClient({ apiKey: resendKey, from, replyTo, transport: "resend" });
    } else {
      throw new Error("Email not configured: set POSTMARK_API_KEY or RESEND_API_KEY");
    }
  }
  return _client;
}

/** Reset the singleton (for testing). */
export function resetEmailClient(): void {
  _client = null;
}

/** Replace the singleton (for testing). */
export function setEmailClient(client: EmailClient): void {
  _client = client;
}
