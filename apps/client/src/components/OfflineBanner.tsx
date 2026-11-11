import { useState, useEffect } from "react";
import s from "../styles/page.module.css";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function check() {
      fetch("/api/auth/login", { method: "OPTIONS" }).then(() => setOffline(false)).catch(() => setOffline(true));
    }
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  if (!offline) return null;
  return <div className={s.error} style={{ padding: 8, textAlign: "center", background: "#fee" }}>Server nicht erreichbar</div>;
}