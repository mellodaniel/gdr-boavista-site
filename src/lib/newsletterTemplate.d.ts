export type NewsletterImage = { url: string; caption: string };
export type NewsletterPartner = { name: string; logo_url: string | null; website_url: string | null };
export function buildNewsletterHtml(options: {
  communication: { newsletter_edition?: number | null; newsletter_issued_at?: string | null; subject?: string | null; title?: string | null; preview_text?: string | null; body?: string; images?: NewsletterImage[] };
  subscriber: { name?: string | null; unsubscribe_token?: string | null };
  emailTemplate?: string;
  partners?: NewsletterPartner[];
}): string;
export function getUnsubscribeUrl(subscriber: { unsubscribe_token?: string | null }): string | null;
export function escapeHtml(value: unknown): string;
export function normalizeEmail(value: unknown): string;
export function isValidEmail(value: string): boolean;
export function normalizeEmailTemplate(value: unknown): string;
