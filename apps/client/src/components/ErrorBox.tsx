import { useState } from "react";

export function ErrorBox({ error }: { error: any }) {
  const [copied, setCopied] = useState(false);
  if (!error) return null;

  const text = typeof error === "string"
    ? error
    : JSON.stringify({
        error: error.error || error.message,
        code: error.code,
        requestId: error.requestId,
        details: error.details,
        timestamp: error.timestamp,
      }, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      background: "var(--bg-soft)",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius)",
      padding: 12,
      margin: "12px 0",
      fontSize: ".85rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>{error.error || error.message || "Fehler"}</strong>
        <button className="btn small" onClick={copy}>{copied ? "Kopiert" : "Kopieren"}</button>
      </div>
      {error.requestId && <div style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>Anfrage-ID: {error.requestId}</div>}
      {error.code && <div style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>Code: {error.code}</div>}
      <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: ".75rem", color: "var(--text-muted)" }}>{text}</pre>
    </div>
  );
}