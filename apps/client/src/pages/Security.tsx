import { useState } from "react";
import { api } from "../lib/api";

export default function Security() {
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function setup() {
    const data = await api("/api/auth/2fa/setup", { method: "POST", body: JSON.stringify({}) });
    setQr(data.qrDataUrl);
    setSecret(data.secret);
  }

  async function confirm() {
    const data = await api("/api/auth/2fa/confirm", {
      method: "POST",
      body: JSON.stringify({ totpCode: code, secret }),
    });
    setMsg(data.ok ? "2FA aktiviert" : data.error);
  }

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar">
        <h2 style={{ margin: 0 }}>Sicherheit</h2>
      </header>
      <div style={{ padding: 24, maxWidth: 480 }}>
        <button className="btn primary" onClick={setup}>2FA einrichten</button>
        {qr && (
          <div style={{ marginTop: 16 }}>
            <img src={qr} alt="QR" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }} />
          </div>
        )}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <input className="search-input" style={{ flex: 1 }} placeholder="6-stelliger Code" value={code} onChange={e => setCode(e.target.value)} />
          <button className="btn primary" onClick={confirm}>Bestätigen</button>
        </div>
        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      </div>
    </div>
  );
}