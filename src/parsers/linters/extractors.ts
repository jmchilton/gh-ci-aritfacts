export interface LinterMatch {
  linterType: string;
  startLine: number;
  endLine: number;
  content: string;
}

// Pattern to detect linter types from job names or log content
const LINTER_PATTERNS = [
  { type: 'eslint', patterns: [/eslint/i, /npm run lint/i] },
  { type: 'prettier', patterns: [/prettier/i, /npm run format/i] },
  { type: 'ruff', patterns: [/ruff check/i, /ruff\s/i] },
  { type: 'flake8', patterns: [/flake8/i] },
  { type: 'isort', patterns: [/isort/i] },
  { type: 'black', patterns: [/black --check/i, /black\s/i] },
  { type: 'tsc', patterns: [/tsc --noEmit/i, /npm run type-check/i] },
  { type: 'mypy', patterns: [/mypy/i] },
  { type: 'pylint', patterns: [/pylint/i] },
];

export function detectLinterType(jobName: string, logContent: string): string | null {
  const combined = `${jobName}\n${logContent.slice(0, 1000)}`; // Check first 1000 chars

  for (const { type, patterns } of LINTER_PATTERNS) {
    if (patterns.some(pattern => pattern.test(combined))) {
      return type;
    }
  }

  return null;
}

export function extractLinterOutput(
  linterType: string,
  logContent: string
): string | null {
  const lines = logContent.split('\n');

  switch (linterType) {
    case 'eslint':
      return extractESLintOutput(lines);

    case 'prettier':
      return extractPrettierOutput(lines);

    case 'ruff':
    case 'flake8':
    case 'pylint':
      return extractPythonLinterOutput(lines, linterType);

    case 'tsc':
      return extractTSCOutput(lines);

    case 'isort':
    case 'black':
      return extractFormatterOutput(lines, linterType);

    case 'mypy':
      return extractMypyOutput(lines);

    default:
      return null;
  }
}

function extractESLintOutput(lines: string[]): string | null {
  const outputLines: string[] = [];
  let inOutput = false;

  for (const line of lines) {
    // Start of eslint output (usually after command line)
    if (line.match(/eslint.*\.(js|ts|jsx|tsx)/i) || line.includes('npm run lint')) {
      inOutput = true;
      continue;
    }

    if (inOutput) {
      // End markers
      if (line.match(/^##\[/i) || line.match(/^\d+ problem/)) {
        outputLines.push(line);
        break;
      }

      // Capture error/warning lines
      if (line.trim()) {
        outputLines.push(line);
      }
    }
  }

  return outputLines.length > 0 ? outputLines.join('\n') : null;
}

function extractPrettierOutput(lines: string[]): string | null {
  const outputLines: string[] = [];
  let inOutput = false;

  for (const line of lines) {
    if (line.includes('prettier') || line.includes('npm run format')) {
      inOutput = true;
      continue;
    }

    if (inOutput) {
      // Prettier typically outputs file paths that need formatting
      if (line.match(/^[a-zA-Z0-9_\-\/\.]+\.(js|ts|jsx|tsx|json|css|md)/)) {
        outputLines.push(line);
      }

      // End marker
      if (line.match(/^##\[/)) {
        break;
      }
    }
  }

  return outputLines.length > 0 ? outputLines.join('\n') : null;
}

function extractPythonLinterOutput(lines: string[], linterType: string): string | null {
  const outputLines: string[] = [];
  let inOutput = false;

  for (const line of lines) {
    if (line.includes(linterType)) {
      inOutput = true;
      continue;
    }

    if (inOutput) {
      // End markers
      if (line.match(/^##\[/) || line.match(/^\d+ error/i)) {
        outputLines.push(line);
        break;
      }

      // Capture error lines (usually start with file path)
      if (line.match(/^[a-zA-Z0-9_\-\/\.]+\.py:\d+/)) {
        outputLines.push(line);
      } else if (line.trim() && outputLines.length > 0) {
        // Continuation of previous error
        outputLines.push(line);
      }
    }
  }

  return outputLines.length > 0 ? outputLines.join('\n') : null;
}

function extractTSCOutput(lines: string[]): string | null {
  const outputLines: string[] = [];
  let inOutput = false;

  for (const line of lines) {
    if (line.includes('tsc ') || line.includes('type-check')) {
      inOutput = true;
      continue;
    }

    if (inOutput) {
      // TypeScript errors usually start with file path
      if (line.match(/^[a-zA-Z0-9_\-\/\.]+\.tsx?:\d+:\d+/)) {
        outputLines.push(line);
      } else if (line.match(/error TS\d+:/)) {
        outputLines.push(line);
      } else if (line.match(/Found \d+ error/)) {
        outputLines.push(line);
        break;
      }
    }
  }

  return outputLines.length > 0 ? outputLines.join('\n') : null;
}

function extractFormatterOutput(lines: string[], formatterType: string): string | null {
  const outputLines: string[] = [];
  let inOutput = false;

  for (const line of lines) {
    if (line.includes(formatterType)) {
      inOutput = true;
      continue;
    }

    if (inOutput) {
      // Black/isort usually output "would reformat" or file names
      if (line.match(/would reformat/i) || line.match(/^[a-zA-Z0-9_\-\/\.]+\.py/)) {
        outputLines.push(line);
      }

      if (line.match(/^##\[/)) {
        break;
      }
    }
  }

  return outputLines.length > 0 ? outputLines.join('\n') : null;
}

function extractMypyOutput(lines: string[]): string | null {
  const outputLines: string[] = [];
  let inOutput = false;

  for (const line of lines) {
    if (line.includes('mypy')) {
      inOutput = true;
      continue;
    }

    if (inOutput) {
      // Mypy errors: file.py:line: error:
      if (line.match(/^[a-zA-Z0-9_\-\/\.]+\.py:\d+:\s*(error|warning):/)) {
        outputLines.push(line);
      } else if (line.match(/Found \d+ error/)) {
        outputLines.push(line);
        break;
      }
    }
  }

  return outputLines.length > 0 ? outputLines.join('\n') : null;
}
