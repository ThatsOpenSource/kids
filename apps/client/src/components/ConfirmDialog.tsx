import { useState } from "react";
import Button from "./Button";
import s from "../styles/page.module.css";

interface Props {
  title: string;
  message: string;
  requirePassword?: boolean;
  onConfirm: (password?: string) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, requirePassword, onConfirm, onCancel }: Props) {
  const [pw, setPw] = useState("");
  return (
    <div className={s.overlay}><div className={s.modal}>
      <h3>{title}</h3>
      <p>{message}</p>
      {requirePassword && <input type="password" className={"search-input " + s.field} placeholder="Passwort bestätigen" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />}
      <div className={s.mt}>
        <Button variant="primary" onClick={() => onConfirm(pw)} disabled={requirePassword && !pw}>Bestätigen</Button>
        <Button onClick={onCancel}>Abbrechen</Button>
      </div>
    </div></div>
  );
}