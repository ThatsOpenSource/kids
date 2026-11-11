import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { api } from "../lib/api";
import Button from "../components/Button";
import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [userId, setUserId] = useState("");
  const setToken = useAuth(s => s.setToken);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const envelope = await res.json();
    if (!res.ok || !envelope.ok) { setErr(envelope.error || "Fehler"); return; }
    const data = envelope.data;
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    if (data.user.mustChangePassword) { setMustChange(true); setUserId(data.user.id); return; }
    if (data.user.role === "admin" && !data.user.totpEnabled) { setNeed2fa(true); return; }
    nav("/");
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, newPassword: newPw }) });
    setMustChange(false);
    setNeed2fa(true);
  }

  if (mustChange) {
    return (
      <div className={styles.shell}>
        <form className={styles.card} onSubmit={changePw}>
          <h2 className={styles.title}>Passwort ändern</h2>
          <p className={styles.muted}>Beim ersten Login muss das Passwort geändert werden.</p>
          <input className={"search-input " + styles.input} type="password" placeholder="Neues Passwort" autoComplete="new-password" value={newPw} onChange={e => setNewPw(e.target.value)} required />
          <Button variant="primary" type="submit">Speichern</Button>
        </form>
      </div>
    );
  }

  if (need2fa) {
    return (
      <div className={styles.shell}>
        <div className={styles.card}>
          <h2 className={styles.title}>2FA einrichten</h2>
          <p className={styles.muted}>Als Administrator ist 2FA erforderlich.</p>
          {!qr && <Button variant="primary" onClick={async () => { const d = await api("/api/auth/2fa/setup", { method: "POST", body: "{}" }); setQr(d.qr); setSecret(d.secret); }}>QR-Code anzeigen</Button>}
          {qr && (
            <>
              <img className={styles.qr} src={qr} alt="QR" width={200} height={200} />
              <p className={styles.secret}>{secret}</p>
              <input className={"search-input " + styles.input} placeholder="Code" value={code} onChange={e => setCode(e.target.value)} />
              <Button variant="primary" onClick={async () => { await api("/api/auth/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) }); nav("/"); }}>Bestätigen</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <form className={styles.card} onSubmit={submit}>
        <h2 className={styles.title}>KIDS</h2>
        {err && <p className={styles.error}>{err}</p>}
        <input className={"search-input " + styles.input} placeholder="E-Mail" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className={"search-input " + styles.input} type="password" placeholder="Passwort" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Button variant="primary" type="submit">Anmelden</Button>
      </form>
    </div>
  );
}