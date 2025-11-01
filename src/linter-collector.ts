import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from './utils/logger.js';
import type { JobLog, LinterOutput } from './types.js';
import { detectLinterType, extractLinterOutput } from './parsers/linters/extractors.js';

export interface LinterCollectionResult {
  linterOutputs: Map<string, LinterOutput[]>; // runId -> LinterOutput[]
}

export async function collectLinterOutputs(
  outputDir: string,
  logsByRun: Map<string, JobLog[]>,
  logger: Logger
): Promise<LinterCollectionResult> {
  const linterOutputs = new Map<string, LinterOutput[]>();

  for (const [runId, logs] of logsByRun.entries()) {
    logger.debug(`\nProcessing linter outputs for run ${runId}...`);

    const runLinterOutputs: LinterOutput[] = [];

    for (const log of logs) {
      if (!log.logFile || log.extractionStatus !== 'success') {
        continue;
      }

      try {
        const logContent = readFileSync(log.logFile, 'utf-8');
        const linterType = detectLinterType(log.jobName, logContent);

        if (!linterType) {
          logger.debug(`  No linter detected in job: ${log.jobName}`);
          continue;
        }

        logger.debug(`  Detected ${linterType} in job: ${log.jobName}`);

        const linterOutput = extractLinterOutput(linterType, logContent);

        if (linterOutput) {
          // Save linter output
          const lintingDir = join(outputDir, 'linting', runId);
          mkdirSync(lintingDir, { recursive: true });

          const fileName = `${sanitizeJobName(log.jobName)}-${linterType}.txt`;
          const filePath = join(lintingDir, fileName);

          writeFileSync(filePath, linterOutput);

          runLinterOutputs.push({
            detectedType: `${linterType}-txt`,
            filePath,
          });

          logger.debug(`    Saved linter output to ${filePath}`);

          // Update job log with linter outputs
          log.linterOutputs = log.linterOutputs || [];
          log.linterOutputs.push({
            detectedType: `${linterType}-txt`,
            filePath,
          });
        }
      } catch (error) {
        logger.error(
          `  Failed to process linter output for ${log.jobName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (runLinterOutputs.length > 0) {
      linterOutputs.set(runId, runLinterOutputs);
    }
  }

  return { linterOutputs };
}

function sanitizeJobName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
