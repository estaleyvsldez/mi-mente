// Biblioteca de lecciones: consulta libre de toda la teoría (sin afectar el progreso).
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IntroView, SectionBody, WorkedExample } from "../components/Lesson";
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader } from "../components/ui";
import type { CurriculumMap, TopicDetail } from "../lib/api";
import { useApi } from "../lib/useApi";

function Reader({ uid }: { uid: string }) {
  const { data: t, error } = useApi<TopicDetail>(`/api/topics/${uid}`);
  if (error) return <ErrorBox error={error} />;
  if (!t) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">
        <Link to="/biblioteca" className="hover:text-ink">
          Biblioteca
        </Link>{" "}
        / Bloque {t.block.number}
      </div>
      <PageHeader
        title={`${t.number} · ${t.title}`}
        subtitle={t.block.title}
        right={
          <Link to={`/tema/${t.uid}`}>
            <Button>Estudiar en la Academia</Button>
          </Link>
        }
      />
      {!t.lesson ? (
        <Empty>La lección aún no está disponible.</Empty>
      ) : (
        <>
          <IntroView intro={t.lesson.intro} />
          {t.lesson.sections.map((s, i) => (
            <Card key={i}>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="accent">Sección {i + 1}</Badge>
                <h2 className="text-lg font-bold">{s.title}</h2>
              </div>
              <SectionBody s={s} />
            </Card>
          ))}
          {t.example && <WorkedExample prompt={t.example.prompt} solution={t.example.solution} />}
          {t.lesson.glossary.length > 0 && (
            <Card>
              <div className="mb-2 font-semibold">Terminología</div>
              <dl className="grid gap-2 sm:grid-cols-2">
                {t.lesson.glossary.map((g) => (
                  <div key={g.term}>
                    <dt className="font-semibold text-accent">{g.term}</dt>
                    <dd className="text-sm text-muted">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function Library() {
  const { uid } = useParams();
  const { data, error } = useApi<CurriculumMap>("/api/curriculum");
  const [q, setQ] = useState("");
  if (uid) return <Reader uid={uid} />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return (
    <div>
      <PageHeader title="Biblioteca de lecciones" subtitle="Toda la teoría de MAT-01, organizada por bloques." />
      <input
        className="focus-ring mb-4 w-full rounded-xl border border-line bg-surface px-4 py-2.5"
        placeholder="Buscar un tema…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="space-y-4">
        {data.blocks.map((b) => {
          const ts = b.topics.filter((t) => !q || norm(t.title).includes(norm(q)) || norm(b.title).includes(norm(q)));
          if (!ts.length) return null;
          return (
            <Card key={b.uid}>
              <div className="mb-2 font-semibold">
                <span className="mr-2 font-mono text-muted">{String(b.number).padStart(2, "0")}</span>
                {b.title}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {ts.map((t) => (
                  <Link key={t.uid} to={`/biblioteca/${t.uid}`} className="rounded-lg px-2 py-1 text-sm hover:bg-surface-2">
                    <span className="mr-2 font-mono text-xs text-muted">{t.number}</span>
                    {t.title}
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
