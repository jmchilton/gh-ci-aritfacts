# Claude Code Instructions

This project is `gh-ci-artifacts` - a TypeScript CLI tool for downloading and parsing GitHub Actions CI artifacts and logs for LLM analysis.

## Project Overview

**Purpose:** Download GitHub Actions artifacts/logs from PRs, detect test framework types, convert HTML reports to JSON, extract linter outputs, and generate comprehensive summaries optimized for Claude consumption.

**Tech Stack:**
- TypeScript with ES modules
- Node 18+ runtime
- Vitest for testing
- Commander.js for CLI
- Cheerio for HTML parsing
- GitHub CLI (`gh`) for API access

## Code Organization

```
src/
├── cli.ts                    # Main CLI entry point
├── types.ts                  # TypeScript type definitions
├── config.ts                 # Config file loading and merging
├── downloader.ts             # Artifact download orchestration
├── log-extractor.ts          # Job log extraction
├── cataloger.ts              # Artifact cataloging and HTML conversion
├── linter-collector.ts       # Linter output extraction
├── summary-generator.ts      # Master summary generation
├── utils/
│   ├── gh.ts                 # GitHub CLI validation
│   ├── logger.ts             # Progress logging
│   └── retry.ts              # Retry logic with exponential backoff
├── github/
│   └── api.ts                # GitHub API wrapper via gh CLI
├── detectors/
│   └── type-detector.ts      # Artifact type detection
└── parsers/
    ├── html/
    │   └── playwright-html.ts  # Playwright HTML → JSON
    └── linters/
        └── extractors.ts      # Linter output extraction patterns

test/
├── config.test.ts            # Config loading tests (10 tests)
├── retry.test.ts             # Retry logic tests (13 tests)
└── type-detector.test.ts     # Type detection tests (11 tests)
```

## Development Guidelines

### Testing
- **Run tests:** `npm test`
- **Watch mode:** `npm run test:watch`
- **Coverage:** `npm run test:coverage` (75% threshold)
- Use Vitest's fake timers for async retry tests
- Mock file system operations in tests
- Create test fixtures in `test/fixtures/` directories

### Building
- **Build:** `npm run build` (outputs to `dist/`)
- **Lint:** `npm run lint` (TypeScript type checking)
- **Dev mode:** `npm run dev -- <args>` (runs via tsx without building)

### Code Style
- Strict TypeScript mode enabled
- ES modules (`.js` extensions required in imports)
- Concise error messages
- Progress logged to stderr, results to stdout
- Avoid emojis in code/commits (plan doc only)

### Adding Features

**New test framework support:**
1. Add pattern to `src/detectors/type-detector.ts`
2. Add tests to `test/type-detector.test.ts`
3. If HTML format, add parser to `src/parsers/html/`

**New linter support:**
1. Add pattern to `src/parsers/linters/extractors.ts` (LINTER_PATTERNS)
2. Add extraction function (e.g., `extractMyLinterOutput`)
3. Add case to `extractLinterOutput` switch

**Updating types:**
- All types in `src/types.ts`
- Update corresponding interfaces when changing data structures
- Maintain backward compatibility for output schemas

### Common Commands

```bash
# Install dependencies
npm install

# Run CLI locally
npm run dev -- owner/repo 123 --debug

# Build and test
npm run build && npm test

# Type check without building
npm run lint

# Clean build
rm -rf dist && npm run build
```

## Architecture Decisions

1. **Serial downloads:** Avoid GitHub rate limits
2. **gh CLI wrapper:** Battle-tested auth and retry handling
3. **No schema transformation:** Catalog types, don't transform JSON formats
4. **Resume mode:** Uses existing `artifacts.json` to skip successful downloads
5. **Exit codes:** 0=complete, 1=partial, 2=incomplete (for automation)

## Output Schema Contract

**Do not break these schemas** - downstream consumers depend on them:

- `summary.json`: Master summary (see types.ts → Summary)
- `catalog.json`: Type detection results (see types.ts → CatalogEntry)
- `artifacts.json`: Download inventory (see types.ts → ArtifactInventoryItem)

## Testing Strategy

- **Unit tests:** Config, retry logic, type detection
- **Integration tests:** Not included (require live GitHub API)
- **Fixture-based:** Use test fixtures for parsers/detectors
- **Mock gh CLI:** Avoid real API calls in tests

## Known Limitations

- Artifacts expire after 90 days (GitHub limitation)
- Serial downloads (slower but rate-limit safe)
- Some HTML formats may not be parseable
- Assumes POSIX-compliant shell for `gh` CLI

## Troubleshooting

**"gh CLI not authenticated":**
- Run: `gh auth login`

**Tests timing out:**
- Check fake timer usage in retry tests
- Use `await vi.runAllTimersAsync()` for async timers

**Type errors after changes:**
- Run `npm run lint` to catch issues early
- Ensure `.js` extensions in imports

## Future Extensibility

Potential additions (not in current scope):
- Plugin system for custom parsers
- Octokit backend as alternative to `gh` CLI
- GitLab CI / CircleCI support
- Historical failure tracking
- Parallel downloads with rate limiting
