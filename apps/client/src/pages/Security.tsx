import { useState, useEffect } from "react";
import { api } from "../lib/api";
import Button from "../components/Button";
import s from "../styles/page.module.css";

export default function Security() {
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { api("/api/auth/2fa/status").then(d => setEnabled(d.enabled)).catch(() => {}); }, []);

  async function start() {
    setErr("");
    const d = await api("/api/auth/2fa/setup", { method: "POST", body: "{}" });
    setQr(d.qr); setSecret(d.secret);
  }
  async function confirm() {
    setErr("");
    try {
      await api("/api/auth/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) });
      setEnabled(true); setQr(""); setSecret(""); setCode(""); setMsg("2FA ist aktiv.");
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}><h2 className={s.title}>Sicherheit</h2></header>
      <div className={s.scroll}>
        <p>Status: {enabled ? <span className={s.chip}>2FA aktiv</span> : <span className={s.chip + " " + s.chipWarn}>2FA nicht aktiv</span>}</p>
        {!qr && <Button variant="primary" onClick={start}>{enabled ? "2FA neu einrichten" : "2FA einrichten"}</Button>}
        {qr && (
          <div className={s.mt}>
            <img src={qr} alt="QR" width={200} height={200} />
            <p className={s.secret}>{secret}</p>
            <input className={"search-input " + s.field} placeholder="6-stelliger Code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <Button variant="primary" onClick={confirm} disabled={code.length < 6}>Bestätigen</Button>
          </div>
        )}
        {msg && <p>{msg}</p>}
        {err && <p className={s.error}>{err}</p>}
      </div>
    </div>
  );
}