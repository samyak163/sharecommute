export type Mailer = {
  mode: "development" | "resend";
  sendCode: (email: string, code: string) => Promise<void>;
};
export function createMailer(config: {
  mode: string;
  apiKey?: string;
  from?: string;
}): Mailer {
  if (config.mode === "development")
    return { mode: "development", async sendCode() {} };
  if (config.mode !== "resend")
    throw new Error("MAIL_MODE must be development or resend.");
  if (!config.apiKey || !config.from)
    throw new Error(
      "Resend mode requires RESEND_API_KEY and EMAIL_FROM in .env.",
    );
  return {
    mode: "resend",
    async sendCode(email, code) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [email],
          subject: "Your ShareCommute sign-in code",
          text: `Your ShareCommute sign-in code is ${code}.\n\nIt expires in 10 minutes and can be used once. If you did not request it, ignore this email.\n\nShareCommute campus ride sharing`,
        }),
      });
      if (!response.ok)
        throw new Error(
          `Email provider rejected delivery (${response.status}).`,
        );
    },
  };
}
