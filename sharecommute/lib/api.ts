import type { CommuteState, OfferInput } from "./commute";

export type AdminOverview = {
  counts: {
    members: number;
    openRides: number;
    bookings: number;
    reports: number;
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    verification: string;
    isAdmin: number;
    suspended: number;
  }[];
  reports: {
    id: string;
    reason: string;
    status: string;
    createdAt: number;
    origin: string;
    destination: string;
    reporter: string;
  }[];
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "Student" | "Faculty";
  verification: "email";
  isAdmin: boolean;
};
export type SessionInfo = {
  user: CurrentUser | null;
  mailMode: "resend";
  verificationAvailable: boolean;
  allowedDomains: string[];
};
export type CodeChallenge = {
  challengeId: string;
  expiresAt: number;
  delivery: "resend";
  resendAfterSeconds: number;
};
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the local server. Check that npm run dev is running, then try again.",
    );
  }
  let data: T & { error?: string };
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "The server returned an unexpected response. Please try again.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error ?? "The request could not be completed.",
    );
  return data;
}
export const api = {
  session: () => request<SessionInfo>("/api/session"),
  state: () => request<{ state: CommuteState }>("/api/state"),
  requestCode: (data: {
    email: string;
    name: string;
    role: "Student" | "Faculty";
  }) => request<CodeChallenge>("/api/auth/request-code", data),
  verify: (challengeId: string, code: string) =>
    request<{ user: CurrentUser }>("/api/auth/verify", { challengeId, code }),
  logout: () => request<{ ok: true }>("/api/auth/logout", {}),
  offer: (ride: OfferInput) =>
    request<{ state: CommuteState; id: string }>("/api/rides", ride),
  book: (rideId: string, seats: number, key: string) =>
    request<{ state: CommuteState; id: string }>(
      `/api/rides/${encodeURIComponent(rideId)}/bookings`,
      { seats, idempotencyKey: key },
    ),
  cancelBooking: (id: string) =>
    request<{ state: CommuteState }>(
      `/api/bookings/${encodeURIComponent(id)}/cancel`,
      {},
    ),
  cancelOffer: (id: string) =>
    request<{ state: CommuteState }>(
      `/api/rides/${encodeURIComponent(id)}/cancel`,
      {},
    ),
  stopSchedule: (id: string) =>
    request<{ state: CommuteState }>(
      `/api/schedules/${encodeURIComponent(id)}/stop`,
      {},
    ),
  report: (id: string, reason: string) =>
    request<{ ok: true }>(`/api/rides/${encodeURIComponent(id)}/report`, {
      reason,
    }),
  admin: () => request<AdminOverview>("/api/admin"),
  resolveReport: (id: string) =>
    request<{ ok: true }>(
      `/api/admin/reports/${encodeURIComponent(id)}/resolve`,
      {},
    ),
  suspend: (id: string, suspended: boolean) =>
    request<{ ok: true }>(
      `/api/admin/users/${encodeURIComponent(id)}/suspend`,
      { suspended },
    ),
};
