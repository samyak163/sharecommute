import { useState, type FormEvent } from "react";
import { GraduationCap, Mail, KeyRound, Info, Check } from "lucide-react";
import { api, type CodeChallenge, type SessionInfo } from "@/lib/api";

export default function SignInPanel({
  session,
  ready,
  reload,
}: {
  session: SessionInfo;
  ready: boolean;
  reload: () => Promise<void>;
}) {
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null),
    [email, setEmail] = useState("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const address = String(form.get("email")).trim();
      setEmail(address);
      setChallenge(
        await api.requestCode({
          email: address,
          name: String(form.get("name")),
          role: String(form.get("role")) as "Student" | "Faculty",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request a code.");
    } finally {
      setPending(false);
    }
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signIn(String(new FormData(event.currentTarget).get("code")));
  }
  async function signIn(code: string) {
    if (!challenge || pending) return;
    setPending(true);
    setError("");
    try {
      await api.verify(challenge.challengeId, code);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setPending(false);
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
            <Check size={17} />
            Your own account and ride history
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
                ? "Enter your sign-in code"
                : "Sign in to ShareCommute"}
            </h2>
            <p>{challenge ? email : "Use your institutional email address."}</p>
          </div>
        </div>
        {error && (
          <p className="warning auth-error" role="alert">
            {error}
          </p>
        )}
        {!ready ? (
          <p className="muted">Connecting to the local server…</p>
        ) : challenge ? (
          <form onSubmit={verify} className="auth-form">
            <label className="field">
              <span>Six-digit code</span>
              <input
                name="code"
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                aria-label="Six-digit code"
                required
                autoFocus
              />
            </label>
            {challenge.delivery === "development" ? (
              <div className="local-mailbox">
                <strong>Local development mailbox</strong>
                <span className="mailbox-code">
                  {challenge.developmentCode}
                </span>
                <p>
                  Use this code to test sign-in. No email was sent, and email
                  ownership is not verified.
                </p>
                <button
                  className="button secondary full"
                  type="button"
                  disabled={pending || !challenge.developmentCode}
                  onClick={() => void signIn(challenge.developmentCode!)}
                >
                  {pending ? "Signing in…" : "Use this test code"}
                </button>
              </div>
            ) : (
              <p className="inline-note">
                <Mail size={17} />
                Check your inbox and spam folder. The code expires in 10
                minutes.
              </p>
            )}
            <button className="button primary full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={pending}
              onClick={() => {
                setChallenge(null);
                setError("");
              }}
            >
              Use another email or request a new code
            </button>
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
                placeholder="Your full name"
                required
              />
            </label>
            <label className="field">
              <span>Institutional email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                defaultValue={email}
                placeholder={`you@${session.allowedDomains[0]}`}
                required
              />
              <small>
                Allowed: {session.allowedDomains.map((d) => `@${d}`).join(", ")}
              </small>
            </label>
            <label className="field">
              <span>Campus role</span>
              <select name="role">
                <option>Student</option>
                <option>Faculty</option>
              </select>
            </label>
            <button className="button primary full" disabled={pending}>
              {pending
                ? "Requesting code…"
                : session.mailMode === "resend"
                  ? "Email me a sign-in code"
                  : "Get a local sign-in code"}
            </button>
          </form>
        )}
        {session.mailMode === "development" && !challenge && (
          <p className="inline-note">
            <Info size={16} />
            Development email mode is active. The next screen shows a test code.
            Resend delivery can be enabled in the local settings.
          </p>
        )}
        <p className="auth-footnote">
          ShareCommute is running on this computer. Your account and bookings
          are saved in the local server database.
        </p>
      </div>
    </section>
  );
}
