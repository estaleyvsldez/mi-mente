// Área de ejercicios: enunciado, respuesta, corrección explicada y Modo Ayuda (Fase D, E y F).
import { useEffect, useRef, useState } from "react";
import { api, type AnswerResult, type ExercisePublic, type HelpRung, type Solution } from "../lib/api";
import { useEvents } from "../lib/events";
import { AnswerInput, emptyAnswer, isEmpty, type AnswerValue } from "./AnswerInput";
import { Md } from "./Md";
import { Badge, Button, Card, cx } from "./ui";
import { Whiteboard } from "./Whiteboard";

const LEVEL = { 1: "Nivel 1 · Básico", 2: "Nivel 2 · Intermedio", 3: "Nivel 3 · Avanzado" } as Record<number, string>;

export function SolutionView({ sol, highlight }: { sol: Solution; highlight?: number | null }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge tone="accent">Ejercicio: {sol.exercise_name}</Badge>
        <Badge tone="ok">Procedimiento: {sol.procedure_name}</Badge>
        {sol.properties.map((p) => (
          <Badge key={p}>Propiedad: {p}</Badge>
        ))}
      </div>
      <ol className="space-y-2">
        {sol.steps.map((s, i) => (
          <li key={i} className={cx("rounded-xl border p-3", highlight === i ? "border-bad bg-bad/5" : "border-line bg-surface-2/50")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{s.title.includes("$") ? <Md inline>{s.title}</Md> : s.title}</span>
              {highlight === i && <Badge tone="bad">Aquí está el error</Badge>}
              {s.procedure && <span className="text-xs text-muted">· {s.procedure}</span>}
            </div>
            <Md className="mt-1 text-sm">{s.explanation}</Md>
            {s.why && (
              <div className="mt-1 text-sm text-muted">
                <span className="font-semibold text-accent">¿Por qué funciona? </span>
                <Md inline>{s.why}</Md>
              </div>
            )}
            {s.property && <div className="mt-1 text-xs text-muted">Propiedad: {s.property}</div>}
          </li>
        ))}
      </ol>
      <div className="rounded-xl bg-ok/10 p-3 text-sm">
        <span className="font-semibold text-ok">Resultado: </span>
        <Md inline>{sol.final}</Md>
      </div>
    </div>
  );
}

