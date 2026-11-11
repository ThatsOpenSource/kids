import { useEffect, useState } from "react";
import { api, asArray } from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState({ persons: 0, schools: 0, roles: 0 });

  useEffect(() => {
    Promise.all([
      api("/api/persons?limit=1").catch(() => ({ total: 0 })),
      api("/api/schools").catch(() => []),
      api("/api/config/roles").catch(() => []),
    ]).then(([p, s, r]) => {
      setStats({
        persons: p.total || 0,
        schools: asArray(s).length,
        roles: asArray(r).length,
      });
    });
  }, []);

  return (
    <div className="tab-panel active" style={{ display: "flex", overflow: "auto" }}>
      <header className="toolbar">
        <h2>Dashboard</h2>
      </header>
      <div className="card-grid">
        <div className="card">
          <header><h3>Personen</h3></header>
          <p style={{ fontSize: "2rem", margin: "16px 14px", color: "var(--text)" }}>{stats.persons}</p>
          <footer><span className="badge">Gesamt</span></footer>
        </div>
        <div className="card">
          <header><h3>Schulen</h3></header>
          <p style={{ fontSize: "2rem", margin: "16px 14px", color: "var(--text)" }}>{stats.schools}</p>
          <footer><span className="badge">Katalog</span></footer>
        </div>
        <div className="card">
          <header><h3>Rollen</h3></header>
          <p style={{ fontSize: "2rem", margin: "16px 14px", color: "var(--text)" }}>{stats.roles}</p>
          <footer><span className="badge">Konfiguriert</span></footer>
        </div>
        <div className="card">
          <header><h3>Schnellstart</h3></header>
          <p>ZIP mit genau einer XML hochladen unter Import. Schulen und Rollen unter Verwaltung pflegen. AMS- und CSV-Export unter Ausgabe.</p>
        </div>
      </div>
    </div>
  );
}