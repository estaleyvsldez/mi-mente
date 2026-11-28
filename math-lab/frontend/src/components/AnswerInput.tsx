// Entrada de respuesta adaptada al tipo de ejercicio (número, opciones, casillas…).
import type { AnswerSpecPublic } from "../lib/api";
import { cx } from "./ui";
import { Md } from "./Md";

export type AnswerValue = string | string[] | Record<string, string>;

export function emptyAnswer(spec: AnswerSpecPublic): AnswerValue {
  if (spec.kind === "multichoice") return [];
  if (spec.kind === "fields") return Object.fromEntries(spec.fields.map((f) => [f.key, ""]));
  return "";
}

export function isEmpty(spec: AnswerSpecPublic, v: AnswerValue): boolean {
  if (spec.kind === "multichoice") return false; // «ninguna» es una respuesta válida
  if (spec.kind === "fields") return Object.values(v as Record<string, string>).some((x) => !x.trim());
  return !(v as string).trim();
}

const PLACEHOLDER: Record<string, string> = {
  integer: "Escribe un número entero",
  number: "Ej.: 75 · 0,75 · 3/4 · 1 3/4",
  token: "Escribe la respuesta",
  words: "Escríbelo con palabras",
  list: "Separa con punto y coma: 2; 4; 6",
  factorization: "Ej.: 2^3·3",
};

export function AnswerInput({
  spec,
  value,
  onChange,
  onSubmit,
  disabled,
  fieldResults,
  autoFocus = true,
}: {
  spec: AnswerSpecPublic;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onSubmit: () => void;
  disabled?: boolean;
  fieldResults?: Record<string, boolean>;
  autoFocus?: boolean;
}) {
  const inputCls =
    "focus-ring w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-lg font-mono text-ink placeholder:text-muted/60 placeholder:font-sans placeholder:text-base disabled:opacity-60";
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  if (spec.kind === "choice") {
    return (
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {spec.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            disabled={disabled}
            onClick={() => onChange(c.id)}
            className={cx(
              "focus-ring flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
              value === c.id ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-accent/50",
            )}
          >
            <span className="mt-0.5 font-mono text-xs uppercase text-muted">{c.id}</span>
            <Md inline>{c.label}</Md>
          </button>
        ))}
      </div>
    );
  }
  if (spec.kind === "multichoice") {
    const sel = value as string[];
    return (
      <div>
        <div className="grid gap-2 sm:grid-cols-2">
          {spec.choices.map((c) => {
            const on = sel.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange(on ? sel.filter((x) => x !== c.id) : [...sel, c.id])}
                className={cx(
                  "focus-ring flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  on ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-accent/50",
                )}
              >
                <span className={cx("grid h-5 w-5 place-items-center rounded border text-xs", on ? "border-accent bg-accent text-white" : "border-line")}>{on ? "✓" : ""}</span>
                <Md inline>{c.label}</Md>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">Marca todas las opciones correctas (puede ser más de una).</p>
      </div>
    );
  }
  if (spec.kind === "fields") {
    const v = value as Record<string, string>;
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {spec.fields.map((f, i) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{f.label}</span>
            <input
              className={cx(inputCls, fieldResults && (fieldResults[f.key] ? "border-ok" : "border-bad"))}
              value={v[f.key] ?? ""}
              disabled={disabled}
              inputMode={f.kind === "integer" ? "numeric" : "decimal"}
              autoFocus={autoFocus && i === 0}
              onKeyDown={onKey}
              onChange={(e) => onChange({ ...v, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <input
        className={inputCls}
        value={value as string}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={spec.placeholder || PLACEHOLDER[spec.kind] || ""}
        inputMode={spec.kind === "integer" ? "text" : undefined}
        aria-label="Tu respuesta"
        onKeyDown={onKey}
        onChange={(e) => onChange(e.target.value)}
      />
      {spec.unit && <span className="shrink-0 text-sm text-muted">{spec.unit}</span>}
    </div>
  );
}
