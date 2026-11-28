// Un bloque (mundo): sus temas (etapas) con estado, dominio y acceso.
import { Link, useParams } from "react-router-dom";
import { Md } from "../components/Md";
import { Badge, Button, Card, ErrorBox, Loading, PageHeader, Progress, STATE_LABEL, cx } from "../components/ui";
import type { CurriculumMap } from "../lib/api";
import { useApi } from "../lib/useApi";

export default function BlockPage() {
  const { uid = "" } = useParams();
  const { data, error } = useApi<CurriculumMap>("/api/curriculum");
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const b = data.blocks.find((x) => x.uid === uid);
  if (!b) return <ErrorBox error="Bloque inexistente" />;
  return (
    <div>
      <div className="mb-2 text-sm text-muted">
        <Link to="/mapa" className="hover:text-ink">
          Mapa
        </Link>{" "}
        / Bloque {b.number}
      </div>
      <PageHeader
        title={`Bloque ${String(b.number).padStart(2, "0")} — ${b.title}`}
        subtitle={`${b.mastered} de ${b.total} temas dominados`}
        right={
          <Link to={`/examenes?bloque=${b.uid}`}>
            <Button variant="outline">Examen del bloque</Button>
          </Link>
        }
      />
      {b.intro && (
        <Card className="mb-4">
          <Md className="text-sm">{b.intro}</Md>
        </Card>
      )}
      <div className="space-y-2">
        {b.topics.map((t) => {
          const st = STATE_LABEL[t.state];
          return (
            <Link key={t.uid} to={`/tema/${t.uid}`} className={cx("block", !t.unlocked && "opacity-60")}>
              <Card className="transition hover:border-accent/60" pad={false}>
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <span className="w-10 font-mono text-sm text-muted">{t.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {!t.unlocked && "🔒 "}
                      {t.title}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {t.state !== "no_iniciado" && <Badge>{t.stage_label}</Badge>}
                      {t.conceptual && <Badge>Conceptual</Badge>}
                    </div>
                  </div>
                  <div className="w-full sm:w-32">
                    <Progress value={t.mastery} tone={t.mastery >= 90 ? "ok" : "accent"} />
                    <div className="mt-1 text-right text-xs text-muted">{Math.round(t.mastery)} % dominio</div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
