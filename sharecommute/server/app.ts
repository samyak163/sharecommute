import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { createAuth } from "./auth.ts";
import { createRideService } from "./rides.ts";
import { HttpError } from "./errors.ts";
import type { Mailer } from "./resend-mailer.ts";
import { createAdminService } from "./admin.ts";

export type AppOptions = {
  secret: string;
  domains: string[];
  mailer: Mailer;
  origins: string[];
  now?: () => number;
  staticDirectory?: string;
  authRequestLimit?: number;
  authCooldownMs?: number;
};
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
function sessionToken(req: IncomingMessage) {
  return req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("sc_session="))
    ?.slice("sc_session=".length);
}
async function readBody(req: IncomingMessage) {
  if (!(req.headers["content-type"] ?? "").startsWith("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const part of req) {
    const chunk = Buffer.from(part);
    size += chunk.length;
    if (size > 16_384) throw new HttpError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON data.");
  }
}

export function createApp(db: DatabaseSync, options: AppOptions) {
  const auth = createAuth(db, {
    secret: options.secret,
    domains: options.domains,
    mailer: options.mailer,
    now: options.now,
    requestLimit: options.authRequestLimit,
    cooldownMs: options.authCooldownMs,
  });
  const rides = createRideService(db, options.now);
  const admin = createAdminService(db, options.now);
  const server = createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? "";
      if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host))
        throw new HttpError(403, "This server only accepts local requests.");
      const url = new URL(req.url ?? "/", `http://${host}`),
        path = url.pathname,
        method = req.method ?? "GET";
      res.setHeader("Referrer-Policy", "same-origin");
      if (path.startsWith("/api/")) {
        if (!["GET", "POST"].includes(method))
          throw new HttpError(405, "Method not allowed.");
        if (
          method === "POST" &&
          (!req.headers.origin || !options.origins.includes(req.headers.origin))
        )
          throw new HttpError(403, "The request origin is not allowed.");
        if (method === "GET" && path === "/api/health")
          return json(res, 200, {
            status: "ok",
            database: "sqlite",
            mode: "local",
          });
        const user = auth.session(sessionToken(req));
        if (method === "GET" && path === "/api/session")
          return json(res, 200, {
            user,
            mailMode: options.mailer.mode,
            verificationAvailable: options.mailer.available !== false,
            allowedDomains: options.domains,
          });
        if (method === "POST" && path === "/api/auth/request-code")
          return json(
            res,
            200,
            await auth.requestCode(
              await readBody(req),
              req.socket.remoteAddress ?? "local",
            ),
          );
        if (method === "POST" && path === "/api/auth/verify") {
          const result = auth.verify(await readBody(req));
          res.setHeader(
            "Set-Cookie",
            `sc_session=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`,
          );
          return json(res, 200, { user: result.user });
        }
        if (method === "POST" && path === "/api/auth/logout") {
          await readBody(req);
          auth.logout(sessionToken(req));
          res.setHeader(
            "Set-Cookie",
            "sc_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
          );
          return json(res, 200, { ok: true });
        }
        if (!user) throw new HttpError(401, "Please sign in to continue.");
        const schedule = path.match(/^\/api\/schedules\/([^/]+)\/stop$/);
        if (method === "POST" && schedule) {
          await readBody(req);
          return json(res, 200, rides.stopSchedule(user, schedule[1]));
        }
        const report = path.match(/^\/api\/rides\/([^/]+)\/report$/);
        if (method === "POST" && report)
          return json(
            res,
            201,
            admin.report(user, report[1], await readBody(req)),
          );
        if (method === "GET" && path === "/api/admin")
          return json(res, 200, admin.overview(user));
        const resolveReport = path.match(
          /^\/api\/admin\/reports\/([^/]+)\/resolve$/,
        );
        if (method === "POST" && resolveReport) {
          await readBody(req);
          return json(res, 200, admin.resolveReport(user, resolveReport[1]));
        }
        const suspend = path.match(/^\/api\/admin\/users\/([^/]+)\/suspend$/);
        if (method === "POST" && suspend)
          return json(
            res,
            200,
            admin.suspend(user, suspend[1], await readBody(req)),
          );
        if (method === "GET" && path === "/api/state")
          return json(res, 200, { state: rides.state(user) });
        if (method === "POST" && path === "/api/rides")
          return json(res, 201, rides.offer(user, await readBody(req)));
        const booking = path.match(/^\/api\/rides\/([^/]+)\/bookings$/);
        if (method === "POST" && booking)
          return json(
            res,
            200,
            rides.book(user, booking[1], await readBody(req)),
          );
        const cancellation = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
        if (method === "POST" && cancellation) {
          await readBody(req);
          return json(res, 200, rides.cancelBooking(user, cancellation[1]));
        }
        const cancelOffer = path.match(/^\/api\/rides\/([^/]+)\/cancel$/);
        if (method === "POST" && cancelOffer) {
          await readBody(req);
          return json(res, 200, rides.cancelOffer(user, cancelOffer[1]));
        }
        throw new HttpError(404, "Endpoint not found.");
      }
      if (method !== "GET" && method !== "HEAD")
        throw new HttpError(405, "Method not allowed.");
      const root = options.staticDirectory && resolve(options.staticDirectory);
      if (!root || !existsSync(resolve(root, "index.html")))
        throw new HttpError(
          404,
          "Run npm run dev for the interface, or build it before npm start.",
        );
      let requested: string;
      try {
        requested = resolve(root, `.${decodeURIComponent(path)}`);
      } catch {
        throw new HttpError(400, "Invalid path.");
      }
      if (requested !== root && !requested.startsWith(root + sep))
        throw new HttpError(403, "Invalid path.");
      if (!existsSync(requested) || !statSync(requested).isFile())
        requested = resolve(root, "index.html");
      const types: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      res.writeHead(200, {
        "Content-Type": types[extname(requested)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": requested.endsWith("index.html")
          ? "no-cache"
          : "public, max-age=3600",
      });
      res.end(method === "HEAD" ? undefined : readFileSync(requested));
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error instanceof HttpError)
        return json(res, error.status, { error: error.message });
      console.error(
        "Request failed:",
        error instanceof Error ? error.message : "unknown error",
      );
      json(res, 500, {
        error: "The server could not complete this request. Please try again.",
      });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return { server, auth, rides };
}
