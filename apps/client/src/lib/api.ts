export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body && typeof opts.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
    const err: any = new Error(data.error || `HTTP ${res.status}`);
    err.code = data.code;
    err.requestId = data.requestId;
    err.details = data.details;
    err.timestamp = data.timestamp;
    err.raw = data;
    throw err;
  }
  return data;
}

export function asArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}