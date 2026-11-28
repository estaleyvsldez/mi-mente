// Historial de errores: los más frecuentes y los recientes, con acceso a la solución.
import { useState } from "react";
import { Link } from "react-router-dom";
import { SolutionView } from "../components/ExercisePlayer";
import { Md } from "../components/Md";
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader } from "../components/ui";
import { api, type ExercisePublic, type Solution } from "../lib/api";
import { useApi } from "../lib/useApi";

interface ErrorsData {
  frequent: { topic_uid: string; topic: string; code: string; title: string; count: number }[];
  recent: { exercise_id: string; topic_uid: string; topic: string; answer: string; error: string; level: number; at: string }[];
}

export default function Errors() {
  const { data, error } = useApi<ErrorsData>("/api/errors");
  const [open, setOpen] = useState<Record<string, { exercise: ExercisePublic; solution: Solution } | null>>({});
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const toggle = async (id: string) => {
    if (open[id]) return setOpen((o) => ({ ...o, [id]: null }));
    const r = await api.get<{ exercise: ExercisePublic; solution: Solution }>(`/api/exercises/${id}/review`);
    setOpen((o) => ({ ...o, [id]: r }));
  };
  return (
    <div>
      <PageHeader title="Historial de errores" subtitle="Detectar tus errores es la forma más rápida de mejorar." />
      {data.frequent.length === 0 && data.recent.length === 0 ? (
        <Empty>Aún no hay errores registrados.</Empty>
      ) : (
        <>
          <Card>
            <div className="mb-2 font-semibold">Errores más frecuentes</div>
            <ul className="divide-y divide-line">
              {data.frequent.map((f) => (
                <li key={f.topic_uid + f.code} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="flex-1">
                    <b>{f.title}</b> <span className="text-muted">· {f.topic}</span>
                  </span>
                  <Badge tone="bad">{f.count}×</Badge>
                  <Link to={`/practica?tema=${f.topic_uid}`}>
                    <Button variant="outline">Reforzar</Button>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="mt-4">
            <div className="mb-2 font-semibold">Errores recientes</div>
            <ul className="space-y-3">
              {data.recent.map((r) => (
                <li key={r.exercise_id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-1">
                      <b>{r.error}</b> <span className="text-muted">· {r.topic} · nivel {r.level}</span>
                    </span>
                    <span className="text-xs text-muted">Tu respuesta: {r.answer}</span>
                    <Button variant="ghost" onClick={() => void toggle(r.exercise_id)}>
                      {open[r.exercise_id] ? "Ocultar" : "Ver ejercicio y solución"}
                    </Button>
                  </div>
                  {open[r.exercise_id] && (
                    <div className="mt-3 space-y-3">
                      <Md>{open[r.exercise_id]!.exercise.prompt}</Md>
                      <SolutionView sol={open[r.exercise_id]!.solution} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
