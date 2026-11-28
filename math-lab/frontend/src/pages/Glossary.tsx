// Glosario: terminología matemática aprendida tema a tema.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Md } from "../components/Md";
import { Card, Empty, ErrorBox, Loading, PageHeader } from "../components/ui";
import { useApi } from "../lib/useApi";

interface Term { term: string; definition: string; topic_uid: string; topic: string }

export default function Glossary() {
  const { data, error } = useApi<Term[]>("/api/glossary");
  const [q, setQ] = useState("");
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const list = data.filter((t) => !q || norm(t.term).includes(norm(q)) || norm(t.definition).includes(norm(q)));
  return (
    <div>
      <PageHeader title="Glosario" subtitle={`${data.length} términos matemáticos.`} />
      <input className="focus-ring mb-4 w-full rounded-xl border border-line bg-surface px-4 py-2.5" placeholder="Buscar término…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? (
        <Empty>Sin resultados.</Empty>
      ) : (
        <Card>
          <dl className="divide-y divide-line">
            {list.map((t, i) => (
              <div key={t.term + i} className="py-3">
                <dt className="font-semibold text-accent">{t.term}</dt>
                <dd className="text-sm">
                  <Md>{t.definition}</Md>
                </dd>
                <Link to={`/biblioteca/${t.topic_uid}`} className="text-xs text-muted hover:text-ink">
                  {t.topic}
                </Link>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
