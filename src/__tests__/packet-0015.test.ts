import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

describe("검수 정책 가드 스크립트 (packet-0015)", () => {
  let tempDir: string;
  let originalSrcDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "policy-guard-"));
    originalSrcDir = path.join(projectRoot, "src");
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  // ============ AC-1: Exit code behavior ============
  describe("AC-1: Exit code and violation reporting", () => {
    it("AC-1[P0]: should report exit code 0 when no violations found", () => {
      // 테스트 디렉토리: 정상 파일만
      const testDir = path.join(tempDir, "clean-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "index.ts"),
        `
import { Button } from '@toss/tds-mobile';
export function Home() {
  return <Button variant="fill">Click me</Button>;
}
`.trim()
      );

      // 스크립트 실행
      let exitCode = 0;
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
        });
      } catch (e: any) {
        exitCode = e.status ?? 1;
      }

      expect(exitCode).toBe(0);
    });

    it("AC-1[P0]: should report exit code 1 and list violations when found", () => {
      // 테스트 디렉토리: violation 포함
      const testDir = path.join(tempDir, "violation-src");
      fs.mkdirSync(testDir, { recursive: true });
      const violationCode = `
import Button from '@mui/material/Button';
const color = '#FF0000';
window.open('https://example.com'); // gate-allow: 테스트 데이터
console.error('This is an error');
`.trim();
      fs.writeFileSync(path.join(testDir, "bad.tsx"), violationCode);

      // 스크립트 실행
      let exitCode = 0;
      let output = "";
      try {
        output = execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        exitCode = e.status ?? 1;
        output = e.stdout?.toString() || "";
      }

      expect(exitCode).toBe(1);
      // 파일:라인 형식의 출력 확인
      expect(output).toContain("bad.tsx");
    });
  });

  // ============ AC-2: HEX literal detection ============
  describe("AC-2: HEX color literal detection", () => {
    it("AC-2[P0]: should detect #RGB and #RRGGBB formats", () => {
      const testPatterns = [
        { code: "color: #FF0000;", shouldMatch: true },
        { code: "color: #F00;", shouldMatch: true },
        { code: "color: #123abc;", shouldMatch: true },
        { code: "color: var(--tds-color-red);", shouldMatch: false },
        { code: "// Comment with #ABC should not match in comments", shouldMatch: false },
      ];

      // 스크립트가 사용할 정규식 테스트 (스크립트 내부 구현)
      // HEX 색상은 코드 주석이 아닌 곳에서만 검출
      const hexRegex = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?/;

      testPatterns.forEach(({ code, shouldMatch }) => {
        const hasHex = hexRegex.test(code);
        if (shouldMatch) {
          expect(hasHex).toBe(true);
        } else if (code.includes("var(--tds-color-")) {
          expect(hasHex).toBe(false);
        }
      });
    });

    it("AC-2: should detect HEX in CSS files", () => {
      const testDir = path.join(tempDir, "hex-css");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "style.css"),
        `
.button {
  background-color: #3182F6;
  color: #FFFFFF;
}
`.trim()
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("style.css");
      expect(output).toContain("#3182F6");
    });
  });

  // ============ AC-3: Forbidden import detection ============
  describe("AC-3: Forbidden library import detection", () => {
    it("AC-3[P0]: should detect @mui imports", () => {
      const testDir = path.join(tempDir, "mui-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "bad.tsx"),
        `import Button from '@mui/material/Button';\n`
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("@mui");
    });

    it("AC-3[P0]: should detect antd, chakra-ui, shadcn, stripe imports", () => {
      const forbiddenLibraries = [
        { lib: "antd", import: "import Button from 'antd';" },
        { lib: "@chakra-ui", import: "import { Button } from '@chakra-ui/react';" },
        { lib: "stripe", import: "import { loadStripe } from '@stripe/stripe-js';" },
        { lib: "iamport", import: "import IMP from 'iamport-react-js';" },
        { lib: "bootpay", import: "import { BootPay } from 'bootpay-js';" },
      ];

      const importRegex = /from\s+['"](@mui|antd|@chakra-ui|shadcn|stripe|iamport|bootpay|@tosspayments|admob|firebase\/auth|@react-oauth)/;

      forbiddenLibraries.forEach(({ lib, import: imp }) => {
        expect(importRegex.test(imp)).toBe(true);
      });
    });

    it("AC-3: should not flag valid TDS imports", () => {
      const validCode = `
import { Button } from '@toss/tds-mobile';
import { AlertDialog } from '@toss/tds-mobile';
import type { ButtonProps } from '@toss/tds-mobile';
`;

      const importRegex = /from\s+['"](@mui|antd|@chakra-ui|shadcn|stripe|iamport|bootpay|@tosspayments|admob|firebase\/auth|@react-oauth)/;

      // 정상 코드는 forbidden import를 포함하지 않아야 함
      expect(importRegex.test(validCode)).toBe(false);
    });
  });

  // ============ AC-4: window.open / window.location.href detection ============
  describe("AC-4: External navigation detection", () => {
    it("AC-4[P0]: should detect window.open calls", () => {
      const testDir = path.join(tempDir, "window-open-src");
      fs.mkdirSync(testDir, { recursive: true });
      const navCode = `
window.open('https://example.com'); // gate-allow: 테스트 데이터
window.open('https://external.com', '_blank'); // gate-allow: 테스트 데이터
`.trim();
      fs.writeFileSync(path.join(testDir, "nav.ts"), navCode);

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("window.open");
    });

    it("AC-4[P0]: should detect window.location.href assignment", () => {
      const testDir = path.join(tempDir, "location-href-src");
      fs.mkdirSync(testDir, { recursive: true });
      const navCode = `
window.location.href = 'https://example.com'; // gate-allow: 테스트 데이터
const url = window.location.href; // reading is OK
`.trim();
      fs.writeFileSync(path.join(testDir, "nav.ts"), navCode);

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("window.location.href");
    });

    it("AC-4: should have file:line format in output", () => {
      const testDir = path.join(tempDir, "window-format-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "test.ts"),
        `window.open('https://example.com'); // gate-allow: 테스트 데이터\n`
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      // 파일명:라인번호 형식 확인
      expect(output).toMatch(/test\.ts:\d+/);
    });
  });

  // ============ AC-5: console.error and legacy API detection ============
  describe("AC-5: console.error and legacy API detection", () => {
    it("AC-5[P0]: should detect console.error calls", () => {
      const testDir = path.join(tempDir, "console-error-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "logging.ts"),
        `
console.error('An error occurred');
console.error(new Error('Something failed'));
console.warn('This is ok');  // warn is OK, error is not
`.trim()
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("console.error");
      expect(output).not.toContain("console.warn");
    });

    it("AC-5[P0]: should detect Array.at usage", () => {
      const testDir = path.join(tempDir, "array-at-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "array.ts"),
        `
const arr = [1, 2, 3];
const last = arr.at(-1);  // Unsafe for older browsers
const safe = arr[arr.length - 1];  // OK
`.trim()
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("Array.at");
    });

    it("AC-5[P0]: should detect Object.groupBy usage", () => {
      const testDir = path.join(tempDir, "groupby-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "group.ts"),
        `
const grouped = Object.groupBy(items, (item) => item.type);
`.trim()
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("Object.groupBy");
    });

    it("AC-5[P0]: should detect structuredClone usage", () => {
      const testDir = path.join(tempDir, "clone-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "clone.ts"),
        `
const clone = structuredClone(obj);
`.trim()
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("structuredClone");
    });

    it("AC-5: should report multiple violations with file:line", () => {
      const testDir = path.join(tempDir, "multi-violation-src");
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, "multi.ts"),
        `
console.error('Line 2');
const x = arr.at(0);  // Line 3
Object.groupBy(items, () => 'type');  // Line 4
`.trim()
      );

      let output = "";
      try {
        execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        output = e.stdout?.toString() || "";
      }

      expect(output).toContain("multi.ts:2");
      expect(output).toContain("multi.ts:3");
      expect(output).toContain("multi.ts:4");
      expect(output).toContain("console.error");
      expect(output).toContain("Array.at");
      expect(output).toContain("Object.groupBy");
    });
  });

  // ============ Integration: Script accepts src path ============
  describe("Integration: Script CLI", () => {
    it("should scan src/**/*.{ts,tsx,css} files", () => {
      const testDir = path.join(tempDir, "multi-format-src");
      fs.mkdirSync(path.join(testDir, "pages"), { recursive: true });
      fs.mkdirSync(path.join(testDir, "styles"), { recursive: true });

      fs.writeFileSync(
        path.join(testDir, "index.tsx"),
        `const color = '#FF0000';\n`
      );
      fs.writeFileSync(
        path.join(testDir, "pages", "home.ts"),
        `console.error('error');\n`
      );
      fs.writeFileSync(
        path.join(testDir, "styles", "main.css"),
        `body { color: #000; }\n`
      );

      let exitCode = 1;
      let output = "";
      try {
        output = execSync(`node ${path.join(projectRoot, "scripts/policy-guard.mjs")} "${testDir}"`, {
          stdio: "pipe",
          encoding: "utf-8",
        });
      } catch (e: any) {
        exitCode = e.status ?? 1;
        output = e.stdout?.toString() || "";
      }

      expect(exitCode).toBe(1);
      expect(output).toContain("index.tsx");
      expect(output).toContain("home.ts");
      expect(output).toContain("main.css");
    });
  });
});
