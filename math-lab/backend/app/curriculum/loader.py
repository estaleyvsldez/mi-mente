"""Carga y valida el currículo desde ``curriculum/``.

Expone un objeto ``Curriculum`` inmutable con bloques, temas, lecciones y el
orden global (para prerrequisitos y desbloqueos). Preparado para varios
módulos: cada subcarpeta de ``curriculum/`` con un ``pensum.yaml`` es uno.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

from .models import BlockLessons, Pensum, TopicLesson

ROOT = Path(os.environ.get("MATHLAB_CURRICULUM", Path(__file__).resolve().parents[3] / "curriculum"))

# Bancos conceptuales: mínimo de preguntas para temas sin generador.
MIN_BANK = 9


@dataclass(frozen=True)
class GenRef:
    gen_id: str
    variant: str | None

    @staticmethod
    def parse(s: str) -> GenRef:
        gid, _, var = s.partition("@")
        return GenRef(gid, var or None)


@dataclass(frozen=True)
class Topic:
    uid: str  # mat01.b04.t05
    module_id: str
    block_id: str
    id: str
    number: str  # "4.5"
    title: str
    gens: tuple[GenRef, ...]
    order: int  # posición global (0..N-1)
    lesson: TopicLesson | None

    @property
    def is_conceptual(self) -> bool:
        return not self.gens


@dataclass(frozen=True)
class Block:
    uid: str
    module_id: str
    id: str
    number: int
    title: str
    intro: str
    topics: tuple[Topic, ...]


@dataclass
class Curriculum:
    modules: dict[str, dict] = field(default_factory=dict)
    blocks: dict[str, Block] = field(default_factory=dict)
    topics: dict[str, Topic] = field(default_factory=dict)
    ordered_topics: list[Topic] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)

    def block_of(self, topic_uid: str) -> Block:
        t = self.topics[topic_uid]
        return self.blocks[f"{t.module_id}.{t.block_id}"]

    def previous(self, topic_uid: str) -> Topic | None:
        t = self.topics[topic_uid]
        return self.ordered_topics[t.order - 1] if t.order > 0 else None


def _load_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load(root: Path = ROOT) -> Curriculum:
    from mathlab_engine import REGISTRY
    from mathlab_engine.core.registry import _ensure_loaded

    _ensure_loaded()
    cur = Curriculum()
    order = 0
    for mod_dir in sorted(p for p in root.iterdir() if (p / "pensum.yaml").exists()):
        pensum = Pensum.model_validate(_load_yaml(mod_dir / "pensum.yaml"))
        mid = pensum.module.id
        cur.modules[mid] = pensum.module.model_dump()
        lessons_dir = mod_dir / "lessons"
        for bi, b in enumerate(pensum.blocks, start=1):
            lf = lessons_dir / f"{b.id}.yaml"
            bl = BlockLessons.model_validate(_load_yaml(lf)) if lf.exists() else None
            if bl and bl.block != b.id:
                cur.problems.append(f"{lf.name}: block={bl.block} no coincide con {b.id}")
            topics = []
            for ti, t in enumerate(b.topics, start=1):
                gens = tuple(GenRef.parse(g) for g in t.gens)
                for g in gens:
                    if g.gen_id not in REGISTRY:
                        cur.problems.append(f"{mid}.{b.id}.{t.id}: generador inexistente {g.gen_id}")
                    elif g.variant and not any(g.variant in vs for vs in REGISTRY[g.gen_id].variants.values()):
                        cur.problems.append(f"{mid}.{b.id}.{t.id}: variante inexistente {g.gen_id}@{g.variant}")
                lesson = bl.topics.get(t.id) if bl else None
                if lesson is None:
                    cur.problems.append(f"{mid}.{b.id}.{t.id}: falta la lección")
                elif not gens and len(lesson.practice) < MIN_BANK:
                    cur.problems.append(f"{mid}.{b.id}.{t.id}: tema conceptual con banco de {len(lesson.practice)} preguntas (< {MIN_BANK})")
                topic = Topic(uid=f"{mid}.{b.id}.{t.id}", module_id=mid, block_id=b.id, id=t.id, number=f"{bi}.{ti}",
                              title=t.title, gens=gens, order=order, lesson=lesson)
                order += 1
                topics.append(topic)
                cur.topics[topic.uid] = topic
                cur.ordered_topics.append(topic)
            if bl:
                extra = set(bl.topics) - {t.id for t in b.topics}
                if extra:
                    cur.problems.append(f"{lf.name}: temas que no existen en el pensum: {sorted(extra)}")
            cur.blocks[f"{mid}.{b.id}"] = Block(uid=f"{mid}.{b.id}", module_id=mid, id=b.id, number=bi, title=b.title,
                                                intro=bl.intro if bl else "", topics=tuple(topics))
    return cur


@lru_cache(maxsize=1)
def get_curriculum() -> Curriculum:
    return load()
