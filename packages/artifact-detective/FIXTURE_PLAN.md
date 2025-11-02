# Fixture Generation Framework Plan

## Overview

Create reproducible test fixtures from real tools using small sample projects in multiple languages. Each project generates real CI artifacts (test results, linter output, type checker reports) to ensure parsers work with actual tool output.

## Goals

1. **Real artifacts**: Generate fixtures from actual tools (pytest, jest, eslint, tsc, etc.)
2. **Reproducibility**: Makefile-driven generation, committed to git
3. **Test validation**: Manifest-based tests verify detection and parsing
4. **Multi-language coverage**: Python, JavaScript, Java, Go, Rust

## Directory Structure

```
fixtures/
├── sample-projects/
│   ├── python/
│   │   ├── Makefile
│   │   ├── manifest.yml
│   │   ├── pyproject.toml
│   │   ├── pytest.ini
│   │   ├── tests/
│   │   │   └── test_sample.py      # Mix of pass/fail/skip
│   │   └── src/
│   │       └── sample.py            # With type/lint issues
│   ├── javascript/
│   │   ├── Makefile
│   │   ├── manifest.yml
│   │   ├── package.json
│   │   ├── jest.config.js
│   │   ├── playwright.config.ts
│   │   ├── test/
│   │   │   ├── sample.test.js      # Jest tests
│   │   │   └── e2e.spec.js         # Playwright tests
│   │   └── src/
│   │       └── sample.js            # With eslint issues
│   ├── java/
│   │   ├── Makefile
│   │   ├── manifest.yml
│   │   ├── pom.xml
│   │   └── src/
│   │       ├── main/java/...
│   │       └── test/java/...       # JUnit tests
│   ├── go/
│   │   ├── Makefile
│   │   ├── manifest.yml
│   │   ├── go.mod
│   │   ├── sample.go
│   │   └── sample_test.go           # go test
│   └── rust/
│       ├── Makefile
│       ├── manifest.yml
│       ├── Cargo.toml
│       ├── src/
│       │   └── lib.rs
│       └── tests/
│           └── integration_test.rs
├── generated/                       # Output from sample projects
│   ├── python/
│   ├── javascript/
│   ├── java/
│   ├── go/
│   └── rust/
└── README.md                        # Framework documentation
```

## Manifest Schema

Each `manifest.yml` describes expected artifacts for test validation:

```yaml
language: python
tools:
  - name: pytest
    version: "8.x"
  - name: pytest-html
    version: "4.x"
  - name: mypy
    version: "1.x"
  - name: ruff
    version: "latest"

artifacts:
  - file: "test-results/report.html"
    type: pytest-html
    format: html
    description: "Pytest HTML report with 3 failures, 2 passes"

  - file: "test-results/report.json"
    type: pytest-json
    format: json
    description: "Pytest JSON reporter output"

  - file: "ruff-output.txt"
    type: ruff-txt
    format: txt
    description: "Ruff linter output with 5 violations"

  - file: "mypy-output.txt"
    type: mypy-txt
    format: txt
    description: "Mypy type checker with 2 errors"

commands:
  generate: "make"
  clean: "make clean"
```

## Makefile Pattern

Standard Makefile for each language:

```makefile
.PHONY: all clean test lint typecheck

OUTDIR := ../../generated/python

all: clean test lint typecheck

test:
	pytest --html=$(OUTDIR)/test-results/report.html --self-contained-html
	pytest --json-report --json-report-file=$(OUTDIR)/test-results/report.json

lint:
	ruff check . > $(OUTDIR)/ruff-output.txt || true

typecheck:
	mypy src/ > $(OUTDIR)/mypy-output.txt || true

clean:
	rm -rf $(OUTDIR)
	mkdir -p $(OUTDIR)/test-results
```

## Test Integration

Manifest-based validation tests:

```typescript
// test/fixture-validation.test.ts
import { readFileSync } from 'fs'
import { parse as parseYAML } from 'yaml'
import { detectArtifactType } from '../src'

describe('Fixture validation', () => {
  const languages = ['python', 'javascript', 'java', 'go', 'rust']

  for (const lang of languages) {
    describe(`${lang} fixtures`, () => {
      const manifest = parseYAML(
        readFileSync(`fixtures/sample-projects/${lang}/manifest.yml`, 'utf-8')
      )

      for (const artifact of manifest.artifacts) {
        it(`detects ${artifact.file} as ${artifact.type}`, () => {
          const path = `fixtures/generated/${lang}/${artifact.file}`
          const result = detectArtifactType(path)
          expect(result.detectedType).toBe(artifact.type)
          expect(result.originalFormat).toBe(artifact.format)
        })
      }
    })
  }
})
```

## Sample Test Content

### Python test_sample.py

```python
def test_pass():
    assert 1 + 1 == 2

def test_fail():
    assert 1 + 1 == 3, "Math is broken"

def test_skip():
    pytest.skip("Not implemented yet")
```

### Python sample.py (with issues)

```python
# Ruff will catch these
def unused_function():  # unused-function
    x = 1  # unused-variable
    pass

# Mypy will catch these
def bad_types(x) -> str:  # Missing type annotation
    return x + 1  # Type mismatch
```

## Coverage Targets

### Test Frameworks
- **Python**: pytest (JSON + HTML), unittest
- **JavaScript**: jest (JSON), playwright (JSON + HTML)
- **Java**: JUnit (XML)
- **Go**: go test (JSON via -json flag)
- **Rust**: cargo test (JSON via --message-format=json)

### Linters
- **Python**: ruff, flake8, pylint
- **JavaScript**: eslint, prettier
- **TypeScript**: tsc
- **Go**: staticcheck, golint
- **Rust**: clippy

### Type Checkers
- **Python**: mypy, pyright
- **TypeScript**: tsc
- **Go**: built-in type checking
- **Rust**: built-in type checking

## Implementation Steps

1. **Phase 1: Python sample project**
   - Create directory structure
   - Write Makefile + manifest.yml
   - Add test fixtures with deliberate failures
   - Add source code with lint/type issues
   - Generate initial artifacts
   - Commit generated artifacts

2. **Phase 2: Test validation**
   - Implement manifest parser
   - Add fixture validation tests
   - Verify detection works on generated artifacts

3. **Phase 3: Expand languages**
   - JavaScript (jest + playwright + eslint + tsc)
   - Java (junit + checkstyle)
   - Go (go test + staticcheck)
   - Rust (cargo test + clippy)

4. **Phase 4: CI integration**
   - Add workflow to regenerate fixtures
   - Detect drift when tool versions change
   - Optional: fail CI if generated artifacts don't match committed

## Benefits

- **Real data**: Parsers tested against actual tool output
- **Version tracking**: See how tool output evolves
- **Regression detection**: Know when parsers break
- **Documentation**: Examples show supported formats
- **Onboarding**: New contributors see real fixtures

## Future Extensions

- **Matrix testing**: Generate artifacts from multiple tool versions
- **Snapshot testing**: Detect when tool output format changes
- **Parser benchmarks**: Performance testing with real artifacts
- **Corpus expansion**: Accept community-contributed sample projects
