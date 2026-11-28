// Modo Repaso: repetición espaciada + ejercicios según errores anteriores.
import { useState } from "react";
import { AssessmentRunner } from "../components/AssessmentRunner";
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader } from "../components/ui";
import { useApi } from "../lib/useApi";

interface Queue {
  items: { topic_uid: string; title: string; number: string; due_at: string; due: boolean; interval_days: number; reps: number; lapses: number }[];
  plan_size: number;
}

export default function Review() {
  const { data, error, reload } = useApi<Queue>("/api/review");
  const [run, setRun] = useState(false);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  if (run) return <AssessmentRunner kind="repaso" scope="mat01" onDone={() => void reload()} />;
  return (
    <div>
      <PageHeader
        title="Modo Repaso"
        subtitle="Repetición espaciada: lo que te cuesta vuelve pronto; lo que dominas, de vez en cuando."
        right={
          <Button onClick={() => setRun(true)} disabled={data.plan_size === 0}>
            Empezar sesión de repaso
          </Button>
        }
      />
      {data.plan_size === 0 && <Empty>No tienes repasos pendientes ni errores recientes. ¡Sigue avanzando en la Academia!</Empty>}
      {data.items.length > 0 && (
        <Card className="mt-4">
          <div className="mb-2 font-semibold">Calendario de repasos</div>
          <ul className="divide-y divide-line">
            {data.items.map((it) => (
              <li key={it.topic_uid} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="font-mono text-xs text-muted">{it.number}</span>
                <span className="flex-1">{it.title}</span>
                {it.due ? <Badge tone="warn">Pendiente</Badge> : <Badge>{new Date(it.due_at + "Z").toLocaleDateString()}</Badge>}
                <span className="text-xs text-muted">cada {it.interval_days} d · {it.lapses} olvidos</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
