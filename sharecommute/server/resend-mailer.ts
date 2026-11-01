import { verificationEmail } from "./verification-email.ts";

export type Mailer = {
  mode: "resend";
  available?: boolean;
  sendCode: (
    email: string,
    code: string,
    challengeId?: string,
  ) => Promise<void>;
};

export class MailDeliveryError extends Error {}

/** Missing settings disable verification. There is deliberately no local-code fallback. */
export function createMailer(
  config: { apiKey?: string; from?: string },
  send: typeof fetch = fetch,
): Mailer {
  const from = config.from?.trim() ?? "";
  const match =
    /^(?:ShareCommute\s*<)?([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>?$/.exec(
      from,
    );
  const address = match?.[1] ?? "";
  const available =
    !!config.apiKey &&
    !!address &&
    !/[\r\n]/.test(from) &&
    !address.toLowerCase().endsWith("@resend.dev");
  return {
    mode: "resend",
    available,
    async sendCode(email, code, challengeId) {
      if (!available)
        throw new MailDeliveryError(
          "Configure RESEND_API_KEY and EMAIL_FROM on a verified sending domain.",
        );
      const content = verificationEmail(code);
      let response: Response;
      try {
        response = await send("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(15_000),
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            ...(challengeId
              ? { "Idempotency-Key": `verification/${challengeId}` }
              : {}),
          },
          body: JSON.stringify({
            from: `ShareCommute <${address}>`,
            to: [email],
            ...content,
          }),
        });
      } catch {
        throw new MailDeliveryError(
          "Email provider could not be reached. Check the server connection.",
        );
      }
      if (!response.ok) {
        const reason =
          response.status === 403
            ? "Check the sending domain verification and API-key permissions."
            : response.status === 401
              ? "Check the Resend API key."
              : response.status === 429
                ? "The email provider rate limit was reached."
                : "Check the email provider status and sender settings.";
        throw new MailDeliveryError(
          `Email provider rejected delivery (${response.status}). ${reason}`,
        );
      }
      let receipt: { id?: unknown };
      try {
        receipt = await response.json();
      } catch {
        throw new MailDeliveryError(
          "The email provider returned an invalid delivery receipt.",
        );
      }
      if (typeof receipt.id !== "string" || !receipt.id)
        throw new MailDeliveryError(
          "The email provider did not accept this verification email.",
        );
    },
  };
}
