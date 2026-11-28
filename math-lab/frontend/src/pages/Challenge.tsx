// Modo Desafío: problemas contrarreloj con dificultad progresiva dentro de un bloque.
import { useEffect, useRef, useState } from "react";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader } from "../components/ui";
import { api, type CurriculumMap, type ExercisePublic } from "../lib/api";
import { useEvents } from "../lib/events";
import { useApi } from "../lib/useApi";

const DURATION = 180;

export default function Challenge() {
  const { data, error } = useApi<CurriculumMap>("/api/curriculum");
  const push = useEvents();
  const [block, setBlock] = useState("");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(DURATION);
  const [ex, setEx] = useState<ExercisePublic | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState<number | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const levelRef = useRef(1);

  const topics = data?.blocks.find((b) => b.uid === block)?.topics.filter((t) => t.unlocked) ?? [];

  const next = async () => {
    const t = topics[Math.floor(Math.random() * topics.length)];
    try {
      setEx(await api.post<ExercisePublic>("/api/exercises/next", { topic_uid: t.uid, mode: "desafio", level: levelRef.current }));
    } catch (e) {
      setErr(e);
    }
  };

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && left <= 0) {
      setRunning(false);
      void api.post<{ best: number; events: never[] }>("/api/challenge/finish", { scope: block, score, max_level: levelRef.current }).then((r) => {
        setBest(r.best);
        push(r.events);
      });
    }
  }, [left, running, block, score, push]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  if (!running && left > 0) {
    const avail = data.blocks.filter((b) => b.topics.some((t) => t.unlocked));
    return (
      <div>
        <PageHeader title="Modo Desafío" subtitle={`${DURATION / 60} minutos. Cada 3 aciertos seguidos sube la dificultad. Sin ayudas.`} />
        <Card>
          <select className="focus-ring w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5" value={block} onChange={(e) => setBlock(e.target.value)} aria-label="Bloque">
            <option value="">— Elige un bloque —</option>
            {avail.map((b) => (
              <option key={b.uid} value={b.uid}>
                {b.number}. {b.title}
              </option>
            ))}
          </select>
          <Button
            className="mt-4"
            disabled={!block}
            onClick={() => {
              setScore(0);
              setStreak(0);
              setLevel(1);
              levelRef.current = 1;
              setLeft(DURATION);
              setRunning(true);
              void next();
            }}
          >
            ⚡ Empezar desafío
          </Button>
        </Card>
      </div>
    );
  }
  if (!running)
    return (
      <div>
        <PageHeader title="Desafío terminado" />
        <Card>
          <div className="text-3xl font-black">{score} aciertos</div>
          <div className="mt-1 text-sm text-muted">
            Nivel máximo alcanzado: {level}. {best !== null && `Mejor marca en este bloque: ${best}.`}
          </div>
          <Button className="mt-4" onClick={() => setLeft(DURATION)}>
            Jugar otra vez
          </Button>
        </Card>
      </div>
    );
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={left < 30 ? "bad" : "warn"}>⏱ {left}s</Badge>
        <Badge tone="accent">Aciertos: {score}</Badge>
        <Badge>Nivel {level}</Badge>
        <Badge>Racha {streak}</Badge>
      </div>
      {topics.length === 0 ? (
        <Empty>No hay temas desbloqueados en este bloque.</Empty>
      ) : err ? (
        <ErrorBox error={err} />
      ) : ex ? (
        <ExercisePlayer
          exercise={ex}
          assessment
          onNext={next}
          onResult={(r) => {
            if (r.correct) {
              setScore((s) => s + 1);
              const s2 = streak + 1;
              setStreak(s2);
              if (s2 % 3 === 0 && levelRef.current < 3) {
                levelRef.current += 1;
                setLevel(levelRef.current);
              }
            } else setStreak(0);
          }}
        />
      ) : (
        <Loading />
      )}
    </div>
  );
}
