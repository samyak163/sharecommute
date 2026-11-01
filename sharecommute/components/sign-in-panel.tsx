import { useEffect, useState, type FormEvent } from "react";
import {
  GraduationCap,
  Mail,
  KeyRound,
  Check,
  ShieldCheck,
} from "lucide-react";
import { api, type CodeChallenge, type SessionInfo } from "@/lib/api";

type Details = { name: string; email: string; role: "Student" | "Faculty" };
export default function SignInPanel({
  session,
  ready,
  reload,
}: {
  session: SessionInfo;
  ready: boolean;
  reload: () => Promise<void>;
}) {
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [details, setDetails] = useState<Details>({
    name: "",
    email: "",
    role: "Student",
  });
  const [pending, setPending] = useState<"sending" | "verifying" | null>(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [resendAt, setResendAt] = useState(0);
  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);
  const resendSeconds = Math.max(0, Math.ceil((resendAt - clock) / 1000));
  const expired = challenge !== null && clock >= challenge.expiresAt;
  async function sendCode(value: Details) {
    if (pending) return;
    setPending("sending");
    setError("");
    try {
      const result = await api.requestCode(value);
      setDetails(value);
      setChallenge(result);
      const now = Date.now();
      setClock(now);
      setResendAt(now + result.resendAfterSeconds * 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not send the verification email. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }
  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await sendCode({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim().toLowerCase(),
      role: String(form.get("role")) as Details["role"],
    });
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || pending || expired) return;
    const code = String(new FormData(event.currentTarget).get("code"));
    setPending("verifying");
    setError("");
    try {
      await api.verify(challenge.challengeId, code);
      await reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not verify the code. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="auth-emblem">
          <GraduationCap size={30} />
        </span>
        <p className="eyebrow">YOUR CAMPUS. YOUR PEOPLE.</p>
        <h1>
          Your next shared ride
          <br />
          <span>starts here.</span>
        </h1>
        <p>
          Find people heading your way, share a seat, and keep your campus
          commute simple.
        </p>
        <ul>
          <li>
            <Check size={17} />
            Ride offers and bookings in one place
          </li>
          <li>
            <Check size={17} />
            Clear, equal journey cost sharing
          </li>
          <li>
            <ShieldCheck size={17} />
            Sign in with your verified college email
          </li>
        </ul>
      </div>
      <div className="auth-card">
        <div className="auth-card-title">
          <span className="brand-mark">
            {challenge ? <KeyRound size={23} /> : <Mail size={23} />}
          </span>
          <div>
            <h2>
              {challenge
                ? "Check your college inbox"
                : "Welcome to ShareCommute"}
            </h2>
            <p>
              {challenge
                ? `We sent a verification code to ${details.email}`
                : "Sign in with your college email."}
            </p>
          </div>
        </div>
        {error && (
          <p className="warning auth-error" role="alert">
            {error}
          </p>
        )}
        {!ready ? (
          <p className="muted">Connecting…</p>
        ) : challenge ? (
          <form
            key={challenge.challengeId}
            onSubmit={verify}
            className="auth-form"
          >
            <label className="field">
              <span>Verification code</span>
              <input
                name="code"
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                aria-label="Verification code"
                required
                autoFocus
                disabled={!!pending || expired}
              />
            </label>
            <p className="verification-hint">
              {expired
                ? "This code has expired. Request a new one below."
                : "Enter the six-digit code from your email. It expires in 10 minutes. Check spam or junk if it hasn’t arrived."}
            </p>
            <button
              className="button primary full"
              disabled={!!pending || expired}
            >
              {pending === "verifying"
                ? "Verifying…"
                : "Verify email and sign in"}
            </button>
            <div className="verification-actions">
              <button
                type="button"
                className="text-button"
                disabled={!!pending || resendSeconds > 0}
                onClick={() => void sendCode(details)}
              >
                {pending === "sending"
                  ? "Sending…"
                  : resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : "Resend code"}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={!!pending}
                onClick={() => {
                  setChallenge(null);
                  setError("");
                }}
              >
                Use another email
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={requestCode} className="auth-form">
            <label className="field">
              <span>Your name</span>
              <input
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={60}
                defaultValue={details.name}
                placeholder="Your full name"
                required
              />
            </label>
            <label className="field">
              <span>College email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                defaultValue={details.email}
                placeholder={`you@${session.allowedDomains[0]}`}
                required
              />
              <small>
                For students and faculty with an @mitwpu.edu.in address.
              </small>
            </label>
            <label className="field">
              <span>Campus role</span>
              <select name="role" defaultValue={details.role}>
                <option>Student</option>
                <option>Faculty</option>
              </select>
            </label>
            <button
              className="button primary full"
              disabled={!!pending || !session.verificationAvailable}
            >
              {pending === "sending"
                ? "Sending verification email…"
                : "Send verification code"}
            </button>
            {!session.verificationAvailable && (
              <p className="warning auth-error" role="status">
                Email verification is temporarily unavailable. Please contact
                the project administrator.
              </p>
            )}
          </form>
        )}
        <p className="auth-footnote">
          <ShieldCheck size={15} />
          Only a code delivered to your college inbox can verify your email.
        </p>
      </div>
    </section>
  );
}
