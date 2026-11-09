import { useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './lib/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import PersonsPage from './pages/PersonsPage';
import SchoolsPage from './pages/SchoolsPage';
import ConfigPage from './pages/ConfigPage';
import AmsPage from './pages/AmsPage';
import ExportPage from './pages/ExportPage';
import SecurityPage from './pages/SecurityPage';
import styles from './App.module.css';
import shared from './styles/shared.module.css';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className={styles.authShell}>
        <div className={styles.authCard}>
          <p className={styles.authSub}>Laden…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const work = [
    { to: '/', label: 'Übersicht', end: true },
    { to: '/import', label: 'Import' },
    { to: '/persons', label: 'Personen' },
    { to: '/export', label: 'CSV-Export' },
    { to: '/ams', label: 'AMS Export' },
  ];
  const config = [
    { to: '/schools', label: 'Schulen' },
    { to: '/config', label: 'Konfiguration' },
    { to: '/security', label: 'Sicherheit' },
  ];

  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar}>
        <div className={styles.brand}>KIDS</div>

        <div className={styles.sectionLabel}>Arbeit</div>
        {work.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItem)}
          >
            {n.label}
          </NavLink>
        ))}

        <div className={styles.sectionLabel}>Konfiguration</div>
        {config.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItem)}
          >
            {n.label}
          </NavLink>
        ))}

        <div className={styles.footer}>
          <div className={styles.userMeta}>
            {user?.email}
            <br />
            <span className={shared.chip}>{user?.role}</span>
          </div>
          <button type="button" className={styles.navItem} onClick={() => logout()}>
            Abmelden
          </button>
        </div>
      </nav>

      <main className={styles.content}>
        <div key={loc.pathname} className={styles.panel}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Shell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/persons" element={<PersonsPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/schools" element={<SchoolsPage />} />
                <Route path="/ams" element={<AmsPage />} />
                <Route path="/config" element={<ConfigPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </Protected>
        }
      />
    </Routes>
  );
}
