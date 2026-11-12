import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import styles from "./Layout.module.css";
import OfflineBanner from "./OfflineBanner";

export default function Layout() {
  const logout = useAuth(s => s.logout);
  const nav = useNavigate();
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>KIDS</div>

        <div className={styles.section}>Übersicht</div>
        <NavLink to="/" end className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Dashboard</NavLink>

        <div className={styles.section}>Daten</div>
        <NavLink to="/personen" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Personen</NavLink>
        <NavLink to="/import" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Import</NavLink>

        <div className={styles.section}>Verwaltung</div>
        <NavLink to="/schulen" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Schulen</NavLink>
        <NavLink to="/konfiguration" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Rollen & Flags</NavLink>
        <NavLink to="/benutzer" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Benutzer</NavLink>

        <div className={styles.section}>Ausgabe</div>
        <NavLink to="/export" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Export</NavLink>
        <NavLink to="/regeln" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Passwort-Regeln</NavLink>

        <div className={styles.footer}>
          <NavLink to="/historie" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Historie</NavLink>
          <NavLink to="/profil" className={({ isActive }) => styles.nav + (isActive ? " " + styles.active : "")}>Konto</NavLink>
          <button className={styles.nav} onClick={() => { logout(); nav("/login"); }}>Abmelden</button>
        </div>
      </aside>
      <main className={styles.content}><OfflineBanner /><Outlet /></main>
    </div>
  );
}