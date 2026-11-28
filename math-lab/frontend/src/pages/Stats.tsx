// Estadísticas de rendimiento: actividad diaria, precisión por bloque y por nivel.
import { Card, Empty, ErrorBox, Loading, PageHeader, Progress } from "../components/ui";
import { useApi } from "../lib/useApi";

interface StatsData {
  days: { day: string; exercises: number; correct: number }[];
  blocks: { uid: string; number: number; title: string; attempts: number; accuracy: number | null }[];
  levels: { level: number; attempts: number; accuracy: number }[];
  avg_time_s: Record<string, number>;
  xp_by_day: { day: string; xp: number }[];
}

function DailyBars({ days }: { days: StatsData["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.exercises));
  return (
    <div className="flex h-40 items-end gap-1" role="img" aria-label="Ejercicios por día">
      {days.map((d) => (
        <div key={d.day} className="group relative flex flex-1 flex-col justify-end" title={`${d.day}: ${d.correct}/${d.exercises} correctos`}>
          <div className="w-full rounded-t bg-accent/30" style={{ height: `${((d.exercises - d.correct) / max) * 100}%` }} />
          <div className="w-full bg-accent" style={{ height: `${(d.correct / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function Stats() {
  const { data, error } = useApi<StatsData>("/api/stats");
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const worked = data.blocks.filter((b) => b.attempts > 0);
  return (
    <div>
      <PageHeader title="Estadísticas" subtitle="Tu evolución en datos." />
      {data.days.length === 0 ? (
        <Empty>Resuelve algunos ejercicios para ver tus estadísticas.</Empty>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="mb-1 font-semibold">Actividad diaria</div>
            <div className="mb-3 text-xs text-muted">Barra completa: ejercicios del día · parte intensa: correctos.</div>
            <DailyBars days={data.days} />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{data.days[0]?.day}</span>
              <span>{data.days[data.days.length - 1]?.day}</span>
            </div>
          </Card>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.levels.map((l) => (
              <Card key={l.level}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Nivel {l.level}</div>
                <div className="mt-1 text-2xl font-bold">{l.accuracy} %</div>
                <div className="text-xs text-muted">
                  {l.attempts} ejercicios{data.avg_time_s[String(l.level)] ? ` · ${data.avg_time_s[String(l.level)]} s de media` : ""}
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <div className="mb-3 font-semibold">Precisión por bloque</div>
            <div className="space-y-2">
              {worked.map((b) => (
                <div key={b.uid} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-right font-mono text-xs text-muted">{b.number}</span>
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                  <Progress className="w-32" value={b.accuracy ?? 0} tone={(b.accuracy ?? 0) >= 90 ? "ok" : (b.accuracy ?? 0) >= 70 ? "accent" : "warn"} />
                  <span className="w-12 text-right text-xs">{b.accuracy} %</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
