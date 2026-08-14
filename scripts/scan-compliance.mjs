#!/usr/bin/env node
// scan-compliance.mjs — 검수 금지 패턴 스캔.
//
// Usage: node --experimental-strip-types scripts/scan-compliance.mjs [dir]
//   default dir = src
//
// 패턴 목록은 src/lib/compliance.ts 단일 소스. 의존성 0(순수 node ESM + 타입 스트리핑).
// Exit 0 = 위반 0건. Exit 1 = 위반 발견. Exit 2 = 대상 디렉터리 없음.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FORBIDDEN_PATTERNS,
  formatViolation,
  isScannableFile,
  scanSource,
} from '../src/lib/compliance.ts';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const targetDir = resolve(projectRoot, process.argv[2] ?? 'src');

if (!existsSync(targetDir)) {
  console.error(`✗ 스캔 대상 디렉터리가 없다: ${targetDir}`);
  process.exit(2);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const violations = [];
let scannedCount = 0;

for (const file of walk(targetDir)) {
  const relPath = relative(projectRoot, file);
  if (!isScannableFile(relPath)) continue;
  scannedCount++;
  violations.push(...scanSource(readFileSync(file, 'utf8'), relPath));
}

if (violations.length > 0) {
  console.error(`✗ 검수 금지 패턴 ${violations.length}건 (${scannedCount}개 파일 검사)\n`);
  const seenPatterns = new Set();
  for (const violation of violations) {
    console.error(`  ${formatViolation(violation)}`);
    if (!seenPatterns.has(violation.patternId)) {
      seenPatterns.add(violation.patternId);
      console.error(`    → ${violation.message}`);
    }
  }
  process.exit(1);
}

console.log(
  `✓ 검수 금지 패턴 0건 — ${scannedCount}개 파일, ${FORBIDDEN_PATTERNS.length}개 패턴 검사 완료`,
);
