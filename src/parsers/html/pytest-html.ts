import { readFileSync } from 'fs';
import * as cheerio from 'cheerio';

export interface PytestTest {
  nodeid: string;
  outcome: string;
  duration: number;
  setup?: {
    duration: number;
    outcome: string;
  };
  call?: {
    duration: number;
    outcome: string;
    longrepr?: string;
  };
  teardown?: {
    duration: number;
    outcome: string;
  };
}

export interface PytestReport {
  created: number;
  duration: number;
  exitCode: number;
  root: string;
  environment?: Record<string, string>;
  tests: PytestTest[];
}

export function extractPytestJSON(htmlFilePath: string): PytestReport | null {
  try {
    const html = readFileSync(htmlFilePath, 'utf-8');
    const $ = cheerio.load(html);

    // Modern pytest-html (v3.x+) embeds data in a script tag
    let jsonData: any = null;

    // Look for embedded JSON data (pytest-html v3+)
    $('script').each((_, elem) => {
      const content = $(elem).html();
      if (!content) return;

      // Check for data embedded in script tag
      const dataVarMatch = content.match(/(?:var\s+data\s*=|window\.data\s*=|const\s+data\s*=)\s*({.*?});?\s*$/s);
      if (dataVarMatch) {
        try {
          jsonData = JSON.parse(dataVarMatch[1]);
          return false; // Break out of each()
        } catch {
          // Not valid JSON
        }
      }
    });

    // If we found embedded JSON, convert it
    if (jsonData) {
      return convertEmbeddedData(jsonData);
    }

    // Fallback: Parse HTML table structure (older pytest-html versions)
    return parseHtmlTable($);
  } catch (error) {
    throw new Error(
      `Failed to extract JSON from pytest HTML: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function convertEmbeddedData(data: any): PytestReport {
  // Modern pytest-html embeds a full report structure
  const report: PytestReport = {
    created: data.created || Date.now(),
    duration: data.duration || 0,
    exitCode: data.exitCode || 0,
    root: data.root || '',
    environment: data.environment || {},
    tests: [],
  };

  // Convert test data
  if (data.tests && Array.isArray(data.tests)) {
    report.tests = data.tests.map((test: any) => ({
      nodeid: test.nodeid || test.id || 'unknown',
      outcome: test.outcome || 'unknown',
      duration: test.duration || 0,
      setup: test.setup,
      call: test.call,
      teardown: test.teardown,
    }));
  }

  return report;
}

function parseHtmlTable($: cheerio.CheerioAPI): PytestReport | null {
  // Parse older pytest-html format with HTML tables
  const tests: PytestTest[] = [];
  
  // Look for results table
  const resultsTable = $('#results-table, table.results, .results table').first();
  if (resultsTable.length === 0) {
    // Try generic table parsing
    $('table tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 2) {
        const testName = cells.eq(0).text().trim();
        const result = cells.eq(1).text().trim().toLowerCase();
        const duration = cells.eq(2) ? parseFloat(cells.eq(2).text()) || 0 : 0;
        
        if (testName && result) {
          tests.push({
            nodeid: testName,
            outcome: result,
            duration: duration,
          });
        }
      }
    });
  } else {
    // Parse structured results table
    resultsTable.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      const testName = cells.eq(0).text().trim();
      const result = cells.eq(1).text().trim().toLowerCase();
      const duration = cells.eq(2) ? parseFloat(cells.eq(2).text()) || 0 : 0;
      
      if (testName && result) {
        tests.push({
          nodeid: testName,
          outcome: result,
          duration: duration,
        });
      }
    });
  }

  if (tests.length === 0) {
    return null;
  }

  // Calculate total duration
  const totalDuration = tests.reduce((sum, test) => sum + test.duration, 0);

  return {
    created: Date.now(),
    duration: totalDuration,
    exitCode: tests.some(t => t.outcome === 'failed') ? 1 : 0,
    root: '',
    tests,
  };
}
