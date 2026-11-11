import { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "small";
}
export default function Button({ variant = "secondary", className = "", children, ...rest }: Props) {
  const cls = [styles.btn, variant === "primary" ? styles.primary : "", variant === "small" ? styles.small : "", className].filter(Boolean).join(" ");
  return <button className={cls} {...rest}>{children}</button>;
}