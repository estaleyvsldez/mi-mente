"""Modelo de datos persistente (SQLAlchemy 2, SQLite).

El CURRÍCULO no se guarda aquí (vive en archivos YAML); sólo el PROGRESO del
estudiante. Los temas se referencian por su id estable (``mat01.b04.t05``).
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    type_annotation_map = {dict[str, Any]: JSON, list[Any]: JSON}


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), default="Estudiante")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class IssuedExercise(Base):
    """Un ejercicio entregado al estudiante. Se puede regenerar con (generador, semilla)."""

    __tablename__ = "issued_exercises"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    topic_uid: Mapped[str] = mapped_column(String(40), index=True)
    generator_id: Mapped[str] = mapped_column(String(80))
    version: Mapped[int] = mapped_column(Integer)
    seed: Mapped[int] = mapped_column(Integer)
    level: Mapped[int] = mapped_column(Integer)
    variant: Mapped[str] = mapped_column(String(40))
    mode: Mapped[str] = mapped_column(String(20))  # academia|practica|desafio|repaso|examen
    stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    assessment_id: Mapped[int | None] = mapped_column(ForeignKey("assessments.id"), nullable=True, index=True)
    help_level: Mapped[int] = mapped_column(Integer, default=0)
    answered: Mapped[bool] = mapped_column(Boolean, default=False)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    followup_required: Mapped[bool] = mapped_column(Boolean, default=False)
    followup_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("issued_exercises.id"), index=True)
    topic_uid: Mapped[str] = mapped_column(String(40), index=True)
    generator_id: Mapped[str] = mapped_column(String(80))
    level: Mapped[int] = mapped_column(Integer)
    variant: Mapped[str] = mapped_column(String(40))
    mode: Mapped[str] = mapped_column(String(20))
    stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    answer_raw: Mapped[str] = mapped_column(Text)
    correct: Mapped[bool] = mapped_column(Boolean)
    error_code: Mapped[str | None] = mapped_column(String(60), nullable=True)
    error_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    assisted: Mapped[bool] = mapped_column(Boolean, default=False)  # usó ayuda → no cuenta para dominio
    time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)


class StepAttempt(Base):
    __tablename__ = "step_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("issued_exercises.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer)
    answer_raw: Mapped[str] = mapped_column(Text)
    correct: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class TopicProgress(Base):
    __tablename__ = "topic_progress"
    __table_args__ = (UniqueConstraint("user_id", "topic_uid"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    topic_uid: Mapped[str] = mapped_column(String(40), index=True)
    stage: Mapped[str] = mapped_column(String(20), default="diagnostico")
    state: Mapped[str] = mapped_column(String(20), default="no_iniciado")  # no_iniciado|aprendiendo|en_practica|dominado|consolidado
    level: Mapped[int] = mapped_column(Integer, default=1)
    mastery: Mapped[float] = mapped_column(Float, default=0.0)
    sections_passed: Mapped[list[Any]] = mapped_column(JSON, default=list)
    diagnostic_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    exam_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    mastered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consolidated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class ReviewSchedule(Base):
    """Repetición espaciada (SM-2 simplificado) por tema."""

    __tablename__ = "review_schedule"
    __table_args__ = (UniqueConstraint("user_id", "topic_uid"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    topic_uid: Mapped[str] = mapped_column(String(40))
    due_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    interval_days: Mapped[float] = mapped_column(Float, default=1.0)
    ease: Mapped[float] = mapped_column(Float, default=2.5)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    last_review: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Assessment(Base):
    __tablename__ = "assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # diagnostico|intermedia|desafio|examen|consolidacion|bloque|modulo
    scope: Mapped[str] = mapped_column(String(40))  # uid de tema, bloque o módulo
    total: Mapped[int] = mapped_column(Integer)
    plan: Mapped[list[Any]] = mapped_column(JSON, default=list)  # [[topic_uid, level], ...]
    answered: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    time_limit_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class XpEvent(Base):
    __tablename__ = "xp_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(120))
    topic_uid: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class UnlockedAchievement(Base):
    __tablename__ = "achievements"
    __table_args__ = (UniqueConstraint("user_id", "code"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(40))
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class StudyDay(Base):
    __tablename__ = "study_days"
    __table_args__ = (UniqueConstraint("user_id", "day"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[date] = mapped_column(Date)
    exercises: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    minutes: Mapped[float] = mapped_column(Float, default=0.0)


class ChallengeRun(Base):
    __tablename__ = "challenge_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    scope: Mapped[str] = mapped_column(String(40))
    score: Mapped[int] = mapped_column(Integer)
    max_level: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
