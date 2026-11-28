// Modo Práctica: ejercicios ilimitados por tema y nivel.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader, cx } from "../components/ui";
import { api, type CurriculumMap, type ExercisePublic } from "../lib/api";
import { useApi } from "../lib/useApi";

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const { data, error } = useApi<CurriculumMap>("/api/curriculum");
  const topic = params.get("tema") ?? "";
  const [level, setLevel] = useState(1);
  const [ex, setEx] = useState<ExercisePublic | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });

  const load = async () => {
    if (!topic) return;
    try {
      setErr(null);
      setEx(await api.post<ExercisePublic>("/api/exercises/next", { topic_uid: topic, mode: "practica", level }));
    } catch (e) {
      setErr(e);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, level]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const unlocked = data.blocks.flatMap((b) => b.topics.filter((t) => t.unlocked).map((t) => ({ ...t, block: b.title })));
  return (
    <div>
      <PageHeader title="Modo Práctica" subtitle="Ejercicios ilimitados. Elige tema y nivel; puedes pedir ayuda cuando quieras." />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            className="focus-ring w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5"
            value={topic}
            onChange={(e) => {
              setParams({ tema: e.target.value });
              setScore({ ok: 0, n: 0 });
            }}
            aria-label="Tema"
          >
            <option value="">— Elige un tema desbloqueado —</option>
            {unlocked.map((t) => (
              <option key={t.uid} value={t.uid}>
                {t.number} · {t.title}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl bg-surface-2 p-1">
            {[1, 2, 3].map((l) => (
              <button key={l} onClick={() => setLevel(l)} className={cx("rounded-lg px-4 py-1.5 text-sm", level === l && "bg-accent text-white")}>
                Nivel {l}
              </button>
            ))}
          </div>
        </div>
        {score.n > 0 && (
          <div className="mt-3 flex gap-2">
            <Badge tone="accent">Sesión: {score.ok}/{score.n} correctas</Badge>
          </div>
        )}
      </Card>
      {!topic ? (
        <Empty>Elige un tema para empezar. Sólo aparecen los temas que ya desbloqueaste en la Academia.</Empty>
      ) : err ? (
        <ErrorBox error={err} />
      ) : ex ? (
        <ExercisePlayer exercise={ex} onNext={load} onResult={(r) => setScore((s) => ({ ok: s.ok + (r.correct ? 1 : 0), n: s.n + 1 }))} />
      ) : (
        <Loading />
      )}
    </div>
  );
}
