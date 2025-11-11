#!/usr/bin/env node
import { Command } from "commander";
import { z } from "zod";
import { configSchema } from "./config-schema.js";
import { findAndLoadConfigFile } from "./config.js";

const program = new Command();

program
  .name("gh-ci-artifacts-config-lint")
  .description("Validate gh-ci-artifacts configuration file using Zod schema")
  .version("0.1.0")
  .option(
    "-c, --config <path>",
    "Path to config file (defaults to searching for .gh-ci-artifacts.{json,yml,yaml})",
  )
  .option(
    "--cwd <directory>",
    "Working directory to search for config files (defaults to current directory)",
  )
  .option("--strict", "Treat warnings as errors")
  .option("--json", "Output results as JSON")
  .action(async (options) => {
    // Find and load config file
    let configPath: string;
    let configFormat: "json" | "yaml";
    let rawConfig: unknown;

    try {
      const configFile = findAndLoadConfigFile(
        options.config,
        options.cwd || process.cwd(),
      );
      configPath = configFile.path;
      configFormat = configFile.format;
      rawConfig = configFile.content;
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
      return; // TypeScript doesn't know process.exit never returns
    }

    // Validate with Zod schema
    const result = configSchema.safeParse(rawConfig);

    if (result.success) {
      if (options.json) {
        console.log(
          JSON.stringify({
            valid: true,
            path: configPath,
            format: configFormat,
          }),
        );
      } else {
        console.log(`✓ Configuration file is valid: ${configPath}`);
      }
      process.exit(0);
    } else {
      const errors = result.error.issues;
      const errorCount = errors.length;

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              valid: false,
              path: configPath,
              format: configFormat,
              errors: errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
                code: e.code,
              })),
            },
            null,
            2,
          ),
        );
      } else {
        console.error(`✗ Configuration file has ${errorCount} error(s): ${configPath}\n`);
        console.error("Validation errors:\n");

        for (const error of errors) {
          const path = error.path.length > 0
            ? error.path.join(".")
            : "root";
          console.error(`  ${path}: ${error.message}`);
        }
      }

      process.exit(options.strict ? 1 : 1); // Always exit with error code for now
    }
  });

program.parse();

