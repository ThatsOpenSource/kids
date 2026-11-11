import { useEffect, useRef } from "react";
import { useAuth } from "../store/auth";

export function useTokenRefresh() {
  const setToken = useAuth(s => s.setToken);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        const refresh = localStorage.getItem("refreshToken");
        if (!refresh) return;
        try {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refresh }),
          });
          if (res.ok) {
            const data = await res.json();
            setToken(data.accessToken);
            if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
          }
        } catch { /* ignore */ }
        schedule();
      }, 12 * 60 * 1000);
    }

    function onActivity() {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      schedule();
    }

    ["click", "keydown", "mousemove"].forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    schedule();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      ["click", "keydown", "mousemove"].forEach(ev => window.removeEventListener(ev, onActivity));
    };
  }, [setToken]);
}