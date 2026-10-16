import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function ReportForm({
  rideId,
  done,
}: {
  rideId: string;
  done: () => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const reason = String(new FormData(e.currentTarget).get("reason"));
    try {
      await api.report(rideId, reason);
      done();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not submit report.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      <label className="field">
        <span>What happened?</span>
        <textarea
          name="reason"
          minLength={10}
          maxLength={500}
          rows={4}
          required
          placeholder="Describe the issue so a campus administrator can review it."
        />
      </label>
      <p className="muted">
        Reports are visible to administrators. This form does not contact
        emergency services.
      </p>
      <button className="button primary" disabled={pending}>
        {pending ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
