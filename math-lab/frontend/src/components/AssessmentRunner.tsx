// Ejecuta una evaluación (diagnóstico, intermedia, desafío, examen, consolidación, bloque, módulo, repaso).
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AnswerResult, type AssessmentResult, type AssessmentView, type ExercisePublic, type Solution } from "../lib/api";
import { useEvents } from "../lib/events";
import { ExercisePlayer, SolutionView } from "./ExercisePlayer";
import { Badge, Button, Card, ErrorBox, Loading, Progress, cx } from "./ui";

const KIND: Record<string, string> = {
  diagnostico: "Evaluación inicial",
  intermedia: "Evaluación intermedia",
  desafio: "Desafío avanzado",
  examen: "Examen final del tema",
  consolidacion: "Repaso de consolidación",
  bloque: "Examen de bloque",
  modulo: "Examen del módulo",
  repaso: "Sesión de repaso",
};

function Timer({ start, limit }: { start: string; limit: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, limit - Math.floor((now - new Date(start + "Z").getTime()) / 1000));
  return (
    <Badge tone={left < 60 ? "bad" : "warn"}>
      ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </Badge>
  );
}

function ReviewItem({ id, n }: { id: string; n: number }) {
  const [sol, setSol] = useState<{ exercise: ExercisePublic; solution: Solution } | null>(null);
  return (
    <div>
      <Button variant="ghost" onClick={async () => setSol(sol ? null : await api.get(`/api/exercises/${id}/review`))}>
        {sol ? "Ocultar" : `Ver solución de la pregunta ${n}`}
      </Button>
      {sol && (
        <Card className="mt-2">
          <SolutionView sol={sol.solution} />
        </Card>
      )}
    </div>
  );
}

export function AssessmentRunner({ kind, scope, onDone }: { kind: string; scope: string; onDone?: (r: AssessmentResult) => void }) {
  const push = useEvents();
  const [a, setA] = useState<AssessmentView | null>(null);
  const [ex, setEx] = useState<ExercisePublic | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [final, setFinal] = useState<AssessmentView | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [started, setStarted] = useState(false);

  const next = useCallback(async (aid: number) => {
    try {
      setEx(await api.post<ExercisePublic>(`/api/assessments/${aid}/next`));
    } catch (e) {
      setError(e);
    }
  }, []);

  const start = async () => {
    try {
      const v = await api.post<AssessmentView>("/api/assessments", { kind, scope });
      setA(v);
      setStarted(true);
      await next(v.id);
    } catch (e) {
      setError(e);
    }
  };

  const onResult = (r: AnswerResult) => {
    if (r.assessment) setA((x) => (x ? { ...x, answered: r.assessment!.answered } : x));
    if (r.assessment?.result) {
      setResult(r.assessment.result);
      push(r.assessment.result.events);
      void api.get<AssessmentView>(`/api/assessments/${r.assessment.result.assessment_id}`).then(setFinal);
      onDone?.(r.assessment.result);
    }
  };

  if (error) return <ErrorBox error={error} />;
  if (!started)
    return (
      <Card>
        <div className="text-lg font-bold">{KIND[kind] ?? kind}</div>
        <p className="mt-1 text-sm text-muted">
          Sin ayudas. Se requiere al menos un 90 % de aciertos. {kind === "examen" || kind === "desafio" ? "Algunas preguntas te pedirán además nombrar el procedimiento que usaste." : ""}
        </p>
        <Button className="mt-4" onClick={start}>
          Comenzar
        </Button>
      </Card>
    );
  if (result)
    return (
      <Card className="pop">
        <div className="flex flex-wrap items-center gap-3">
          <div className={cx("text-2xl font-bold", result.passed === false ? "text-bad" : "text-ok")}>
            {result.passed === null ? "Sesión completada" : result.passed ? "Aprobado" : "No aprobado"}
          </div>
          <Badge tone="accent">
            {result.correct}/{result.total} · {result.score} %
          </Badge>
          {result.late && <Badge tone="bad">Fuera de tiempo</Badge>}
        </div>
        <p className="mt-2 text-sm">{result.message}</p>
        {final?.items && (
          <div className="mt-4 space-y-1">
            <div className="text-sm font-semibold">Revisión de respuestas</div>
            {final.items.map((it, i) => (
              <div key={it.exercise_id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className={it.correct ? "text-ok" : "text-bad"}>{it.correct ? "✓" : "✗"}</span>
                <span className="text-muted">Pregunta {i + 1} · nivel {it.level}</span>
                {!it.correct && <ReviewItem id={it.exercise_id} n={i + 1} />}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Link to="/errores">
            <Button variant="outline">Ver historial de errores</Button>
          </Link>
        </div>
      </Card>
    );
  if (!a || !ex) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold">{KIND[a.kind]}</span>
        <span className="text-sm text-muted">{a.scope_title}</span>
        {a.time_limit_s && <Timer start={a.started_at} limit={a.time_limit_s} />}
        <div className="ml-auto w-40">
          <Progress value={(a.answered / a.total) * 100} />
        </div>
      </div>
      <ExercisePlayer exercise={ex} assessment onResult={onResult} onNext={() => void next(a.id)} nextLabel="Siguiente pregunta" />
    </div>
  );
}
