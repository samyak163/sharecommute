import test from "node:test";
import assert from "node:assert/strict";
import { createMailer } from "../server/resend-mailer.ts";
import { verificationEmail } from "../server/verification-email.ts";

test("verification email includes matching HTML and plain-text codes and expiry", () => {
  const message = verificationEmail("048219");
  for (const content of [message.subject, message.text, message.html])
    assert.ok(content.includes("048219"));
  assert.match(message.html, /Verify your college email/);
  assert.match(message.text, /10 minutes/);
  assert.match(message.html, /10 minutes/);
  assert.throws(() => verificationEmail("<script>"));
});

test("Resend sends branded content only to the requested recipient and checks acceptance", async () => {
  let received;
  const sender = createMailer(
    { apiKey: "test-key", from: "ShareCommute <no-reply@example.com>" },
    async (url, options) => {
      received = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: "accepted-email" }), {
        status: 200,
      });
    },
  );
  assert.equal(sender.available, true);
  await sender.sendCode("student@mitwpu.edu.in", "123456", "test-challenge");
  assert.equal(received.url, "https://api.resend.com/emails");
  assert.deepEqual(received.body.to, ["student@mitwpu.edu.in"]);
  assert.equal(received.body.from, "ShareCommute <no-reply@example.com>");
  assert.equal(
    received.options.headers["Idempotency-Key"],
    "verification/test-challenge",
  );
  assert.match(received.body.html, /123456/);
  assert.equal(received.options.headers.Authorization, "Bearer test-key");
});

test("missing configuration and sandbox senders cannot fall back to a local code", async () => {
  for (const config of [
    {},
    { apiKey: "test-key" },
    { apiKey: "test-key", from: "onboarding@resend.dev" },
    { apiKey: "test-key", from: "bad\r\naddress@example.com" },
  ]) {
    let called = false;
    const sender = createMailer(config, async () => {
      called = true;
      throw new Error("Unexpected call");
    });
    assert.equal(sender.available, false);
    await assert.rejects(
      sender.sendCode("student@mitwpu.edu.in", "123456"),
      /verified sending domain/,
    );
    assert.equal(called, false);
  }
});

test("provider rejection, bad receipts and timeouts are not successful sends", async () => {
  for (const status of [401, 403, 429, 500]) {
    const sender = createMailer(
      { apiKey: "test-key", from: "no-reply@example.com" },
      async () => new Response("{}", { status }),
    );
    await assert.rejects(
      sender.sendCode("student@mitwpu.edu.in", "123456"),
      new RegExp(String(status)),
    );
  }
  const malformed = createMailer(
    { apiKey: "test-key", from: "no-reply@example.com" },
    async () => new Response("{}", { status: 200 }),
  );
  await assert.rejects(
    malformed.sendCode("student@mitwpu.edu.in", "123456"),
    /did not accept/,
  );
  const offline = createMailer(
    { apiKey: "test-key", from: "no-reply@example.com" },
    async () => {
      throw new Error("network");
    },
  );
  await assert.rejects(
    offline.sendCode("student@mitwpu.edu.in", "123456"),
    /could not be reached/,
  );
});
