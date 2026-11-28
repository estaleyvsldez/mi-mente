// Notificaciones (XP, logros, subidas de nivel) compartidas por toda la app.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { GameEvent } from "./api";

interface Toast { id: number; title: string; body?: string; tone: "accent" | "ok" | "warn" }
const Ctx = createContext<(evs: GameEvent[] | undefined) => void>(() => {});

export function EventsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((evs: GameEvent[] | undefined) => {
    if (!evs?.length) return;
    const items: Toast[] = evs.map((e, i) => {
      const id = Date.now() + i + Math.random();
      if (e.code) return { id, title: `🏆 Logro: ${e.title}`, body: e.description, tone: "ok" };
      if (e.xp) return { id, title: `+${e.xp} XP`, body: e.reason, tone: "accent" };
      if (e.level_up) return { id, title: `Nivel ${e.level_up}`, body: e.message, tone: "ok" };
      if (e.level_down) return { id, title: `Refuerzo: nivel ${e.level_down}`, body: e.message, tone: "warn" };
      return { id, title: "Avance", body: e.message, tone: "ok" };
    });
    setToasts((t) => [...t, ...items].slice(-5));
    for (const it of items) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== it.id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-72 flex-col gap-2 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pop pointer-events-auto rounded-xl border bg-surface p-3 shadow-lg ${
              t.tone === "ok" ? "border-ok/40" : t.tone === "warn" ? "border-warn/40" : "border-accent/40"
            }`}
          >
            <div className="text-sm font-bold">{t.title}</div>
            {t.body && <div className="mt-0.5 text-xs text-muted">{t.body}</div>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useEvents = () => useContext(Ctx);
