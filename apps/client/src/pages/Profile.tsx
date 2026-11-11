import { useState, useEffect } from "react";
import { useAuth } from "../store/auth";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import s from "../styles/page.module.css";

export default function Profile() {
  const user = useAuth(s => s.user);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api("/api/auth/2fa/status").then(d => setEnabled(d.enabled)).catch(() => {}); }, []);

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    try {
      const login = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user?.email || "", password: currentPw }) });
      const envelope = await login.json();
      if (!login.ok || !envelope.ok) { setMsg(envelope.error || "Aktuelles Passwort falsch"); return; }
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ userId: envelope.data.user.id, newPassword: newPw }) });
      setMsg("Passwort geändert");
      setCurrentPw(""); setNewPw("");
    } catch (e: any) { setMsg(e.message); }
  }

  async function start2fa() {
    setErr("");
    const d = await api("/api/auth/2fa/setup", { method: "POST", body: "{}" });
    setQr(d.qr); setSecret(d.secret);
  }
  async function confirm2fa() {
    setErr("");
    try {
      await api("/api/auth/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) });
      setEnabled(true); setQr(""); setSecret(""); setCode("");
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className={s.page}>
      <PageHeader title="Konto" />
      <div className={s.scroll}>
        <form onSubmit={changePw} className={s.section}>
          <h3>Passwort ändern</h3>
          {msg && <p>{msg}</p>}
          <input className={"search-input " + s.field} type="password" placeholder="Aktuelles Passwort" autoComplete="off" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
          <input className={"search-input " + s.field} type="password" placeholder="Neues Passwort" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} required />
          <Button variant="primary" type="submit">Ändern</Button>
        </form>
        <div className={s.section}>
          <h3>Zwei-Faktor-Authentifizierung</h3>
          <p>Status: {enabled ? <span className={s.chip}>Aktiv</span> : <span className={s.chip + " " + s.chipWarn}>Nicht aktiv</span>}</p>
          {!qr && <Button variant="primary" onClick={start2fa}>{enabled ? "Neu einrichten" : "Einrichten"}</Button>}
          {qr && (
            <div className={s.mt}>
              <img src={qr} alt="QR" width={200} height={200} />
              <p className={s.secret}>{secret}</p>
              <input className={"search-input " + s.field} placeholder="Code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <Button variant="primary" onClick={confirm2fa} disabled={code.length < 6}>Bestätigen</Button>
            </div>
          )}
          {err && <p className={s.error}>{err}</p>}
        </div>
      </div>
    </div>
  );
}