import { useEffect, useState } from "react";
import { api, asArray } from "../lib/api";
import styles from "./Dashboard.module.css";
import s from "../styles/page.module.css";

export default function Dashboard() {
  const [stats, setStats] = useState({ persons: 0, schools: 0, roles: 0 });

  useEffect(() => {
    let c = false;
    Promise.all([
      api("/api/persons?limit=1").then(d => (d && typeof d.total === "number") ? d.total : 0).catch(() => 0),
      api("/api/schools").then(d => Array.isArray(d) ? d.length : 0).catch(() => 0),
      api("/api/config/roles").then(d => Array.isArray(d) ? d.length : 0).catch(() => 0),
    ]).then(([persons, schools, roles]) => {
      if (!c) setStats({ persons, schools, roles });
    });
    return () => { c = true; };
  }, []);

  return (
    <div className={s.page}>
      <header className={s.toolbar}><h2 className={s.title}>Dashboard</h2></header>
      <div className={styles.grid}>
        <div className={styles.card}>
          <header className={styles.cardHeader}><h3>Personen</h3></header>
          <p className={styles.stat}>{stats.persons}</p>
          <footer className={styles.cardFooter}><span className={styles.badge}>Gesamt</span></footer>
        </div>
        <div className={styles.card}>
          <header className={styles.cardHeader}><h3>Schulen</h3></header>
          <p className={styles.stat}>{stats.schools}</p>
          <footer className={styles.cardFooter}><span className={styles.badge}>Katalog</span></footer>
        </div>
        <div className={styles.card}>
          <header className={styles.cardHeader}><h3>Rollen</h3></header>
          <p className={styles.stat}>{stats.roles}</p>
          <footer className={styles.cardFooter}><span className={styles.badge}>Konfiguriert</span></footer>
        </div>
        <div className={styles.card}>
          <header className={styles.cardHeader}><h3>Schnellstart</h3></header>
          <p className={styles.cardBody}>ZIP mit XML unter Import hochladen. Schulen und Rollen unter Verwaltung pflegen. ASM- und CSV-Export unter Ausgabe.</p>
        </div>
      </div>
    </div>
  );
}