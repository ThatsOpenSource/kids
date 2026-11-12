import { ReactNode } from "react";
import s from "../styles/page.module.css";

interface Props {
  children: ReactNode;
  actions?: ReactNode;
}

export default function PageBody({ children, actions }: Props) {
  return (
    <div className={s.scroll}>
      {actions && <div className={s.row}>{actions}</div>}
      {children}
    </div>
  );
}