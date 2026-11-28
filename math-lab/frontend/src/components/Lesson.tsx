// Piezas de la lección: introducción (Fase A), secciones teóricas (Fase B) y ejemplo resuelto (Fase C).
import { useState } from "react";
import { api, type Lesson, type Section, type Solution } from "../lib/api";
import { Md } from "./Md";
import { Badge, Button, Card, cx } from "./ui";

export function IntroView({ intro }: { intro: Lesson["intro"] }) {
  const items: [string, string | string[]][] = [
    ["¿Qué es?", intro.what],
    ["¿Para qué sirve?", intro.purpose],
    ["¿Por qué es importante?", intro.importance],
    ["Fundamentos", intro.foundations],
    ["Lo que necesitas saber antes", intro.prerequisites.length ? intro.prerequisites : ["Nada: empezamos desde cero."]],
    ["Lo que podrás resolver", intro.outcomes],
    ["En la vida cotidiana", intro.everyday_example],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([t, v]) => (
        <Card key={t} className={cx(t === "En la vida cotidiana" && "sm:col-span-2 border-accent/30")}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">{t}</div>
          {Array.isArray(v) ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {v.map((x, i) => (
                <li key={i}>
                  <Md inline>{x}</Md>
                </li>
              ))}
            </ul>
          ) : (
            <Md className="text-sm">{v}</Md>
          )}
        </Card>
      ))}
    </div>
  );
}

export function SectionBody({ s }: { s: Section }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent/10 p-3 text-sm">
        <span className="font-semibold text-accent">Concepto: </span>
        <Md inline>{s.concept}</Md>
      </div>
      <Md>{s.explanation}</Md>
      <div className="rounded-xl border border-line p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Definición matemática</div>
        <Md className="text-sm">{s.definition}</Md>
      </div>
      {s.rules.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Reglas y propiedades</div>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {s.rules.map((r, i) => (
              <li key={i}>
                <Md inline>{r}</Md>
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.examples.map((e, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface-2/40 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Ejemplo resuelto {i + 1}</div>
          <Md className="font-semibold">{e.problem}</Md>
          <Md className="mt-1 text-sm">{e.solution}</Md>
        </div>
      ))}
      <div className="rounded-xl border border-warn/30 bg-warn/5 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-warn">Errores comunes</div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {s.common_errors.map((r, i) => (
            <li key={i}>
              <Md inline>{r}</Md>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl bg-ok/10 p-3 text-sm">
        <span className="font-semibold text-ok">Resumen: </span>
        <Md inline>{s.summary}</Md>
      </div>
    </div>
  );
}

export function SectionsFlow({ uid, sections, passed, onPassed }: { uid: string; sections: Section[]; passed: number[]; onPassed: () => void }) {
  const firstOpen = sections.findIndex((_, i) => !passed.includes(i));
  const [idx, setIdx] = useState(firstOpen === -1 ? sections.length - 1 : firstOpen);
  const [sel, setSel] = useState<number | null>(null);
  const [res, setRes] = useState<{ correct: boolean; explanation: string } | null>(null);
  const s = sections[idx];
  const check = async () => {
    if (sel === null) return;
    const r = await api.post<{ correct: boolean; explanation: string }>(`/api/topics/${uid}/sections/${idx}/check`, { option: sel });
    setRes(r);
    if (r.correct) onPassed();
  };
  const go = (i: number) => {
    setIdx(i);
    setSel(null);
    setRes(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sections.map((x, i) => (
          <button
            key={i}
            disabled={i > idx && !passed.includes(i - 1)}
            onClick={() => go(i)}
            className={cx("rounded-full px-3 py-1 text-xs disabled:opacity-40", i === idx ? "bg-accent text-white" : passed.includes(i) ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted")}
          >
            {i + 1}. {x.title}
          </button>
        ))}
      </div>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="accent">
            Sección {idx + 1} de {sections.length}
          </Badge>
          <h2 className="text-lg font-bold">{s.title}</h2>
        </div>
        <SectionBody s={s} />
      </Card>
      <Card className="border-accent/40">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Comprueba que lo entendiste</div>
        <Md className="font-semibold">{s.check.question}</Md>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {s.check.options.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                setSel(i);
                setRes(null);
              }}
              className={cx("focus-ring rounded-xl border px-3 py-2 text-left text-sm", sel === i ? "border-accent bg-accent/10" : "border-line bg-surface-2")}
            >
              <Md inline>{o}</Md>
            </button>
          ))}
        </div>
        {res && (
          <div className={cx("mt-3 rounded-xl p-3 text-sm", res.correct ? "bg-ok/10" : "bg-bad/10")}>
            <b className={res.correct ? "text-ok" : "text-bad"}>{res.correct ? "¡Correcto! " : "Todavía no. "}</b>
            {res.correct ? <Md inline>{res.explanation}</Md> : "Vuelve a leer la sección con calma y elige otra opción."}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          {!res?.correct && (
            <Button onClick={check} disabled={sel === null}>
              Comprobar
            </Button>
          )}
          {res?.correct && idx < sections.length - 1 && <Button onClick={() => go(idx + 1)}>Siguiente sección →</Button>}
        </div>
      </Card>
    </div>
  );
}

export function WorkedExample({ prompt, solution, onDone }: { prompt: string; solution: Solution; onDone?: () => void }) {
  const [shown, setShown] = useState(1);
  const all = shown >= solution.steps.length;
  return (
    <Card>
      <div className="mb-2 flex flex-wrap gap-2">
        <Badge tone="accent">Ejemplo resuelto paso a paso</Badge>
        <Badge>{solution.exercise_name}</Badge>
      </div>
      <Md className="text-lg font-semibold">{prompt}</Md>
      <ol className="mt-4 space-y-2">
        {solution.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="pop rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="font-semibold">{s.title.includes("$") ? <Md inline>{s.title}</Md> : s.title}</div>
            <Md className="text-sm">{s.explanation}</Md>
            {s.why && (
              <div className="mt-1 text-sm text-muted">
                <span className="font-semibold text-accent">¿Por qué? </span>
                <Md inline>{s.why}</Md>
              </div>
            )}
            {s.procedure && <div className="mt-1 text-xs text-muted">Procedimiento: {s.procedure}</div>}
          </li>
        ))}
      </ol>
      {all && (
        <div className="pop mt-3 rounded-xl bg-ok/10 p-3 text-sm">
          <b className="text-ok">Resultado:</b> <Md inline>{solution.final}</Md>
          <div className="mt-1">
            <b>Nombre del procedimiento:</b> {solution.procedure_name}
          </div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {!all ? (
          <Button onClick={() => setShown((n) => n + 1)}>Siguiente paso</Button>
        ) : (
          onDone && <Button onClick={onDone}>Entendido: quiero practicar →</Button>
        )}
        {!all && (
          <Button variant="ghost" onClick={() => setShown(solution.steps.length)}>
            Mostrar todo
          </Button>
        )}
      </div>
    </Card>
  );
}
