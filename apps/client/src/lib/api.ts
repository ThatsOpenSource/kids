import { useAuth } from "../store/auth";

const inflight = new Map<string, Promise<any>>();

export async function api(path: string, opts: RequestInit = {}) {
  const key = path + (opts.method || "GET") + (opts.body || "");
  if (inflight.has(key)) return inflight.get(key);
  const promise = doFetch(path, opts).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function doFetch(path: string, opts: RequestInit) {
  const token = useAuth.getState().token;
  const headers: any = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(path, { ...opts, headers });
  } catch {
    useAuth.getState().logout();
    if (!window.location.pathname.includes("/login")) window.location.href = "/login";
    throw Object.assign(new Error("Server nicht erreichbar"), { code: 0, offline: true });
  }
  if (res.status === 401 && !path.includes("/auth/")) {
    const refresh = localStorage.getItem("refreshToken");
    if (refresh) {
      const retry = await fetch("/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: refresh }) });
      if (retry.ok) {
        const env = await retry.json();
        const data = env.data ?? env;
        useAuth.getState().setToken(data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        headers.Authorization = `Bearer ${data.accessToken}`;
        const res2 = await fetch(path, { ...opts, headers });
        const data2 = await res2.json().catch(() => ({}));
        if (!res2.ok) throw Object.assign(new Error(data2.error || "Fehler"), { raw: data2, code: res2.status });
        return data2.data ?? data2;
      }
    }
    useAuth.getState().logout();
    window.location.href = "/login";
    throw new Error("Nicht angemeldet");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Fehler"), { raw: data, code: res.status, meta: data });
  return data.data ?? data;
}

export function asArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}