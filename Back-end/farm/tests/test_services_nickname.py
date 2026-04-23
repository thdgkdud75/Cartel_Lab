import pytest
from farm.services import validate_nickname, NicknameError


def test_valid_nickname():
    assert validate_nickname("뭉치") == "뭉치"
    assert validate_nickname("Mr. Egg") == "Mr. Egg"


def test_too_short():
    with pytest.raises(NicknameError):
        validate_nickname("")


def test_too_long():
    with pytest.raises(NicknameError):
        validate_nickname("a" * 13)


def test_whitespace_only():
    with pytest.raises(NicknameError):
        validate_nickname("   ")


def test_profanity():
    with pytest.raises(NicknameError):
        validate_nickname("씨발이")
