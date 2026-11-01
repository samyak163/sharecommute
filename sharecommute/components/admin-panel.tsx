import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { api, type AdminOverview } from "@/lib/api";
import { place } from "@/lib/commute";
import Modal from "./commute-modal";

export default function AdminPanel() {
  const [data, setData] = useState<AdminOverview | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{
    id: string;
    name: string;
    suspended: boolean;
  } | null>(null);
  async function load() {
    try {
      setData(await api.admin());
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load administration.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function act(action: () => Promise<unknown>) {
    if (pending) return;
    setPending(true);
    try {
      await action();
      await load();
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The action failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="admin-panel">
      <div className="my-rides-heading">
        <div>
          <p className="eyebrow">CAMPUS ADMINISTRATION</p>
          <h1>Community overview</h1>
          <p className="muted">Review reports and manage member access.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => void load()}
          disabled={pending}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      {data ? (
        <>
          <div className="admin-counts">
            {Object.entries(data.counts).map(([key, value]) => (
              <div key={key}>
                <strong>{value}</strong>
                <span>
                  {
                    {
                      members: "Members",
                      openRides: "Upcoming open rides",
                      bookings: "Upcoming bookings",
                      reports: "Open reports",
                    }[key]
                  }
                </span>
              </div>
            ))}
          </div>
          <h2>Ride reports</h2>
          {data.reports.length === 0 ? (
            <p className="admin-empty">No reports have been submitted.</p>
          ) : (
            <div className="report-list">
              {data.reports.map((report) => (
                <article key={report.id} className="my-ride-card">
                  <div className="my-ride-top">
                    <strong>
                      {place(report.origin).short} to{" "}
                      {place(report.destination).short}
                    </strong>
                    <span className="type-badge">{report.status}</span>
                  </div>
                  <p>{report.reason}</p>
                  <div className="my-ride-bottom">
                    <small>Reported by {report.reporter}</small>
                    {report.status === "open" && (
                      <button
                        className="button small secondary"
                        disabled={pending}
                        onClick={() =>
                          void act(() => api.resolveReport(report.id))
                        }
                      >
                        Mark resolved
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <h2>Members</h2>
          <p className="muted">
            Suspending a member signs them out, stops their schedules and
            cancels their upcoming bookings and offers. Restoring access does
            not restore cancelled rides.
          </p>
          <div className="member-list">
            {data.users.map((member) => (
              <article className="member-row" key={member.id}>
                <div>
                  <strong>
                    {member.name}
                    {member.isAdmin ? <ShieldCheck size={15} /> : null}
                  </strong>
                  <span>{member.email}</span>
                  <small>
                    {member.role} ·{" "}
                    {member.verification === "email"
                      ? "Email verified"
                      : "Email not verified"}
                    {member.suspended ? " · Suspended" : ""}
                  </small>
                </div>
                {!member.isAdmin && (
                  <button
                    className={`button small ${member.suspended ? "secondary" : "destructive"}`}
                    disabled={pending}
                    onClick={() =>
                      setConfirm({
                        id: member.id,
                        name: member.name,
                        suspended: !member.suspended,
                      })
                    }
                  >
                    {member.suspended ? "Restore access" : "Suspend"}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Loading local records…</p>
      )}
      {confirm && (
        <Modal
          title={
            confirm.suspended
              ? "Suspend this member?"
              : "Restore member access?"
          }
          close={() => {
            if (!pending) setConfirm(null);
          }}
          errorMessage={error || undefined}
        >
          <p className="muted">
            {confirm.suspended
              ? `${confirm.name} will be signed out. Their future rides and bookings will be cancelled, and recurring schedules stopped.`
              : `${confirm.name} will be able to sign in again. Previously cancelled rides stay cancelled.`}
          </p>
          <div className="confirm-actions">
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => setConfirm(null)}
            >
              Back
            </button>
            <button
              className={`button ${confirm.suspended ? "destructive" : "primary"}`}
              disabled={pending}
              onClick={() =>
                void act(() => api.suspend(confirm.id, confirm.suspended))
              }
            >
              {pending
                ? "Saving…"
                : confirm.suspended
                  ? "Suspend member"
                  : "Restore access"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
