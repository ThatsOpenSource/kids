import { useEffect, useRef } from "react";
import { useAuth } from "../store/auth";

const IDLE_MS = 5 * 60 * 1000;
const GRACE_MS = 2 * 60 * 1000;

export function useIdleLogout() {
  const logout = useAuth(s => s.logout);
  const token = useAuth(s => s.token);
  const idleTimer = useRef<number | null>(null);
  const graceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;
    function reset() {
      if (graceTimer.current) { clearTimeout(graceTimer.current); graceTimer.current = null; }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        graceTimer.current = window.setTimeout(() => {
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("deviceFingerprint");
          logout();
          window.location.href = "/login";
        }, GRACE_MS);
      }, IDLE_MS);
    }
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (graceTimer.current) clearTimeout(graceTimer.current);
    };
  }, [token, logout]);
}