function HelpPanel({ ex, rung, onRung }: { ex: ExercisePublic; rung: HelpRung; onRung: (r: HelpRung) => void }) {
  const [val, setVal] = useState<AnswerValue>("");
  const [res, setRes] = useState<{ correct: boolean; message: string; expected?: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (rung.your_turn) setVal(emptyAnswer(rung.your_turn.answer));
    setRes(null);
  }, [rung]);
  const more = async () => {
    setBusy(true);
    try {
      onRung(await api.post<HelpRung>(`/api/exercises/${ex.id}/help`));
    } finally {
      setBusy(false);
    }
  };
  const checkStep = async () => {
    if (!rung.your_turn) return;
    const r = await api.post<{ correct: boolean; message: string; expected?: unknown }>(`/api/exercises/${ex.id}/step`, {
      step_index: rung.your_turn.step_index,
      answer: val,
    });
    setRes(r);
  };
  return (
    <Card className="pop border-accent/40">
      <div className="mb-2 flex items-center gap-2">
        <Badge tone="accent">Modo Ayuda · paso {rung.help_level}</Badge>
        <span className="text-sm text-muted">{rung.message}</span>
      </div>
      {rung.kind === "concept" && (
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted">Estás resolviendo: </span>
            <b>{rung.exercise_name}</b>. <span className="text-muted">Procedimiento:</span> <b>{rung.procedure_name}</b>.
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {rung.hints?.map((h, i) => (
              <li key={i}>
                <Md inline>{h}</Md>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rung.kind === "step" && (
        <div className="space-y-2">
          {rung.revealed?.map((s, i) => (
            <div key={i} className="rounded-xl bg-surface-2/60 p-3 text-sm">
              <div className="font-semibold">{s.title.includes("$") ? <Md inline>{s.title}</Md> : s.title}</div>
              <Md>{s.explanation}</Md>
              {s.why && (
                <div className="text-muted">
                  <span className="font-semibold text-accent">Por qué: </span>
                  <Md inline>{s.why}</Md>
                </div>
              )}
            </div>
          ))}
          {rung.your_turn && (
            <div className="rounded-xl border border-accent/40 p-3">
              <div className="mb-2 text-sm font-semibold">
                Tu turno · {rung.your_turn.title.includes("$") ? <Md inline>{rung.your_turn.title}</Md> : rung.your_turn.title}
              </div>
              <Md className="mb-2 text-sm">{rung.your_turn.prompt}</Md>
              <AnswerInput spec={rung.your_turn.answer} value={val} onChange={setVal} onSubmit={checkStep} autoFocus={false} />
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={checkStep} disabled={isEmpty(rung.your_turn.answer, val)}>
                  Comprobar este paso
                </Button>
              </div>
              {res && (
                <div className={cx("mt-2 text-sm", res.correct ? "text-ok" : "text-bad")}>
                  {res.correct ? "¡Bien! Ese paso es correcto. Sigue con el siguiente." : `${res.message}${res.expected !== undefined && res.expected !== null ? ` · Se esperaba: ${String(res.expected)}` : ""}`}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {rung.kind === "solution" && rung.solution && <SolutionView sol={rung.solution} />}
      {rung.kind !== "solution" && (
        <Button variant="ghost" className="mt-3" onClick={more} disabled={busy}>
          {rung.kind === "concept" ? "Sigo sin saber: muéstrame el primer paso" : "Mostrar el siguiente paso"}
        </Button>
      )}
    </Card>
  );
}

export function ExercisePlayer({
  exercise,
  onNext,
  onResult,
  assessment = false,
  nextLabel = "Siguiente ejercicio",
}: {
  exercise: ExercisePublic;
  onNext: () => void;
  onResult?: (r: AnswerResult) => void;
  assessment?: boolean;
  nextLabel?: string;
}) {
  const push = useEvents();
  const [value, setValue] = useState<AnswerValue>(emptyAnswer(exercise.answer));
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [rung, setRung] = useState<HelpRung | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState(false);
  const [follow, setFollow] = useState<{ correct: boolean; message: string } | null>(null);
  const t0 = useRef(Date.now());

  useEffect(() => {
    setValue(emptyAnswer(exercise.answer));
    setResult(null);
    setRung(null);
    setWarn(null);
    setFollow(null);
    t0.current = Date.now();
  }, [exercise]);

  const submit = async (override?: string) => {
    if (busy || result) return;
    const answer = override ?? value;
    if (!override && isEmpty(exercise.answer, value)) {
      setWarn("Escribe una respuesta o pulsa «No sé / Ayuda».");
      return;
    }
    setBusy(true);
    setWarn(null);
    try {
      const r = await api.post<AnswerResult>(`/api/exercises/${exercise.id}/answer`, { answer, time_ms: Date.now() - t0.current });
      if (r.help) {
        setRung(r.help);
        return;
      }
      if (!r.parsed) {
        setWarn(r.message ?? "No entendí la respuesta.");
        return;
      }
      setResult(r);
      push(r.events);
      onResult?.(r);
    } catch (e) {
      setWarn(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const askHelp = async () => {
    try {
      setRung(await api.post<HelpRung>(`/api/exercises/${exercise.id}/help`));
    } catch (e) {
      setWarn(e instanceof Error ? e.message : String(e));
    }
  };

  const answerFollowup = async (opt: string) => {
    const r = await api.post<{ correct: boolean; message: string; assessment?: AnswerResult["assessment"] }>(`/api/exercises/${exercise.id}/followup`, { option: opt });
    setFollow(r);
    if (r.assessment && result) {
      const merged = { ...result, assessment: r.assessment };
      setResult(merged);
      onResult?.(merged);
    }
  };

  const needsFollow = !!result?.followup && !follow;

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="accent">{LEVEL[exercise.level]}</Badge>
          <Badge>
            {exercise.topic_number} · {exercise.topic_title}
          </Badge>
          {exercise.position && exercise.total && (
            <Badge tone="warn">
              Pregunta {exercise.position} de {exercise.total}
            </Badge>
          )}
          {rung && <Badge tone="warn">Con ayuda: no cuenta para el dominio</Badge>}
        </div>
        <Md className="text-lg leading-relaxed">{exercise.prompt}</Md>
        {exercise.workspace?.type === "fraction_bar" && (
          <div className="my-3 flex h-10 max-w-md overflow-hidden rounded-lg border border-line">
            {Array.from({ length: Number(exercise.workspace.den) }).map((_, i) => (
              <div key={i} className={cx("flex-1 border-r border-line last:border-r-0", i < Number(exercise.workspace!.num) && exercise.workspace!.show ? "bg-accent/70" : "")} />
            ))}
          </div>
        )}
        {exercise.workspace?.type === "grid100" && (
          <div className="my-3 grid w-48 grid-cols-10 gap-0.5">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className={cx("aspect-square rounded-[2px]", i < Number(exercise.workspace!.filled) ? "bg-accent" : "bg-surface-2")} />
            ))}
          </div>
        )}
        <div className="mt-4">
          <AnswerInput spec={exercise.answer} value={value} onChange={setValue} onSubmit={() => void submit()} disabled={!!result} fieldResults={result?.field_results} />
        </div>
        {warn && <div className="mt-2 text-sm text-warn">{warn}</div>}
        <div className="mt-4 flex flex-wrap gap-2">
          {!result && (
            <Button onClick={() => void submit()} disabled={busy}>
              Responder
            </Button>
          )}
          {!result && !assessment && (
            <Button variant="outline" onClick={askHelp}>
              No sé / Ayuda
            </Button>
          )}
          <Button variant="ghost" onClick={() => setBoard((b) => !b)}>
            {board ? "Ocultar pizarra" : "Pizarra"}
          </Button>
          {result && !needsFollow && (
            <Button onClick={onNext} className="ml-auto">
              {nextLabel} →
            </Button>
          )}
        </div>
      </Card>

      {board && <Whiteboard workspace={exercise.workspace} solved={result?.solution?.workspace} />}

      {rung && !result && <HelpPanel ex={exercise} rung={rung} onRung={setRung} />}

      {result && assessment && (
        <Card className="pop">
          <div className={cx("font-semibold", result.correct ? "text-ok" : "text-bad")}>{result.correct ? "Respuesta correcta." : "Respuesta registrada."}</div>
          {!result.correct && <p className="mt-1 text-sm text-muted">Verás la corrección detallada al terminar la evaluación.</p>}
        </Card>
      )}

      {result && !assessment && (
        <Card className={cx("pop", result.correct ? "border-ok/50" : "border-bad/50")}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx("text-lg font-bold", result.correct ? "text-ok" : "text-bad")}>{result.correct ? "✓ Correcto" : "✗ Incorrecto"}</span>
            {result.assisted && <Badge tone="warn">Resuelto con ayuda</Badge>}
          </div>
          {result.diagnosis && (
            <div className="mt-3 rounded-xl bg-bad/10 p-3 text-sm">
              <div className="font-semibold text-bad">Diagnóstico: {result.diagnosis.title}</div>
              <div className="mt-1">
                <Md inline>{result.diagnosis.explanation}</Md>
              </div>
            </div>
          )}
          {!result.correct && !result.diagnosis && result.message && <p className="mt-2 text-sm text-muted">{result.message}</p>}
          {!result.correct && result.correct_answer && (
            <div className="mt-2 text-sm">
              Respuesta correcta: <b>{result.correct_answer}</b>
            </div>
          )}
          {result.solution && (
            <details className="mt-4" open={!result.correct}>
              <summary className="cursor-pointer text-sm font-semibold text-accent">Solución paso a paso y nombre del procedimiento</summary>
              <div className="mt-3">
                <SolutionView sol={result.solution} highlight={result.diagnosis?.step_index ?? null} />
              </div>
            </details>
          )}
        </Card>
      )}

      {result?.followup && (
        <Card className="pop border-accent/40">
          <div className="mb-2 text-sm font-semibold">{result.followup.question}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.followup.options.map((o) => (
              <button
                key={o}
                disabled={!!follow}
                onClick={() => void answerFollowup(o)}
                className="focus-ring rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-sm hover:border-accent/60 disabled:opacity-60"
              >
                {o}
              </button>
            ))}
          </div>
          {follow && <div className={cx("mt-2 text-sm", follow.correct ? "text-ok" : "text-bad")}>{follow.message}</div>}
        </Card>
      )}
    </div>
  );
}
