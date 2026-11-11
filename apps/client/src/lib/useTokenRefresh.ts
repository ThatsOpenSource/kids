import { useEffect, useRef } from "react";
import { useAuth } from "../store/auth";

let refreshing = false;

export function useTokenRefresh() {
  const token = useAuth(s => s.token);
  const setToken = useAuth(s => s.setToken);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;
    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        if (refreshing) return;
        const refresh = localStorage.getItem("refreshToken");
        if (!refresh) return;
        refreshing = true;
        try {
          const res = await fetch("/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: refresh }) });
          if (res.ok) {
            const env = await res.json();
            const data = env.data ?? env;
            setToken(data.accessToken);
            if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
          }
        } catch {}
        refreshing = false;
        schedule();
      }, 10 * 60 * 1000);
    }
    schedule();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [token, setToken]);
}