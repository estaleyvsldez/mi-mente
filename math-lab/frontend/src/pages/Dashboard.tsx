// Panel principal: progreso global, siguiente paso recomendado, repasos y nivel.
import { Link } from "react-router-dom";
import { Badge, Button, Card, ErrorBox, Loading, PageHeader, Progress, Stat } from "../components/ui";
import type { CurriculumMap, Dashboard as D } from "../lib/api";
import { useApi } from "../lib/useApi";

export default function Dashboard() {
  const { data: d, error } = useApi<D>("/api/dashboard");
  const { data: map } = useApi<CurriculumMap>("/api/curriculum");
  if (error) return <ErrorBox error={error} />;
  if (!d) return <Loading />;
  const lvlPct = ((d.xp - d.level_floor) / (d.level_ceil - d.level_floor)) * 100;
  return (
    <div>
      <PageHeader title="Panel principal" subtitle="Tu plataforma personal para dominar la aritmética, paso a paso." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-accent/40 bg-gradient-to-br from-accent/10 to-accent-2/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Continúa donde lo dejaste</div>
          {d.next_topic ? (
            <>
              <div className="mt-2 text-xl font-bold">
                {d.next_topic.number} · {d.next_topic.title}
              </div>
              <div className="mt-1 text-sm text-muted">
                {d.next_topic.block} · Etapa: {d.next_topic.stage_label}
              </div>
              <Link to={`/tema/${d.next_topic.uid}`}>
                <Button className="mt-4">Continuar →</Button>
              </Link>
            </>
          ) : (
            <div className="mt-2 text-sm text-muted">¡Has dominado todos los temas disponibles!</div>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Nivel</div>
              <div className="text-3xl font-black">{d.level}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Racha</div>
              <div className="text-3xl font-black">🔥 {d.streak}</div>
            </div>
          </div>
          <Progress className="mt-4" value={lvlPct} />
          <div className="mt-1 text-xs text-muted">
            {d.xp} XP · faltan {d.level_ceil - d.xp} para el nivel {d.level + 1}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Temas dominados" value={`${d.mastered}/${d.topics_total}`} hint={`${d.consolidated} consolidados`} />
        <Stat label="En progreso" value={d.in_progress} />
        <Stat label="Precisión global" value={d.accuracy !== null ? `${d.accuracy} %` : "—"} hint={`${d.attempts} ejercicios`} />
        <Stat label="Esta semana" value={d.week_attempts} hint={d.week_accuracy !== null ? `${d.week_accuracy} % de acierto` : "sin actividad"} />
      </div>

      {d.reviews_due > 0 && (
        <Card className="mt-4 border-warn/40">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="warn">Repaso pendiente</Badge>
            <span className="text-sm">Tienes {d.reviews_due} tema(s) para repasar hoy y evitar olvidarlos.</span>
            <Link to="/repaso" className="ml-auto">
              <Button variant="outline">Ir al repaso</Button>
            </Link>
          </div>
        </Card>
      )}

      {map && (
        <Card className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Progreso por bloques</div>
            <Link to="/mapa" className="text-sm text-accent">
              Ver mapa →
            </Link>
          </div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {map.blocks.map((b) => (
              <Link key={b.uid} to={`/bloque/${b.uid}`} className="group flex items-center gap-3 text-sm">
                <span className="w-6 text-right font-mono text-xs text-muted">{String(b.number).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate group-hover:text-accent">{b.title}</span>
                <Progress className="w-24" value={(b.mastered / b.total) * 100} tone={b.mastered === b.total ? "ok" : "accent"} />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
