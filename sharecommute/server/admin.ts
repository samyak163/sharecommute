import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { HttpError } from "./errors.ts";
import { transaction } from "./database.ts";
import type { User } from "./auth.ts";

export function createAdminService(db: DatabaseSync, now = Date.now) {
  const requireAdmin = (user: User) => {
    if (!user.isAdmin)
      throw new HttpError(403, "Administrator access is required.");
  };
  return {
    report(user: User, rideId: string, input: unknown) {
      const parsed = z
        .object({ reason: z.string().trim().min(10).max(500) })
        .safeParse(input);
      if (!parsed.success)
        throw new HttpError(400, "Describe the issue in 10 to 500 characters.");
      const ride = db
        .prepare("SELECT owner_id FROM rides WHERE id=?")
        .get(rideId);
      if (!ride || ride.owner_id === user.id)
        throw new HttpError(400, "Choose another member’s ride to report.");
      if (
        db
          .prepare(
            "SELECT id FROM reports WHERE reporter_id=? AND ride_id=? AND status='open'",
          )
          .get(user.id, rideId)
      )
        throw new HttpError(
          409,
          "You already have an open report for this ride.",
        );
      if (
        Number(
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM reports WHERE reporter_id=? AND created_at>?",
            )
            .get(user.id, now() - 3600000)?.n,
        ) >= 5
      )
        throw new HttpError(
          429,
          "Please wait before submitting another report.",
        );
      db.prepare(
        "INSERT INTO reports(id,reporter_id,ride_id,reason,created_at) VALUES(?,?,?,?,?)",
      ).run(randomUUID(), user.id, rideId, parsed.data.reason, now());
      return { ok: true };
    },
    overview(user: User) {
      requireAdmin(user);
      return {
        counts: {
          members: Number(
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM users WHERE verification<>'sample'",
              )
              .get()!.n,
          ),
          openRides: Number(
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM rides WHERE status='open' AND departure_ms>?",
              )
              .get(now())!.n,
          ),
          bookings: Number(
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.status='confirmed' AND r.departure_ms>?",
              )
              .get(now())!.n,
          ),
          reports: Number(
            db
              .prepare("SELECT COUNT(*) AS n FROM reports WHERE status='open'")
              .get()!.n,
          ),
        },
        users: db
          .prepare(
            "SELECT id,name,email,role,verification,is_admin AS isAdmin,suspended FROM users WHERE verification<>'sample' ORDER BY created_at DESC LIMIT 200",
          )
          .all(),
        reports: db
          .prepare(
            "SELECT p.id,p.reason,p.status,p.created_at AS createdAt,r.origin,r.destination,r.host_id,u.name AS reporter FROM reports p JOIN (SELECT id,origin,destination,owner_id AS host_id FROM rides) r ON r.id=p.ride_id JOIN users u ON u.id=p.reporter_id ORDER BY p.created_at DESC LIMIT 100",
          )
          .all(),
      };
    },
    resolveReport(user: User, id: string) {
      requireAdmin(user);
      const result = db
        .prepare(
          "UPDATE reports SET status='resolved',resolved_at=? WHERE id=?",
        )
        .run(now(), id);
      if (!result.changes) throw new HttpError(404, "Report not found.");
      return { ok: true };
    },
    suspend(user: User, id: string, input: unknown) {
      requireAdmin(user);
      const parsed = z.object({ suspended: z.boolean() }).safeParse(input);
      if (!parsed.success)
        throw new HttpError(400, "Choose suspend or restore.");
      const target = db
        .prepare("SELECT * FROM users WHERE id=? AND verification<>'sample'")
        .get(id);
      if (!target) throw new HttpError(404, "Member not found.");
      if (target.is_admin || id === user.id)
        throw new HttpError(
          400,
          "Administrator accounts cannot be suspended here.",
        );
      transaction(db, () => {
        db.prepare("UPDATE users SET suspended=? WHERE id=?").run(
          parsed.data.suspended ? 1 : 0,
          id,
        );
        if (parsed.data.suspended) {
          db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
          db.prepare(
            "UPDATE login_challenges SET consumed=1 WHERE email=?",
          ).run(String(target.email));
          db.prepare(
            "UPDATE recurring_templates SET active=0 WHERE owner_id=?",
          ).run(id);
          db.prepare(
            "UPDATE bookings SET status='cancelled' WHERE status='confirmed' AND ride_id IN (SELECT id FROM rides WHERE departure_ms>?) AND (user_id=? OR ride_id IN (SELECT id FROM rides WHERE owner_id=?))",
          ).run(now(), id, id);
          db.prepare(
            "UPDATE rides SET status='cancelled' WHERE owner_id=? AND departure_ms>?",
          ).run(id, now());
        }
      });
      return { ok: true };
    },
  };
}
