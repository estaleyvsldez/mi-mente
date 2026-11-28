// Modo Aventura: los 32 bloques como mundos que se desbloquean al dominar el anterior.
import { Link } from "react-router-dom";
import { Badge, Card, ErrorBox, Loading, PageHeader, Ring, cx } from "../components/ui";
import type { CurriculumMap } from "../lib/api";
import { useApi } from "../lib/useApi";

export default function MapPage() {
  const { data, error } = useApi<CurriculumMap>("/api/curriculum");
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const total = data.blocks.reduce((a, b) => a + b.total, 0);
  const done = data.blocks.reduce((a, b) => a + b.mastered, 0);
  return (
    <div>
      <PageHeader
        title="Mapa de MAT-01"
        subtitle={`32 bloques · ${total} temas · ${done} dominados. Cada mundo se desbloquea al dominar el anterior.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.blocks.map((b) => (
          <Link key={b.uid} to={`/bloque/${b.uid}`} className={cx(!b.unlocked && "opacity-60")}>
            <Card className={cx("h-full transition hover:border-accent/60", b.mastered === b.total && "border-ok/50")}>
              <div className="flex items-start gap-3">
                <Ring value={(b.mastered / b.total) * 100} size={52} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Mundo {String(b.number).padStart(2, "0")} {!b.unlocked && "· 🔒"}
                  </div>
                  <div className="font-bold leading-snug">{b.title}</div>
                  <div className="mt-1 flex gap-2">
                    <Badge>{b.total} temas</Badge>
                    {b.mastered > 0 && <Badge tone="ok">{b.mastered} dominados</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
