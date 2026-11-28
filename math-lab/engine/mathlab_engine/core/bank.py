"""Ejercicios a partir de un banco de preguntas (temas conceptuales).

El banco vive en el currículo (contenido), pero el ejercicio se construye
aquí para que TODOS los ejercicios tengan la misma forma (`Exercise`) y se
validen con el mismo código determinista.
"""

from __future__ import annotations

import random
from typing import Any

from .types import AnswerSpec, Choice, Exercise, Step

BANK_PREFIX = "bank:"


def bank_generator_id(topic_uid: str) -> str:
    return f"{BANK_PREFIX}{topic_uid}"


def exercise_from_bank(topic_uid: str, index: int, item: dict[str, Any], seed: int) -> Exercise:
    options: list[str] = list(item["options"])
    correct_label = options[item["answer"]]
    rng = random.Random(f"bank:{topic_uid}:{index}:{seed}")
    rng.shuffle(options)
    choices = tuple(Choice(chr(97 + i), o) for i, o in enumerate(options))
    cid = next(c.id for c in choices if c.label == correct_label)
    level = int(item.get("level", 1))
    return Exercise(
        generator_id=bank_generator_id(topic_uid), version=1, seed=seed, level=level, variant=str(index),
        exercise_name="Pregunta de comprensión", procedure_name="Razonamiento conceptual",
        prompt=item["question"], answer=AnswerSpec(kind="choice", value=cid, choices=choices),
        solution=(Step("Paso 1. Razonar la respuesta", item["explanation"], procedure="Razonamiento conceptual"),),
        final_answer_text=correct_label,
        hints=("Vuelve a leer la sección de teoría correspondiente: la respuesta se deduce de la definición.",),
    )
