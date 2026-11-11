import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Layout() {
  const nav = useNavigate();
  const logout = useAuth((s) => s.logout);

  return (
    <div id="app">
      <nav className="sidebar">
        <div className="sidebar-brand">KIDS</div>

        <div className="nav-section-label">Übersicht</div>
        <NavLink to="/" end className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Dashboard</NavLink>

        <div className="nav-section-label">Daten</div>
        <NavLink to="/personen" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Personen</NavLink>
        <NavLink to="/import" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Import</NavLink>

        <div className="nav-section-label">Verwaltung</div>
        <NavLink to="/schulen" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Schulen</NavLink>
        <NavLink to="/konfiguration" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Rollen & Flags</NavLink>

        <div className="nav-section-label">Ausgabe</div>
        <NavLink to="/asm" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>ASM Export</NavLink>
        <NavLink to="/csv" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>CSV-Export</NavLink>
        <NavLink to="/regeln" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Passwort-Regeln</NavLink>

        <div className="sidebar-footer">
          <NavLink to="/sicherheit" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>Sicherheit</NavLink>
          <button className="nav-item" onClick={() => { logout(); nav("/login"); }}>Abmelden</button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}