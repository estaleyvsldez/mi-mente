"""MATH LAB — motor matemático determinista."""

from .core.registry import REGISTRY, generate
from .core.validate import is_help_request, validate_exercise, validate_step

__all__ = ["REGISTRY", "generate", "validate_exercise", "validate_step", "is_help_request"]
