import { readFileSync } from "fs";
import * as cheerio from "cheerio";
import type { PytestTest, PytestReport } from "../../types.js";

export function extractPytestJSON(htmlFilePath: string): PytestReport | null {
  try {
    const html = readFileSync(htmlFilePath, "utf-8");
    const $ = cheerio.load(html);

    // Modern pytest-html (v3.x+) embeds data in various ways
    let jsonData: any = null;

    // Method 1: Check for data-jsonblob attribute (most common in modern pytest-html)
    const dataContainer = $("#data-container");
    if (dataContainer.length > 0) {
      const jsonBlob = dataContainer.attr("data-jsonblob");
      if (jsonBlob) {
        try {
          // Cheerio automatically decodes HTML entities
          jsonData = JSON.parse(jsonBlob);
          if (jsonData) {
            return convertEmbeddedData(jsonData);
          }
        } catch {
          // Not valid JSON
        }
      }
    }

    // Method 2: Look for embedded JSON data in script tags
    $("script").each((_, elem) => {
      const content = $(elem).html();
      if (!content) return;

      // Check for data embedded in script tag
      const dataVarMatch = content.match(
        /(?:var\s+data\s*=|window\.data\s*=|const\s+data\s*=)\s*({.*?});?\s*$/s,
      );
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
      `Failed to extract JSON from pytest HTML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function convertEmbeddedData(data: any): PytestReport {
  // Modern pytest-html embeds a full report structure
  const report: PytestReport = {
    created: data.created || Date.now(),
    duration: 0,
    exitCode: 0,
    root: data.root || "",
    environment: data.environment || {},
    tests: [],
  };

  // Convert test data
  // In modern pytest-html, tests is an object keyed by nodeid, not an array
  if (data.tests && typeof data.tests === "object") {
    let totalDuration = 0;
    let hasFailed = false;

    for (const [nodeid, testResults] of Object.entries(data.tests)) {
      // testResults is an array of result objects for this test
      const results = testResults as any[];

      if (Array.isArray(results) && results.length > 0) {
        // Take the last result (most recent if retried)
        const lastResult = results[results.length - 1];

        // Parse duration (format: "HH:MM:SS" or number)
        let duration = 0;
        if (typeof lastResult.duration === "string") {
          const parts = lastResult.duration.split(":").map(Number);
          if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        } else if (typeof lastResult.duration === "number") {
          duration = lastResult.duration;
        }

        totalDuration += duration;

        // Map pytest result to outcome
        const result = (
          lastResult.result ||
          lastResult.outcome ||
          ""
        ).toLowerCase();
        const outcome = result.includes("pass")
          ? "passed"
          : result.includes("fail")
            ? "failed"
            : result.includes("skip")
              ? "skipped"
              : result.includes("error")
                ? "error"
                : result;

        if (outcome === "failed" || outcome === "error") {
          hasFailed = true;
        }

        const test: PytestTest = {
          nodeid,
          outcome,
          duration,
        };

        // Include log output (stack traces, captured stdout/stderr, etc.)
        if (lastResult.log) {
          test.log = lastResult.log;
        }

        // Include extras (screenshots, videos, other media)
        if (
          lastResult.extras &&
          Array.isArray(lastResult.extras) &&
          lastResult.extras.length > 0
        ) {
          test.extras = lastResult.extras;
        }

        // Include setup/call/teardown details if present
        if (lastResult.setup) {
          test.setup = lastResult.setup;
        }
        if (lastResult.call) {
          test.call = lastResult.call;
        }
        if (lastResult.teardown) {
          test.teardown = lastResult.teardown;
        }

        report.tests.push(test);
      }
    }

    report.duration = totalDuration;
    report.exitCode = hasFailed ? 1 : 0;
  } else if (Array.isArray(data.tests)) {
    // Fallback: handle array format if it exists
    report.tests = data.tests.map((test: any) => ({
      nodeid: test.nodeid || test.id || "unknown",
      outcome: test.outcome || "unknown",
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
  const resultsTable = $(
    "#results-table, table.results, .results table",
  ).first();
  if (resultsTable.length === 0) {
    // Try generic table parsing
    $("table tbody tr").each((_, row) => {
      const $row = $(row);
      const cells = $row.find("td");

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
    resultsTable.find("tbody tr").each((_, row) => {
      const $row = $(row);
      const cells = $row.find("td");

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
    exitCode: tests.some((t) => t.outcome === "failed") ? 1 : 0,
    root: "",
    tests,
  };
}
