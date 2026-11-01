import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { transaction } from "./database.ts";
import { HttpError } from "./errors.ts";
import { MailDeliveryError, type Mailer } from "./resend-mailer.ts";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "Student" | "Faculty";
  verification: "development" | "email" | "sample";
  isAdmin: boolean;
};
type UserRow = {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  verification: User["verification"];
  is_admin: number;
  suspended: number;
};
type Challenge = {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  code_hash: string;
  verification: "development" | "email";
  expires_at: number;
  attempts: number;
  consumed: number;
};
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
export const sessionHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const publicUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  verification: row.verification,
  isAdmin: row.is_admin === 1,
});
const requestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  name: z.string().trim().min(2).max(60),
  role: z.enum(["Student", "Faculty"]),
});
const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export function createAuth(
  db: DatabaseSync,
  options: {
    secret: string;
    domains: string[];
    mailer: Mailer;
    now?: () => number;
    requestLimit?: number;
    cooldownMs?: number;
  },
) {
  const now = options.now ?? Date.now;
  const codeHash = (challengeId: string, code: string) =>
    createHmac("sha256", options.secret)
      .update(`${challengeId}:${code}`)
      .digest("hex");
  return {
    async requestCode(input: unknown, ip: string) {
      const value = requestSchema.safeParse(input);
      if (!value.success)
        throw new HttpError(
          400,
          "Enter your name, a valid email address and your campus role.",
        );
      const data = value.data,
        domain = data.email.split("@")[1];
      if (!options.domains.includes(domain))
        throw new HttpError(
          400,
          `Use an email ending in ${options.domains.map((d) => "@" + d).join(" or ")}.`,
        );
      if (options.mailer.available === false)
        throw new HttpError(
          503,
          "Email verification is temporarily unavailable. Please contact the project administrator.",
        );
      const timestamp = now();
      const result = transaction(db, () => {
        const blocked = db
          .prepare("SELECT suspended, verification FROM users WHERE email = ?")
          .get(data.email);
        if (blocked?.suspended)
          throw new HttpError(403, "This account is suspended.");
        if (blocked?.verification === "sample")
          throw new HttpError(403, "Sample profiles cannot sign in.");
        const recent = db
          .prepare(
            "SELECT COUNT(*) AS count FROM login_challenges WHERE requested_at > ? AND (email = ? OR ip = ?)",
          )
          .get(timestamp - 600_000, data.email, ip);
        if (Number(recent?.count) >= (options.requestLimit ?? 10))
          throw new HttpError(
            429,
            "Too many sign-in requests. Please try again in 10 minutes.",
          );
        const previous = db
          .prepare(
            "SELECT requested_at FROM login_challenges WHERE email = ? ORDER BY requested_at DESC LIMIT 1",
          )
          .get(data.email);
        if (
          previous &&
          timestamp - Number(previous.requested_at) <
            (options.cooldownMs ?? 60_000)
        )
          throw new HttpError(
            429,
            "Please wait one minute before requesting another code.",
          );
        db.prepare(
          "UPDATE login_challenges SET consumed = 1 WHERE email = ? AND consumed = 0",
        ).run(data.email);
        const challengeId = randomUUID(),
          code = String(randomInt(0, 1_000_000)).padStart(6, "0"),
          expiresAt = timestamp + 600_000;
        db.prepare(
          "INSERT INTO login_challenges(id,email,name,role,code_hash,verification,requested_at,expires_at,ip) VALUES(?,?,?,?,?,?,?,?,?)",
        ).run(
          challengeId,
          data.email,
          data.name,
          data.role,
          codeHash(challengeId, code),
          "email",
          timestamp,
          expiresAt,
          ip,
        );
        return { challengeId, code, expiresAt };
      });
      try {
        await options.mailer.sendCode(
          data.email,
          result.code,
          result.challengeId,
        );
      } catch (error) {
        console.error(
          "Verification email failed:",
          error instanceof MailDeliveryError
            ? error.message
            : "Email delivery is unavailable.",
        );
        db.prepare("UPDATE login_challenges SET consumed = 1 WHERE id = ?").run(
          result.challengeId,
        );
        throw new HttpError(
          503,
          "The verification email could not be sent. Please try again in a minute or contact the project administrator.",
        );
      }
      return {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        delivery: options.mailer.mode,
        resendAfterSeconds: 60,
      };
    },
    verify(input: unknown) {
      const parsed = verifySchema.safeParse(input);
      if (!parsed.success)
        throw new HttpError(400, "Enter the six-digit code.");
      const { challengeId, code } = parsed.data;
      const outcome = transaction(db, () => {
        const challenge = db
          .prepare("SELECT * FROM login_challenges WHERE id = ?")
          .get(challengeId) as Challenge | undefined;
        if (
          !challenge ||
          challenge.verification !== "email" ||
          challenge.consumed ||
          challenge.expires_at <= now() ||
          challenge.attempts >= 5
        )
          return {
            error:
              "This code has expired or is no longer usable. Request a new one.",
          };
        db.prepare(
          "UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ?",
        ).run(challengeId);
        if (
          !timingSafeEqual(
            Buffer.from(challenge.code_hash, "hex"),
            Buffer.from(codeHash(challengeId, code), "hex"),
          )
        )
          return { error: "The code is incorrect. Try again." };
        db.prepare("UPDATE login_challenges SET consumed = 1 WHERE id = ?").run(
          challengeId,
        );
        let row = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(challenge.email) as UserRow | undefined;
        if (!row) {
          const userId = randomUUID();
          db.prepare(
            "INSERT INTO users(id,email,name,role,verification,created_at) VALUES(?,?,?,?,?,?)",
          ).run(
            userId,
            challenge.email,
            challenge.name,
            challenge.role,
            challenge.verification,
            now(),
          );
          row = db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(userId) as UserRow;
        }
        if (row.suspended || row.verification === "sample")
          return { error: "This account cannot sign in." };
        if (
          challenge.verification === "email" &&
          row.verification === "development"
        ) {
          // A development session never becomes a verified session merely
          // because somebody else later proves ownership of the email.
          db.prepare("DELETE FROM sessions WHERE user_id = ?").run(row.id);
          db.prepare(
            "UPDATE users SET verification = 'email' WHERE id = ?",
          ).run(row.id);
          row.verification = "email";
        }
        const token = randomBytes(32).toString("base64url");
        db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          sessionHash(token),
          row.id,
          now() + SESSION_DURATION,
        );
        return { token, user: publicUser(row) };
      });
      if ("error" in outcome) throw new HttpError(400, outcome.error!);
      return outcome;
    },
    session(token?: string): User | null {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const row = db
        .prepare(
          "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.suspended = 0",
        )
        .get(sessionHash(token), now()) as UserRow | undefined;
      return row?.verification === "email" ? publicUser(row) : null;
    },
    logout(token?: string) {
      if (token)
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
          sessionHash(token),
        );
    },
  };
}
