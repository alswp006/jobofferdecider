#!/usr/bin/env node

import fs from "fs";
import path from "path";

const srcDir = process.argv[2] || path.join(process.cwd(), "src");
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".css", ".js", ".mjs"]);
const IGNORED_DIRS = new Set(["node_modules", "dist", ".next", "__tests__"]);
const TEST_FILE_PATTERN = /\.test\.(ts|tsx|js|mjs)$/;

function collectFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results.push(...collectFiles(fullPath));
    } else if (
      entry.isFile() &&
      SCAN_EXTENSIONS.has(path.extname(entry.name)) &&
      !TEST_FILE_PATTERN.test(entry.name)
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

// Violation patterns
const patterns = [
  {
    name: "HEX color literal",
    regex: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?/g,
    exclude: (line) => line.includes("var(--tds-color-") || line.includes("--adaptive"),
    filePattern: /\.(ts|tsx|css|mjs)$/,
  },
  {
    name: "Forbidden import",
    regex: /from\s+['"](@mui|antd|@chakra-ui|shadcn|@stripe|stripe|iamport|bootpay|@tosspayments|admob|firebase\/auth|@react-oauth)/g,
    exclude: (line) => line.trim().startsWith("//"),
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
  {
    name: "window.open",
    regex: /window\.open\s*\(/g,
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
  {
    name: "window.location.href assignment",
    regex: /window\.location\.href\s*=/g,
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
  {
    name: "console.error",
    regex: /console\.error\s*\(/g,
    exclude: (line) => line.trim().startsWith("//"),
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
  {
    name: "Array.at",
    regex: /\.at\s*\(/g,
    exclude: (line) => line.trim().startsWith("//"),
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
  {
    name: "Object.groupBy",
    regex: /Object\.groupBy\s*\(/g,
    exclude: (line) => line.trim().startsWith("//"),
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
  {
    name: "structuredClone",
    regex: /structuredClone\s*\(/g,
    exclude: (line) => line.trim().startsWith("//"),
    filePattern: /\.(ts|tsx|js|mjs)$/,
  },
];

async function scan() {
  const violations = [];

  try {
    const files = collectFiles(srcDir);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const pattern of patterns) {
        if (!pattern.filePattern.test(file)) continue;

        lines.forEach((line, lineIdx) => {
          if (pattern.exclude && pattern.exclude(line)) return;

          const matches = line.matchAll(pattern.regex);
          for (const match of matches) {
            violations.push({
              file: path.relative(srcDir, file),
              line: lineIdx + 1,
              pattern: pattern.name,
              matchText: match[1] ?? match[0],
              content: line.trim(),
            });
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning ${srcDir}:`, error.message);
    process.exit(1);
  }

  return violations;
}

function formatViolations(violations) {
  const grouped = {};
  for (const v of violations) {
    const key = `${v.file}:${v.line}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(`${v.pattern} (${v.matchText})`);
  }

  return Object.entries(grouped)
    .map(([key, entries]) => `${key} — ${entries.join(", ")}`)
    .sort();
}

async function main() {
  const violations = await scan();

  if (violations.length === 0) {
    console.log("✓ No policy violations detected");
    process.exit(0);
  }

  const formatted = formatViolations(violations);
  console.log("🚫 Policy violations found:\n");
  formatted.forEach((line) => console.log(line));
  console.log(`\nTotal: ${violations.length} violation(s)`);
  process.exit(1);
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
