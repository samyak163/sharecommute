import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type SessionInfo } from "@/lib/api";
import type { CommuteState } from "@/lib/commute";

const empty: CommuteState = { version: 1, rides: [], bookings: [] };
export function useCommuteSession() {
  const [state, setState] = useState<CommuteState>(empty);
  const [session, setSession] = useState<SessionInfo>({
    user: null,
    mailMode: "resend",
    verificationAvailable: false,
    allowedDomains: ["mitwpu.edu.in"],
  });
  const [ready, setReady] = useState(false),
    [warning, setWarning] = useState("");
  const generation = useRef(0),
    busy = useRef(false);
  const reload = useCallback(async () => {
    if (busy.current) return;
    const requestId = ++generation.current;
    try {
      const next = await api.session();
      const data = next.user ? await api.state() : { state: empty };
      if (generation.current !== requestId) return;
      setSession(next);
      setState(data.state);
      setWarning("");
    } catch (error) {
      if (generation.current !== requestId) return;
      if (error instanceof ApiError && error.status === 401) {
        setSession((s) => ({ ...s, user: null }));
        setState(empty);
      }
      setWarning(
        error instanceof Error
          ? error.message
          : "Could not load the local server.",
      );
    } finally {
      if (generation.current === requestId) setReady(true);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (session.user && document.visibilityState === "visible") void reload();
    }, 15000);
    return () => clearInterval(timer);
  }, [reload, session.user]);
  const apply = useCallback((next: CommuteState) => {
    generation.current++;
    setState(next);
    setWarning("");
  }, []);
  const signOut = useCallback(async () => {
    generation.current++;
    await api.logout();
    setSession((s) => ({ ...s, user: null }));
    setState(empty);
  }, []);
  return { state, session, ready, warning, reload, apply, signOut, busy };
}
