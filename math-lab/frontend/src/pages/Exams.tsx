// Modo Examen: por bloque y del módulo completo (los exámenes de tema están en la Academia).
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AssessmentRunner } from "../components/AssessmentRunner";
import { Badge, Button, Card, ErrorBox, Loading, PageHeader } from "../components/ui";
import type { CurriculumMap } from "../lib/api";
import { useApi } from "../lib/useApi";

interface StatsLite {
  assessments: { id: number; kind: string; scope_title: string; score: number; passed: boolean | null; finished_at: string }[];
}

const KIND: Record<string, string> = {
  diagnostico: "Inicial", intermedia: "Intermedia", desafio: "Desafío", examen: "Examen de tema", consolidacion: "Consolidación",
  bloque: "Examen de bloque", modulo: "Examen del módulo", repaso: "Repaso",
};

export default function Exams() {
  const [params] = useSearchParams();
  const { data, error } = useApi<CurriculumMap>("/api/curriculum");
  const { data: st, reload } = useApi<StatsLite>("/api/stats");
  const [block, setBlock] = useState(params.get("bloque") ?? "");
  const [run, setRun] = useState<{ kind: string; scope: string } | null>(null);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  if (run) return <AssessmentRunner kind={run.kind} scope={run.scope} onDone={() => void reload()} />;
  return (
    <div>
      <PageHeader title="Modo Examen" subtitle="Evaluaciones por bloque y del módulo completo. El examen de cada tema está en su ruta de la Academia." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="font-semibold">Examen de bloque</div>
          <p className="mt-1 text-sm text-muted">15 preguntas de todos los temas del bloque, niveles 1 a 3.</p>
          <select className="focus-ring mt-3 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5" value={block} onChange={(e) => setBlock(e.target.value)} aria-label="Bloque">
            <option value="">— Elige un bloque —</option>
            {data.blocks
              .filter((b) => b.unlocked)
              .map((b) => (
                <option key={b.uid} value={b.uid}>
                  {b.number}. {b.title}
                </option>
              ))}
          </select>
          <Button className="mt-3" disabled={!block} onClick={() => setRun({ kind: "bloque", scope: block })}>
            Empezar
          </Button>
        </Card>
        <Card>
          <div className="font-semibold">Examen del módulo MAT-01</div>
          <p className="mt-1 text-sm text-muted">20 preguntas mezclando los temas que ya dominas.</p>
          <Button className="mt-3" onClick={() => setRun({ kind: "modulo", scope: "mat01" })}>
            Empezar
          </Button>
        </Card>
      </div>
      {st && st.assessments.length > 0 && (
        <Card className="mt-4">
          <div className="mb-2 font-semibold">Historial de evaluaciones</div>
          <ul className="divide-y divide-line">
            {st.assessments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Badge>{KIND[a.kind] ?? a.kind}</Badge>
                <span className="flex-1">{a.scope_title}</span>
                <Badge tone={a.passed === false ? "bad" : a.passed ? "ok" : "muted"}>{a.score} %</Badge>
                <span className="text-xs text-muted">{new Date(a.finished_at + "Z").toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
