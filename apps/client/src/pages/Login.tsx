import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Login() {
  const [email, setEmail] = useState("admin@kids.local");
  const [password, setPassword] = useState("ChangeMeNow!23");
  const [totp, setTotp] = useState("");
  const [preToken, setPreToken] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const setToken = useAuth((s) => s.setToken);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const fp = btoa(navigator.userAgent + screen.width).slice(0, 32);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Fingerprint": fp },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Fehler"); return; }
    if (data.requiresTotp) { setPreToken(data.preAuthToken); return; }
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    nav("/");
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preAuthToken: preToken, totpCode: totp }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Fehler"); return; }
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    nav("/");
  }

  if (preToken) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="sidebar-brand">KIDS</div>
          <h1>2FA Code</h1>
          <form onSubmit={submitTotp}>
            <input className="search-input" style={{ width: "100%", marginBottom: 12 }} value={totp} onChange={e => setTotp(e.target.value)} placeholder="6-stelliger Code" />
            {err && <div className="missing-error" style={{ marginBottom: 12 }}>{err}</div>}
            <button className="btn primary" type="submit">Bestätigen</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="sidebar-brand">KIDS</div>
        <h1>Anmelden</h1>
        <form onSubmit={submit}>
          <input className="search-input" style={{ width: "100%", marginBottom: 12 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" />
          <input className="search-input" type="password" style={{ width: "100%", marginBottom: 12 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort" />
          {err && <div className="missing-error" style={{ marginBottom: 12 }}>{err}</div>}
          <button className="btn primary" type="submit">Anmelden</button>
        </form>
      </div>
    </div>
  );
}