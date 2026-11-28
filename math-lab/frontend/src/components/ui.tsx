// Componentes de interfaz reutilizables (sin lógica de negocio).
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={cx("rounded-2xl border border-line bg-surface", pad && "p-5", className)}>{children}</div>;
}

type Variant = "primary" | "ghost" | "outline" | "danger" | "ok";
export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const v: Record<Variant, string> = {
    primary: "bg-accent text-white hover:brightness-110",
    ghost: "text-muted hover:text-ink hover:bg-surface-2",
    outline: "border border-line text-ink hover:bg-surface-2",
    danger: "bg-bad text-white hover:brightness-110",
    ok: "bg-ok text-white hover:brightness-110",
  };
  return (
    <button
      {...p}
      className={cx(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        v[variant],
        className,
      )}
    />
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "ok" | "bad" | "warn" }) {
  const t = {
    muted: "bg-surface-2 text-muted",
    accent: "bg-accent/15 text-accent",
    ok: "bg-ok/15 text-ok",
    bad: "bg-bad/15 text-bad",
    warn: "bg-warn/15 text-warn",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

export function Progress({ value, tone = "accent", className }: { value: number; tone?: "accent" | "ok" | "warn"; className?: string }) {
  const color = { accent: "bg-accent", ok: "bg-ok", warn: "bg-warn" }[tone];
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={label ?? `${Math.round(value)} %`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth="6" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={value >= 90 ? "var(--ok)" : "var(--accent)"}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" fontSize={size / 4.2} fill="var(--text)" fontWeight="700">
        {Math.round(value)}
      </text>
    </svg>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</div>;
}

export function Loading() {
  return <div className="animate-pulse p-8 text-sm text-muted">Cargando…</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm text-bad">{error instanceof Error ? error.message : String(error)}</div>;
}

export const STATE_LABEL: Record<string, { label: string; tone: "muted" | "accent" | "ok" | "warn" }> = {
  no_iniciado: { label: "No iniciado", tone: "muted" },
  aprendiendo: { label: "Aprendiendo", tone: "accent" },
  en_practica: { label: "En práctica", tone: "warn" },
  dominado: { label: "Dominado", tone: "ok" },
  consolidado: { label: "Consolidado", tone: "ok" },
};
