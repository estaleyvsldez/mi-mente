// Modo Academia: un tema recorrido etapa por etapa (evaluación inicial → … → consolidación).
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AssessmentRunner } from "../components/AssessmentRunner";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { IntroView, SectionsFlow, WorkedExample } from "../components/Lesson";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Progress, Ring, STATE_LABEL, cx } from "../components/ui";
import { api, type ExercisePublic, type TopicDetail } from "../lib/api";
import { useEvents } from "../lib/events";
import { useApi } from "../lib/useApi";

function Stepper({ t }: { t: TopicDetail }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {t.flow.stages.slice(0, -1).map((s) => (
        <div
          key={s.id}
          className={cx(
            "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium",
            s.id === t.flow.stage ? "bg-accent text-white" : s.done ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted",
          )}
        >
          {s.done ? "✓ " : ""}
          {s.label}
        </div>
      ))}
    </div>
  );
}

function PracticeStage({ t, onChange, onAssess }: { t: TopicDetail; onChange: () => void; onAssess: () => void }) {
  const [ex, setEx] = useState<ExercisePublic | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const load = useCallback(async () => {
    try {
      setEx(await api.post<ExercisePublic>("/api/exercises/next", { topic_uid: t.uid, mode: "academia" }));
    } catch (e) {
      setErr(e);
    }
  }, [t.uid]);
  useEffect(() => {
    void load();
  }, [load]);
  const f = t.flow;
  return (
    <div className="space-y-4">
      <Card>
        {f.stage === "guiada" ? (
          <>
            <div className="font-semibold">Práctica guiada · Nivel 1</div>
            <p className="mt-1 text-sm text-muted">
              Puedes pedir ayuda siempre que la necesites. Para avanzar, resuelve {f.guided_progress.needed} ejercicios sin ayuda.
            </p>
            <Progress className="mt-3" value={(f.guided_progress.done / f.guided_progress.needed) * 100} />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Práctica independiente</span>
              <Badge tone="accent">Nivel actual {f.level}</Badge>
              <Badge>Precisión reciente {f.accuracy} %</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">La dificultad sube cuando demuestras varias variantes; los ejercicios con ayuda no cuentan para el dominio.</p>
            {f.ready_for_assessment ? (
              <div className="mt-3 rounded-xl bg-ok/10 p-3">
                <div className="text-sm font-semibold text-ok">Cumples los requisitos: ya puedes hacer la evaluación intermedia.</div>
                <Button className="mt-2" variant="ok" onClick={onAssess}>
                  Hacer la evaluación intermedia
                </Button>
              </div>
            ) : (
              f.requirements.length > 0 && (
                <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {f.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )
            )}
          </>
        )}
      </Card>
      {err ? <ErrorBox error={err} /> : ex ? <ExercisePlayer
          exercise={ex}
          onNext={() => {
            onChange();
            void load();
          }}
        /> : <Loading />}
    </div>
  );
}

export default function TopicPage() {
  const { uid = "" } = useParams();
  const { data: t, error, reload } = useApi<TopicDetail>(`/api/topics/${uid}`);
  const push = useEvents();
  const [stageErr, setStageErr] = useState<string | null>(null);
  const [wantAssess, setWantAssess] = useState(false);
  useEffect(() => setWantAssess(false), [uid, t?.flow.stage]);

  if (error) return <ErrorBox error={error} />;
  if (!t) return <Loading />;
  const f = t.flow;
  const complete = async (stage: string) => {
    try {
      const r = await api.post<{ events: never[] }>(`/api/topics/${uid}/complete-stage`, { stage });
      push(r.events);
      setStageErr(null);
      await reload();
      window.scrollTo({ top: 0 });
    } catch (e) {
      setStageErr(e instanceof Error ? e.message : String(e));
    }
  };
  const st = STATE_LABEL[f.state];

  let body: React.ReactNode = null;
  if (!f.unlocked) {
    body = (
      <Empty>
        Este tema está bloqueado. Para desbloquearlo, domina primero{" "}
        {t.previous && (
          <Link className="text-accent underline" to={`/tema/${t.previous.uid}`}>
            {t.previous.number} {t.previous.title}
          </Link>
        )}
        . Puedes leer su lección en la{" "}
        <Link className="text-accent underline" to={`/biblioteca/${t.uid}`}>
          biblioteca
        </Link>
        .
      </Empty>
    );
  } else if (!t.lesson && ["intro", "teoria"].includes(f.stage)) {
    body = <Empty>La lección de este tema aún no está disponible.</Empty>;
  } else if (f.stage === "diagnostico") {
    body = wantAssess ? (
      <AssessmentRunner kind="diagnostico" scope={uid} onDone={() => void reload()} />
    ) : (
      <Card>
        <div className="text-lg font-bold">Evaluación inicial</div>
        <p className="mt-1 text-sm text-muted">
          5 preguntas rápidas para saber qué conoces ya. No afecta a tu nota. Si las aciertas todas podrás ir directo a la evaluación intermedia; si no, empezamos
          desde cero.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setWantAssess(true)}>Hacer la evaluación inicial</Button>
          <Button variant="outline" onClick={() => complete("diagnostico")}>
            Saltar y empezar la clase
          </Button>
        </div>
      </Card>
    );
  } else if (f.stage === "intro" && t.lesson) {
    body = (
      <>
        <IntroView intro={t.lesson.intro} />
        <Button className="mt-4" onClick={() => complete("intro")}>
          Empezar la clase teórica →
        </Button>
      </>
    );
  } else if (f.stage === "teoria" && t.lesson) {
    body = (
      <>
        <SectionsFlow uid={uid} sections={t.lesson.sections} passed={f.sections_passed} onPassed={() => void reload()} />
        <Button className="mt-4" disabled={f.sections_passed.length < f.sections_total} onClick={() => complete("teoria")}>
          {f.sections_passed.length < f.sections_total ? `Comprobaciones superadas: ${f.sections_passed.length}/${f.sections_total}` : "Ver el ejemplo resuelto →"}
        </Button>
      </>
    );
  } else if (f.stage === "ejemplo") {
    body = t.example ? (
      <WorkedExample prompt={t.example.prompt} solution={t.example.solution} onDone={() => complete("ejemplo")} />
    ) : (
      <Button onClick={() => complete("ejemplo")}>Ir a la práctica guiada</Button>
    );
  } else if (f.stage === "guiada" || f.stage === "independiente") {
    body = wantAssess && f.ready_for_assessment ? (
      <AssessmentRunner kind="intermedia" scope={uid} onDone={() => void reload()} />
    ) : (
      <PracticeStage t={t} onChange={() => void reload()} onAssess={() => setWantAssess(true)} />
    );
  } else if (["intermedia", "desafio", "examen"].includes(f.stage)) {
    body = <AssessmentRunner key={f.stage} kind={f.stage} scope={uid} onDone={() => void reload()} />;
  } else if (f.stage === "consolidacion") {
    body = f.consolidation_available ? (
      <AssessmentRunner kind="consolidacion" scope={uid} onDone={() => void reload()} />
    ) : (
      <Card>
        <div className="text-lg font-bold text-ok">Tema dominado (provisional)</div>
        <p className="mt-1 text-sm text-muted">
          Para consolidarlo debes superar un repaso diferido: así comprobamos que el conocimiento se mantiene. Disponible desde{" "}
          <b>{f.consolidation_due ? new Date(f.consolidation_due + "Z").toLocaleString() : "mañana"}</b>.
        </p>
        <Link to={`/practica?tema=${uid}`}>
          <Button variant="outline" className="mt-3">
            Mientras tanto, practicar este tema
          </Button>
        </Link>
      </Card>
    );
  } else if (f.stage === "completado") {
    body = (
      <Card>
        <div className="text-lg font-bold text-ok">Tema consolidado ✓</div>
        <p className="mt-1 text-sm text-muted">Aparecerá de vez en cuando en tu Modo Repaso para que no se olvide.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-muted">
        <Link to="/mapa" className="hover:text-ink">
          Mapa
        </Link>{" "}
        /{" "}
        <Link to={`/bloque/${t.block.uid}`} className="hover:text-ink">
          Bloque {t.block.number} · {t.block.title}
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Ring value={f.mastery} size={64} label={`Dominio ${f.mastery} %`} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Tema {t.number}</div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone="accent">{f.stage_label}</Badge>
            {t.lesson && (
              <Link to={`/biblioteca/${t.uid}`} className="text-xs text-accent hover:underline">
                Leer la lección completa
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="mb-6">
        <Stepper t={t} />
      </div>
      {stageErr && <div className="mb-3 text-sm text-warn">{stageErr}</div>}
      {body}
      {f.top_errors.length > 0 && (
        <Card className="mt-6">
          <div className="mb-2 text-sm font-semibold">Tus errores más frecuentes en este tema</div>
          <ul className="space-y-1 text-sm">
            {f.top_errors.map((e) => (
              <li key={e.code} className="flex justify-between gap-3">
                <span>{e.title}</span>
                <Badge tone="bad">{e.count}×</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
