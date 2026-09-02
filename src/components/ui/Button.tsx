import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 " +
  "disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90 rounded-[3px]",
  ghost: "border border-line-2 text-ink hover:border-ink hover:bg-sunk rounded-[3px]",
  quiet: "text-ink-2 hover:text-ink underline decoration-line-2 hover:decoration-ink underline-offset-4",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
};

export function Button({
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  const s = variant === "quiet" ? "" : sizes[size];
  return (
    <button className={`${base} ${variants[variant]} ${s} ${className}`} {...rest}>
      {children}
    </button>
  );
}
