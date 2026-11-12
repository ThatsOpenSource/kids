import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import s from "../styles/page.module.css";

export default function ErrorPage() {
  const err = useRouteError();
  let status = 500;
  let message = "Ein Fehler ist aufgetreten";
  if (isRouteErrorResponse(err)) {
    status = err.status;
    message = err.statusText || message;
  } else if (err instanceof Error) {
    message = err.message;
  }
  const labels: Record<number, string> = { 404: "Seite nicht gefunden", 503: "Dienst nicht verfügbar", 401: "Nicht angemeldet" };
  return (
    <div className={s.page} style={{ textAlign: "center", paddingTop: 80 }}>
      <h1>{status}</h1>
      <p>{labels[status] || message}</p>
      <a href="/">Zurück zur Übersicht</a>
    </div>
  );
}