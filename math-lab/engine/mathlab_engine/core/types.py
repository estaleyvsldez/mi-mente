"""Tipos fundamentales del motor matemático.

Todo lo que el motor produce (ejercicios, pasos, diagnósticos) se describe con
estas estructuras de datos inmutables. No dependen de la web ni de la base de
datos: son Python puro, fáciles de probar y de serializar a JSON.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from fractions import Fraction
from typing import Any, Literal

AnswerKind = Literal[
    "integer",  # número entero exacto: 75, -12
    "number",  # número racional exacto: 0,75 · 3/4 · 1 3/4 · 12
    "choice",  # una opción de una lista
    "multichoice",  # varias opciones (conjunto exacto)
    "token",  # texto corto normalizado: 1011 (binario), 1F (hex)
    "words",  # palabras en español: "setenta y cinco"
    "list",  # lista de números separados por ';'
    "factorization",  # 2^3·3 · 2·2·2·3
    "fields",  # varias casillas con nombre (cociente y residuo…)
]


@dataclass(frozen=True)
class Choice:
    id: str
    label: str


@dataclass(frozen=True)
class AnswerSpec:
    """Describe QUÉ respuesta se espera y CÓMO se valida."""

    kind: AnswerKind
    value: Any  # Fraction | int | str | list | dict | frozenset
    # Restricciones de forma para respuestas numéricas.
    form: Literal["any", "simplified", "decimal", "integer"] = "any"
    tolerance: Fraction | None = None  # sólo para aproximaciones declaradas
    choices: tuple[Choice, ...] = ()
    fields: tuple[tuple[str, str, AnswerSpec], ...] = ()  # (clave, etiqueta, spec)
    accepted: tuple[str, ...] = ()  # variantes textuales aceptadas (words/token)
    ordered: bool = True  # para listas: ¿importa el orden?
    unit: str = ""  # unidad mostrada junto a la casilla
    placeholder: str = ""


@dataclass(frozen=True)
class Step:
    """Un paso de la solución verificada.

    Si `answer` no es None, el paso puede presentarse como una pregunta al
    estudiante en el Modo Ayuda (el estudiante hace ese paso él mismo).
    """

    title: str
    explanation: str
    why: str = ""
    procedure: str = ""
    property: str = ""
    prompt: str | None = None
    answer: AnswerSpec | None = None


@dataclass(frozen=True)
class Misconception:
    """Un error típico: si la respuesta coincide con `value`, sabemos qué falló."""

    code: str
    title: str
    explanation: str
    value: Any
    step_index: int | None = None  # paso donde ocurre el error


@dataclass(frozen=True)
class Exercise:
    generator_id: str
    version: int
    seed: int
    level: int
    variant: str
    exercise_name: str  # "Suma de dos números naturales"
    procedure_name: str  # "Suma vertical con reagrupación"
    prompt: str  # Markdown con matemáticas en $...$
    answer: AnswerSpec
    solution: tuple[Step, ...]
    final_answer_text: str
    properties: tuple[str, ...] = ()
    misconceptions: tuple[Misconception, ...] = ()
    hints: tuple[str, ...] = ()
    workspace: dict[str, Any] | None = None  # datos para la pizarra estructurada
    simpler: tuple[str, int] | None = None  # (generador, nivel) de un ejercicio más fácil


@dataclass(frozen=True)
class Diagnosis:
    code: str
    title: str
    explanation: str
    step_index: int | None = None


@dataclass
class ValidationResult:
    correct: bool
    parsed: bool  # ¿se pudo interpretar la respuesta?
    message: str
    diagnosis: Diagnosis | None = None
    format_issue: str | None = None  # p. ej. "La fracción no está simplificada"
    field_results: dict[str, bool] = field(default_factory=dict)


def to_jsonable(obj: Any) -> Any:
    """Convierte dataclasses/Fraction/frozenset a tipos JSON."""
    if hasattr(obj, "__dataclass_fields__"):
        return to_jsonable(asdict(obj))
    if isinstance(obj, Fraction):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(v) for v in obj]
    if isinstance(obj, (set, frozenset)):
        return sorted(to_jsonable(v) for v in obj)
    return obj
