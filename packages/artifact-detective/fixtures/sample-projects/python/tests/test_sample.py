"""Sample pytest tests with deliberate pass/fail/skip."""
import pytest


def test_passes_basic_assertion():
    """Simple passing test."""
    assert 1 + 1 == 2


def test_fails_deliberately():
    """Deliberate failure for fixture generation."""
    assert 1 + 1 == 3, "Expected failure"


@pytest.mark.skip(reason="Skipped for fixture generation")
def test_skipped():
    """Skipped test."""
    assert True is False


def test_another_pass():
    """Another passing test."""
    assert "hello" in "hello world"


def test_async_failure():
    """Test that raises exception."""
    raise ValueError("Deliberate async test failure")


def test_list_operations():
    """Test with list operations."""
    items = [1, 2, 3]
    assert len(items) == 3
    assert 2 in items


def test_string_matching():
    """Test string operations."""
    text = "pytest fixture"
    assert text.startswith("pytest")
    assert "fixture" in text
