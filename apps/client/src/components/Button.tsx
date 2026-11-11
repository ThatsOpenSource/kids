import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "small";
}

export default function Button({ variant = "secondary", className = "", children, ...rest }: Props) {
  const cls = ["btn", variant === "primary" ? "primary" : "", variant === "small" ? "small" : "", className].filter(Boolean).join(" ");
  return <button className={cls} {...rest}>{children}</button>;
}