// Estructura general: navegación lateral (escritorio) / inferior (móvil) y rutas.
import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Loading, cx } from "./components/ui";
const Achievements = lazy(() => import("./pages/Achievements"));
const BlockPage = lazy(() => import("./pages/BlockPage"));
const Challenge = lazy(() => import("./pages/Challenge"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Errors = lazy(() => import("./pages/Errors"));
const Exams = lazy(() => import("./pages/Exams"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Library = lazy(() => import("./pages/Library"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Practice = lazy(() => import("./pages/Practice"));
const Review = lazy(() => import("./pages/Review"));
const Settings = lazy(() => import("./pages/Settings"));
const Stats = lazy(() => import("./pages/Stats"));
const TopicPage = lazy(() => import("./pages/TopicPage"));

const NAV = [
  { to: "/", label: "Panel", icon: "◧", end: true },
  { to: "/mapa", label: "Mapa · Aventura", icon: "⬡" },
  { to: "/biblioteca", label: "Biblioteca", icon: "▤" },
  { to: "/practica", label: "Práctica", icon: "✎" },
  { to: "/desafio", label: "Desafío", icon: "⚡" },
  { to: "/repaso", label: "Repaso", icon: "↻" },
  { to: "/examenes", label: "Exámenes", icon: "✓" },
  { to: "/errores", label: "Errores", icon: "⚠" },
  { to: "/estadisticas", label: "Estadísticas", icon: "▥" },
  { to: "/logros", label: "Logros", icon: "★" },
  { to: "/glosario", label: "Glosario", icon: "Aa" },
  { to: "/ajustes", label: "Ajustes", icon: "⚙" },
];
const MOBILE = ["/", "/mapa", "/practica", "/repaso", "/estadisticas"];

export default function App() {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/60 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg font-black text-white">Σ</div>
          <div>
            <div className="font-black tracking-tight">MATH LAB</div>
            <div className="text-xs text-muted">MAT-01 · Aritmética</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition", isActive ? "bg-accent/15 font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-ink")
              }
            >
              <span className="w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 font-black text-white">Σ</div>
          <span className="font-black">MATH LAB</span>
          <NavLink to="/ajustes" className="ml-auto text-sm text-muted">
            ⚙
          </NavLink>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/bloque/:uid" element={<BlockPage />} />
            <Route path="/tema/:uid" element={<TopicPage />} />
            <Route path="/biblioteca" element={<Library />} />
            <Route path="/biblioteca/:uid" element={<Library />} />
            <Route path="/practica" element={<Practice />} />
            <Route path="/desafio" element={<Challenge />} />
            <Route path="/repaso" element={<Review />} />
            <Route path="/examenes" element={<Exams />} />
            <Route path="/errores" element={<Errors />} />
            <Route path="/estadisticas" element={<Stats />} />
            <Route path="/logros" element={<Achievements />} />
            <Route path="/glosario" element={<Glossary />} />
            <Route path="/ajustes" element={<Settings />} />
          </Routes>
          </Suspense>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
          {NAV.filter((n) => MOBILE.includes(n.to)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive ? "text-accent" : "text-muted")}
            >
              <span className="text-base">{n.icon}</span>
              {n.label.split(" ")[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
