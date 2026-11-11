import { ReactNode } from "react";
import s from "../styles/page.module.css";

interface Props { title: string; actions?: ReactNode; }

export default function PageHeader({ title, actions }: Props) {
  return (
    <header className={s.toolbar}>
      <h2 className={s.title}>{title}</h2>
      <div className={s.spacer} />
      {actions}
    </header>
  );
}