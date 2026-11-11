import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Persons from "./pages/Persons";
import Import from "./pages/Import";
import Schools from "./pages/Schools";
import Config from "./pages/Config";
import Asm from "./pages/Asm";
import Ruleset from "./pages/Ruleset";
import CsvExport from "./pages/CsvExport";
import Security from "./pages/Security";
import { useAuth } from "./store/auth";
import { useTokenRefresh } from "./lib/useTokenRefresh";

export default function App() {
  const token = useAuth((s) => s.token);
  useTokenRefresh();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={token ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="personen" element={<Persons />} />
        <Route path="import" element={<Import />} />
        <Route path="schulen" element={<Schools />} />
        <Route path="konfiguration" element={<Config />} />
        <Route path="asm" element={<Asm />} />
        <Route path="csv" element={<CsvExport />} />
        <Route path="regeln" element={<Ruleset />} />
        <Route path="sicherheit" element={<Security />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}