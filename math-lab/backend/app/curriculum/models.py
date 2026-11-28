"""Esquema (validado con Pydantic) del currículo y de las lecciones.

Si un archivo YAML no cumple el esquema, la aplicación NO arranca y las
pruebas fallan: así nunca llega contenido mal formado al estudiante.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TopicRef(Strict):
    id: str = Field(pattern=r"^t\d{2}$")
    title: str
    gens: list[str] = []


class BlockRef(Strict):
    id: str = Field(pattern=r"^b\d{2}$")
    title: str
    topics: list[TopicRef]


class ModuleInfo(Strict):
    id: str
    code: str
    title: str


class Pensum(Strict):
    module: ModuleInfo
    blocks: list[BlockRef]


# ------------------------------------------------------------------ lecciones


class CheckQuestion(Strict):
    """Pregunta de comprobación de una sección o del banco de práctica."""

    question: str
    options: list[str] = Field(min_length=2, max_length=5)
    answer: int  # índice de la opción correcta
    explanation: str
    level: int = Field(default=1, ge=1, le=3)

    @model_validator(mode="after")
    def _answer_in_range(self) -> CheckQuestion:
        if not 0 <= self.answer < len(self.options):
            raise ValueError(f"answer={self.answer} fuera de rango para {len(self.options)} opciones")
        if len(set(self.options)) != len(self.options):
            raise ValueError("Opciones duplicadas")
        return self


class Example(Strict):
    problem: str
    solution: str


class Section(Strict):
    title: str
    concept: str
    explanation: str
    definition: str
    rules: list[str] = []
    examples: list[Example] = Field(min_length=1)
    common_errors: list[str] = Field(min_length=1)
    summary: str
    check: CheckQuestion


class Intro(Strict):
    what: str
    purpose: str
    importance: str
    foundations: str
    prerequisites: list[str]
    outcomes: list[str] = Field(min_length=1)
    everyday_example: str


class GlossaryEntry(Strict):
    term: str
    definition: str


class TopicLesson(Strict):
    intro: Intro
    sections: list[Section] = Field(min_length=1, max_length=4)
    glossary: list[GlossaryEntry] = []
    practice: list[CheckQuestion] = []


class BlockLessons(Strict):
    block: str = Field(pattern=r"^b\d{2}$")
    intro: str
    topics: dict[str, TopicLesson]

    @field_validator("topics")
    @classmethod
    def _keys(cls, v: dict[str, TopicLesson]) -> dict[str, TopicLesson]:
        for k in v:
            if not (len(k) == 3 and k[0] == "t" and k[1:].isdigit()):
                raise ValueError(f"Clave de tema inválida: {k}")
        return v
