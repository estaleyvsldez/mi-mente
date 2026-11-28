// Sistema de logros.
import { Card, ErrorBox, Loading, PageHeader, cx } from "../components/ui";
import { useApi } from "../lib/useApi";

interface Ach { code: string; title: string; description: string; icon: string; unlocked_at: string | null }
const ICON: Record<string, string> = { spark: "✦", target: "◎", trophy: "🏆", medal: "🏅", brain: "🧠", layers: "▤", grid: "▦", repeat: "↻", flame: "🔥", bolt: "⚡" };

export default function Achievements() {
  const { data, error } = useApi<Ach[]>("/api/achievements");
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const n = data.filter((a) => a.unlocked_at).length;
  return (
    <div>
      <PageHeader title="Logros" subtitle={`${n} de ${data.length} desbloqueados. Premian el aprendizaje real, no el volumen.`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((a) => (
          <Card key={a.code} className={cx(!a.unlocked_at && "opacity-50")}>
            <div className="flex items-center gap-3">
              <div className={cx("grid h-12 w-12 place-items-center rounded-xl text-2xl", a.unlocked_at ? "bg-ok/15" : "bg-surface-2 grayscale")}>{ICON[a.icon] ?? "★"}</div>
              <div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-muted">{a.description}</div>
                {a.unlocked_at && <div className="mt-1 text-xs text-ok">Desbloqueado el {new Date(a.unlocked_at + "Z").toLocaleDateString()}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
