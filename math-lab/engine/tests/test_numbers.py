"""Pruebas del parseo exacto, el formato y los algoritmos con traza."""

from collections import Counter
from fractions import Fraction as F

import pytest
from hypothesis import given
from hypothesis import strategies as st

from mathlab_engine.algorithms.columns import (
    add_without_carry,
    column_add,
    column_sub,
    long_division,
    long_multiplication,
    sub_smaller_from_larger,
)
from mathlab_engine.algorithms.expr import evaluate_left_to_right, evaluate_steps
from mathlab_engine.algorithms.numtheory import euclid_trace, factorize, is_prime, sieve, to_base
from mathlab_engine.core.types import AnswerSpec
from mathlab_engine.core.validate import is_help_request, validate
from mathlab_engine.numbers.fmt import decimal_str, fixed_str, round_half_up
from mathlab_engine.numbers.parse import ParseError, parse_factorization, parse_number
from mathlab_engine.numbers.words import decimal_to_words, number_to_words


@pytest.mark.parametrize(("text", "value"), [
    ("75", F(75)), ("-12", F(-12)), ("0,75", F(3, 4)), ("0.75", F(3, 4)), (",5", F(1, 2)), ("3/4", F(3, 4)),
    ("-3/4", F(-3, 4)), ("1 3/4", F(7, 4)), ("-1 1/2", F(-3, 2)), (" 12 ", F(12)), ("−5", F(-5)),
])
def test_parse_number(text, value):
    assert parse_number(text)[0] == value


@pytest.mark.parametrize("text", ["", "abc", "1/0", "1.000", "2,3,4", "3//4"])
def test_parse_number_rejects(text):
    with pytest.raises(ParseError):
        parse_number(text)


def test_parse_factorization():
    assert parse_factorization("2^3·3") == Counter({2: 3, 3: 1})
    assert parse_factorization("2·2·2·3") == Counter({2: 3, 3: 1})
    assert parse_factorization("2³ × 3") == Counter({2: 3, 3: 1})
    assert parse_factorization("5¹²") == Counter({5: 12})


def test_simplified_form_required():
    spec = AnswerSpec(kind="number", value=F(1, 2), form="simplified")
    assert validate(spec, "1/2").correct
    r = validate(spec, "2/4")
    assert not r.correct and r.format_issue


def test_help_words():
    for w in ["NO SÉ", "ayuda", "No entiendo", "me trabé"]:
        assert is_help_request(w)
    assert not is_help_request("75")


def test_words():
    assert number_to_words(75) == "setenta y cinco"
    assert number_to_words(100) == "cien"
    assert number_to_words(101) == "ciento uno"
    assert number_to_words(21000) == "veintiún mil"
    assert number_to_words(1_000_000) == "un millón"
    assert number_to_words(2_500_000) == "dos millones quinientos mil"
    assert decimal_to_words(3, "25") == "tres enteros veinticinco centésimas"
    assert decimal_to_words(0, "1") == "cero enteros una décima"


def test_rounding_half_up():
    assert round_half_up(F("2.345"), 2) == F("2.35")
    assert round_half_up(F("2.5"), 0) == 3
    assert fixed_str(F("2.5"), 2) == "2,50"
    assert decimal_str(F(3, 8)) == "0,375"


@given(st.lists(st.integers(0, 99999), min_size=2, max_size=5))
def test_column_add(nums):
    total, cols = column_add(nums)
    assert total == sum(nums)
    assert sum(c.write * 10**c.index for c in cols) + cols[-1].carry_out * 10 ** len(cols) == total


@given(st.integers(0, 10**6), st.integers(0, 10**6))
def test_column_sub(a, b):
    a, b = max(a, b), min(a, b)
    diff, cols = column_sub(a, b)
    assert diff == a - b == sum(c.write * 10**c.index for c in cols)


@given(st.integers(1, 99999), st.integers(1, 9999))
def test_long_mult(a, b):
    p, rows = long_multiplication(a, b)
    assert p == a * b == sum(r.partial for r in rows)


@given(st.integers(0, 10**7), st.integers(1, 999))
def test_long_division(D, d):
    q, r, steps = long_division(D, d)
    assert q * d + r == D and 0 <= r < d
    assert int("".join(str(s.q_digit) for s in steps)) == q
    for s in steps:
        assert 0 <= s.remainder < d


def test_buggy_algorithms():
    assert add_without_carry([48, 27]) == 65
    assert sub_smaller_from_larger(52, 27) == 35


def test_expression_hierarchy():
    assert evaluate_steps("3 + 4 × 2")[0] == 11
    assert evaluate_left_to_right("3 + 4 × 2") == 14
    assert evaluate_steps("{2 + [3 × (4 - 1)]} ÷ 11")[0] == 1
    assert evaluate_steps("2^3 + √49 × 2")[0] == 22
    assert evaluate_steps("√(16 + 9) × 3")[0] == 15
    assert evaluate_steps("20 ÷ 4 × 5")[0] == 25  # izquierda a derecha entre × y ÷


def test_number_theory():
    assert sieve(30)[0] == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    assert factorize(360) == Counter({2: 3, 3: 2, 5: 1})
    assert euclid_trace(48, 18)[-1][1] == 6
    assert to_base(255, 16) == "FF" and to_base(10, 2) == "1010"
    assert not is_prime(1) and is_prime(2) and not is_prime(91)
