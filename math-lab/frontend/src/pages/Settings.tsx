// Ajustes: nombre, tema visual y modo explorador.
import { useEffect, useState } from "react";
import { Button, Card, ErrorBox, Loading, PageHeader, cx } from "../components/ui";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";

interface S { name: string; explorer?: boolean }

export default function Settings() {
  const { data, error, setData } = useApi<S>("/api/settings");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") ?? "auto";
    } catch {
      return "auto";
    }
  });
  useEffect(() => setName(data?.name ?? ""), [data]);
  useEffect(() => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  return (
    <div>
      <PageHeader title="Ajustes" />
      <div className="space-y-4">
        <Card>
          <label className="text-sm font-semibold" htmlFor="nm">
            Tu nombre
          </label>
          <div className="mt-2 flex gap-2">
            <input id="nm" className="focus-ring flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={async () => setData(await api.put<S>("/api/settings", { name }))}>Guardar</Button>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Apariencia</div>
          <div className="mt-2 flex w-fit rounded-xl bg-surface-2 p-1 text-sm">
            {[
              ["auto", "Automática"],
              ["dark", "Oscura"],
              ["light", "Clara"],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setTheme(k)} className={cx("rounded-lg px-4 py-1.5", theme === k && "bg-accent text-white")}>
                {l}
              </button>
            ))}
          </div>
        </Card>
        <Card className="border-warn/40">
          <div className="text-sm font-semibold">Modo explorador</div>
          <p className="mt-1 text-sm text-muted">
            Desbloquea todos los temas para explorarlos. <b>No recomendado</b> para aprender: el orden del pensum garantiza que cada tema se apoye en lo anterior.
          </p>
          <Button
            className="mt-3"
            variant={data.explorer ? "danger" : "outline"}
            onClick={async () => setData(await api.put<S>("/api/settings", { explorer: !data.explorer }))}
          >
            {data.explorer ? "Desactivar modo explorador" : "Activar modo explorador"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
