"""Sample Python code with deliberate linter and type violations."""
import os
import sys
import json  # F401: unused import (ruff)


# E302: expected 2 blank lines (ruff)
def unused_function():
    """Function with unused variable."""
    unused_var = 42  # F841: unused variable (ruff)
    return None


# Missing type annotations (mypy)
def bad_types(x):
    """Function missing type hints."""
    return x + 1


# Incorrect type annotation (mypy)
def returns_wrong_type(x: int) -> str:
    """Returns int but claims str."""
    return x + 1  # Type error


# Multiple issues
class SampleClass:
    """Sample class with issues."""

    def __init__(self, name):  # Missing type hints (mypy)
        self.name = name
        self.unused = "never used"  # F841 candidate

    # E301: expected 1 blank line (ruff)
    def method_with_issues(self, value):
        """Method with type issues."""
        result: str = value + 1  # Type mismatch (mypy)
        return result


# N802: function name should be lowercase (ruff)
def BadFunctionName():
    """Violates naming convention."""
    pass


# Unused variable
UNUSED_CONSTANT = "never referenced"  # F841
