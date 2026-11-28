// Pizarra: cuadrícula para operaciones en columna + lienzo libre para borradores.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Workspace } from "../lib/api";
import { Button, cx } from "./ui";

function digitsOf(x: number | string): string {
  return String(x);
}

/** Llevadas esperadas de una suma en columna (para revisar la pizarra). */
function expectedCarries(operands: string[], width: number): string[] {
  const nums = operands.map((o) => o.replace(",", ""));
  const out = Array(width).fill("");
  let carry = 0;
  const L = Math.max(...nums.map((n) => n.length));
  for (let i = 0; i < L; i++) {
    let s = carry;
    for (const n of nums) {
      const d = n[n.length - 1 - i];
      if (d && /\d/.test(d)) s += Number(d);
    }
    carry = Math.floor(s / 10);
    if (carry) out[width - 2 - i] = String(carry);
  }
  return out;
}

function ColumnGrid({ ws, solved }: { ws: Workspace; solved?: Workspace | null }) {
  const operands = (ws.operands ?? []).map(digitsOf);
  const op = ws.op ?? "+";
  const isMul = op === "×";
  const width = Math.max(...operands.map((o) => o.length)) + (isMul ? operands[1]?.length ?? 1 : 1) + 1;
  const partialRows = isMul && operands[1] && operands[1].length > 1 ? operands[1].length : 0;
  const rows = 1 + partialRows + (partialRows ? 1 : 0);
  const [carry, setCarry] = useState<string[]>(Array(width).fill(""));
  const [cells, setCells] = useState<string[][]>(Array.from({ length: rows }, () => Array(width).fill("")));
  const [checked, setChecked] = useState(false);
  const result = solved?.result !== undefined ? String(solved.result) : null;
  const resultPadded = result ? result.padStart(width, " ").split("") : null;
  const carries = op === "+" ? expectedCarries(operands, width) : null;

  const pad = (s: string) => s.padStart(width, " ").split("");
  const cellCls = "h-9 w-8 sm:h-10 sm:w-9 text-center font-mono text-lg";
  const editable = (val: string, set: (v: string) => void, state?: "ok" | "bad", small = false) => (
    <input
      value={val}
      maxLength={1}
      inputMode="numeric"
      aria-label="casilla"
      onChange={(e) => set(e.target.value.replace(/[^0-9,]/g, "").slice(-1))}
      className={cx(
        cellCls,
        "focus-ring rounded-md border bg-surface-2",
        small && "h-6 text-xs sm:h-7 text-accent",
        state === "ok" ? "border-ok" : state === "bad" ? "border-bad" : "border-line",
      )}
    />
  );
  return (
    <div className="overflow-x-auto">
      <div className="inline-block rounded-xl bg-surface-2/50 p-3">
        {!isMul && (
          <div className="flex gap-1" title="Llevadas">
            {carry.map((v, i) => (
              <div key={i}>
                {editable(v, (x) => setCarry((c) => c.map((y, j) => (j === i ? x : y))),
                  checked && carries ? ((carries[i] ?? "") === v.trim() ? undefined : "bad") : undefined, true)}
              </div>
            ))}
          </div>
        )}
        {operands.map((o, r) => (
          <div key={r} className="flex gap-1">
            {pad(o).map((ch, i) => (
              <div key={i} className={cx(cellCls, "grid place-items-center")}>
                {i === 0 && r === operands.length - 1 ? <span className="text-muted">{op}</span> : ch.trim()}
              </div>
            ))}
          </div>
        ))}
        <div className="my-1 border-t-2 border-ink/70" />
        {cells.map((row, r) => (
          <div key={r} className={cx("flex gap-1", partialRows > 0 && r === partialRows && "mt-1 border-t border-line pt-1")}>
            {row.map((v, i) => {
              const isResult = r === rows - 1;
              const state = checked && isResult && resultPadded ? ((resultPadded[i] ?? " ").trim() === v.trim() ? "ok" : "bad") : undefined;
              return <div key={i}>{editable(v, (x) => setCells((cs) => cs.map((rr, j) => (j === r ? rr.map((y, k) => (k === i ? x : y)) : rr))), state)}</div>;
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {result && (
          <Button variant="outline" onClick={() => setChecked(true)}>
            Revisar mi pizarra
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setCarry(Array(width).fill(""));
            setCells(Array.from({ length: rows }, () => Array(width).fill("")));
            setChecked(false);
          }}
        >
          Borrar
        </Button>
        <span className="self-center text-xs text-muted">
          {isMul ? "Escribe los productos parciales y el resultado." : "Fila pequeña superior: llevadas. Última fila: resultado."}
        </span>
      </div>
    </div>
  );
}

function DivisionGrid({ ws }: { ws: Workspace }) {
  const D = String(ws.dividend ?? "");
  const d = String(ws.divisor ?? "");
  const [rows, setRows] = useState<string[]>(Array(6).fill(""));
  const [q, setQ] = useState("");
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-4 rounded-xl bg-surface-2/50 p-3 font-mono text-lg">
        <div>
          <div className="px-1">{D}</div>
          {rows.map((v, i) => (
            <input key={i} value={v} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? e.target.value : x)))}
              className="focus-ring mt-1 block w-28 rounded-md border border-line bg-surface-2 px-2 py-1 text-base" aria-label={`fila ${i + 1}`} />
          ))}
        </div>
        <div className="border-l-2 border-ink/70 pl-3">
          <div className="border-b-2 border-ink/70 px-1">{d}</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="cociente" aria-label="cociente"
            className="focus-ring mt-1 w-28 rounded-md border border-line bg-surface-2 px-2 py-1 text-base" />
        </div>
      </div>
    </div>
  );
}

function Canvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text") || "#fff";
    }
  }, []);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  return (
    <div>
      <canvas
        ref={ref}
        className="h-64 w-full touch-none rounded-xl border border-line bg-surface-2"
        aria-label="Lienzo de borrador"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = ref.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(...pos(e));
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current!.getContext("2d")!;
          ctx.lineTo(...pos(e));
          ctx.stroke();
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <Button
        variant="ghost"
        className="mt-2"
        onClick={() => {
          const c = ref.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        }}
      >
        Borrar lienzo
      </Button>
    </div>
  );
}

export function Whiteboard({ workspace, solved }: { workspace: Workspace | null; solved?: Workspace | null }) {
  const hasGrid = workspace && (workspace.type === "column" || workspace.type === "division");
  const [tab, setTab] = useState<"grid" | "canvas">(hasGrid ? "grid" : "canvas");
  const key = useMemo(() => JSON.stringify(workspace), [workspace]);
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold">Pizarra</span>
        <div className="ml-auto flex rounded-lg bg-surface-2 p-1 text-xs">
          {hasGrid && (
            <button className={cx("rounded-md px-3 py-1", tab === "grid" && "bg-surface text-ink shadow")} onClick={() => setTab("grid")}>
              Cuadrícula
            </button>
          )}
          <button className={cx("rounded-md px-3 py-1", tab === "canvas" && "bg-surface text-ink shadow")} onClick={() => setTab("canvas")}>
            Lienzo libre
          </button>
        </div>
      </div>
      {tab === "grid" && workspace?.type === "column" && <ColumnGrid key={key} ws={workspace} solved={solved} />}
      {tab === "grid" && workspace?.type === "division" && <DivisionGrid key={key} ws={workspace} />}
      {tab === "canvas" && <Canvas key={key} />}
    </div>
  );
}
