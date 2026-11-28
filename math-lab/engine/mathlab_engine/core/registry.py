"""Registro de generadores y API pública para producir ejercicios.

Cada generador es una función decorada con ``@generator``. Recibe un ``Ctx``
(semilla, nivel y variante ya resueltos) y devuelve un ``Exercise``.

La aleatoriedad es REPRODUCIBLE: ``(generator_id, version, level, variant, seed)``
determina por completo el ejercicio. Así podemos regenerar cualquier ejercicio
antiguo para revisarlo sin guardarlo entero.
"""

from __future__ import annotations

import random
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from .types import AnswerSpec, Choice, Exercise, Misconception, Step
from .validate import values_equal


@dataclass(frozen=True)
class GeneratorInfo:
    id: str
    title: str
    variants: dict[int, tuple[str, ...]]  # nivel → variantes disponibles
    fn: Callable[[Ctx], Exercise]
    version: int = 1


REGISTRY: dict[str, GeneratorInfo] = {}


class GenerationRetry(Exception):
    """El generador descartó una combinación (p. ej. ambigua); se reintenta."""


@dataclass
class Ctx:
    gen: GeneratorInfo
    level: int
    variant: str
    seed: int
    rng: random.Random
    steps: list[Step] = field(default_factory=list)
    misconceptions: list[Misconception] = field(default_factory=list)

    # --- utilidades de azar -------------------------------------------------
    def randint(self, a: int, b: int) -> int:
        return self.rng.randint(a, b)

    def choice(self, seq: Sequence[Any]) -> Any:
        return self.rng.choice(list(seq))

    def sample(self, seq: Sequence[Any], k: int) -> list[Any]:
        return self.rng.sample(list(seq), k)

    def shuffle(self, seq: Sequence[Any]) -> list[Any]:
        items = list(seq)
        self.rng.shuffle(items)
        return items

    def by_level(self, l1: Any, l2: Any, l3: Any) -> Any:
        return {1: l1, 2: l2, 3: l3}[self.level]

    def retry(self) -> None:
        raise GenerationRetry

    # --- construcción de la solución ---------------------------------------
    def step(self, title: str, explanation: str, *, why: str = "", procedure: str = "",
             prop: str = "", prompt: str | None = None, answer: AnswerSpec | None = None) -> int:
        n = len(self.steps) + 1
        self.steps.append(Step(f"Paso {n}. {title}", explanation, why, procedure, prop, prompt, answer))
        return n - 1

    def mistake(self, code: str, title: str, explanation: str, value: Any, step: int | None = None) -> None:
        self.misconceptions.append(Misconception(code, title, explanation, value, step))

    def build(self, *, name: str, procedure: str, prompt: str, answer: AnswerSpec,
              final: str, properties: Sequence[str] = (), hints: Sequence[str] = (),
              workspace: dict[str, Any] | None = None, simpler: tuple[str, int] | None = None) -> Exercise:
        # Filtramos errores típicos que coinciden con la respuesta correcta
        # (si no, un acierto se diagnosticaría como error) y duplicados.
        seen: set[str] = set()
        clean: list[Misconception] = []
        for m in self.misconceptions:
            try:
                if values_equal(answer, m.value):
                    continue
            except Exception:  # noqa: BLE001
                continue
            key = repr(m.value)
            if key in seen:
                continue
            seen.add(key)
            clean.append(m)
        if simpler is None and self.level > 1:
            simpler = (self.gen.id, self.level - 1)
        return Exercise(
            generator_id=self.gen.id, version=self.gen.version, seed=self.seed, level=self.level,
            variant=self.variant, exercise_name=name, procedure_name=procedure, prompt=prompt,
            answer=answer, solution=tuple(self.steps), final_answer_text=final,
            properties=tuple(properties), misconceptions=tuple(clean), hints=tuple(hints),
            workspace=workspace, simpler=simpler,
        )


def generator(gen_id: str, title: str, variants: dict[int, Sequence[str]] | None = None,
              version: int = 1) -> Callable[[Callable[[Ctx], Exercise]], Callable[[Ctx], Exercise]]:
    def deco(fn: Callable[[Ctx], Exercise]) -> Callable[[Ctx], Exercise]:
        if gen_id in REGISTRY:
            raise ValueError(f"Generador duplicado: {gen_id}")
        v = {lvl: tuple(vs) for lvl, vs in (variants or {1: ["base"], 2: ["base"], 3: ["base"]}).items()}
        REGISTRY[gen_id] = GeneratorInfo(gen_id, title, v, fn, version)
        return fn

    return deco


def generate(gen_id: str, level: int, seed: int, variant: str | None = None) -> Exercise:
    """Punto de entrada público: produce un ejercicio verificado."""
    _ensure_loaded()
    info = REGISTRY[gen_id]
    level = max(1, min(3, level))
    while level not in info.variants:
        level -= 1
    if variant is None:
        variant = random.Random(f"v:{gen_id}:{level}:{seed}").choice(info.variants[level])
    for attempt in range(200):
        rng = random.Random(f"{gen_id}:{info.version}:{level}:{variant}:{seed}:{attempt}")
        ctx = Ctx(info, level, variant, seed, rng)
        try:
            return info.fn(ctx)
        except GenerationRetry:
            continue
    raise RuntimeError(f"El generador {gen_id} no produjo un ejercicio válido")


def mc(ctx: Ctx, correct: str, distractors: Sequence[str], *, shuffle: bool = True) -> AnswerSpec:
    """Opción múltiple: devuelve un AnswerSpec 'choice' con opciones barajadas."""
    labels = [correct, *[d for d in dict.fromkeys(distractors) if d != correct]]
    if shuffle:
        labels = ctx.shuffle(labels)
    choices = tuple(Choice(chr(97 + i), lab) for i, lab in enumerate(labels))
    cid = next(c.id for c in choices if c.label == correct)
    return AnswerSpec(kind="choice", value=cid, choices=choices)


def choice_id(spec: AnswerSpec, label: str) -> str:
    return next(c.id for c in spec.choices if c.label == label)


_LOADED = False


def _ensure_loaded() -> None:
    global _LOADED
    if not _LOADED:
        from .. import generators  # noqa: F401  (importa y registra todos)

        _LOADED = True
