import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve as resolvePath } from "node:path";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

const ROOT = resolvePath(__dirname, "../..");
const SRC_DIR = resolvePath(__dirname, "..");

describe("빌드·라우트 무결성 게이트 복구", () => {
  // ========================================
  // AC-1: npx tsc --noEmit / npm run build exit code 0
  // ========================================
  describe("AC-1: 타입체크·빌드 게이트", () => {
    it("AC-1[P0]: npx tsc --noEmit exits with code 0 (no unresolved type errors)", () => {
      let exitCode = 0;
      let output = "";
      try {
        output = execSync("npx tsc --noEmit", { cwd: ROOT, encoding: "utf-8" });
      } catch (err: any) {
        exitCode = err.status ?? 1;
        output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
      }
      expect(exitCode).toBe(0);
      expect(output).not.toMatch(/error TS\d+/);
    }, 60_000);

    it("AC-1[P0]: npm run build exits with code 0 and emits dist/index.html", () => {
      let exitCode = 0;
      try {
        execSync("npm run build", { cwd: ROOT, encoding: "utf-8" });
      } catch (err: any) {
        exitCode = err.status ?? 1;
      }
      expect(exitCode).toBe(0);
      expect(existsSync(join(ROOT, "dist", "index.html"))).toBe(true);
    }, 120_000);
  });

  // ========================================
  // AC-2: build.target === 'es2018' + dist bundle에 console.error 문자열 0건
  // ========================================
  describe("AC-2: vite.config.ts target 고정 + console.error 제거", () => {
    it("AC-2: vite.config.ts declares build.target as 'es2018'", () => {
      const configSrc = readFileSync(join(ROOT, "vite.config.ts"), "utf-8");
      expect(configSrc).toMatch(/target:\s*['"]es2018['"]/);
    });

    it("AC-2: dist/assets/*.js contains zero 'console.error' occurrences", () => {
      const assetsDir = join(ROOT, "dist", "assets");
      expect(existsSync(assetsDir)).toBe(true);

      const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
      expect(jsFiles.length).toBeGreaterThan(0);

      for (const file of jsFiles) {
        const content = readFileSync(join(assetsDir, file), "utf-8");
        const matches = content.match(/console\.error/g) ?? [];
        expect(matches.length).toBe(0);
      }
    });
  });

  // ========================================
  // AC-4: src 전체에서 미해결 모듈 import(Cannot find module) 0건
  // ========================================
  describe("AC-4: 미해결 모듈 import 0건", () => {
    function collectSourceFiles(dir: string): string[] {
      const entries = readdirSync(dir, { withFileTypes: true });
      let files: string[] = [];
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(collectSourceFiles(full));
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
          files.push(full);
        }
      }
      return files;
    }

    function extractImportPaths(fileContent: string): string[] {
      const paths: string[] = [];
      const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(fileContent)) !== null) {
        paths.push(match[1]);
      }
      return paths;
    }

    function resolveModulePath(fromFile: string, importPath: string): string | null {
      let base: string;
      if (importPath.startsWith("@/")) {
        base = join(SRC_DIR, importPath.slice(2));
      } else if (importPath.startsWith(".")) {
        base = join(dirname(fromFile), importPath);
      } else {
        return null; // node_modules 패키지 — 별도 검증 대상 아님
      }

      const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        join(base, "index.ts"),
        join(base, "index.tsx"),
      ];
      return candidates.some((c) => existsSync(c)) ? base : "__UNRESOLVED__";
    }

    it("AC-4[P0]: every local (@/ and relative) import in src/ resolves to an existing file", () => {
      const files = collectSourceFiles(SRC_DIR).filter((f) => !f.includes(`${join("__tests__")}`));
      const unresolved: { file: string; importPath: string }[] = [];

      for (const file of files) {
        const content = readFileSync(file, "utf-8");
        const importPaths = extractImportPaths(content);
        for (const importPath of importPaths) {
          if (!importPath.startsWith("@/") && !importPath.startsWith(".")) continue;
          const resolved = resolveModulePath(file, importPath);
          if (resolved === "__UNRESOLVED__") {
            unresolved.push({ file, importPath });
          }
        }
      }

      expect(unresolved).toEqual([]);
    });

    it("AC-4: App.tsx does not import from next/router or any Next.js module", () => {
      const appSrc = readFileSync(join(SRC_DIR, "App.tsx"), "utf-8");
      expect(appSrc).not.toMatch(/from\s+['"]next\//);
      expect(appSrc).toMatch(/from\s+['"]react-router-dom['"]/);
    });
  });

  // ========================================
  // AC-3: dev 환경에서 각 라우트 진입 시 콘솔 런타임 에러 0건 (jsdom 스모크)
  // ========================================
  describe("AC-3: 라우트 스모크 — 런타임 에러 0건, 타임아웃 없이 마운트", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let App: typeof import("@/App").default;

    beforeEach(async () => {
      localStorage.clear();
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      App = (await import("@/App")).default;
    });

    afterEach(() => {
      cleanup();
      consoleErrorSpy.mockRestore();
      localStorage.clear();
    });

    const ROUTES = ["/", "/company/current", "/weights", "/result/does-not-exist", "/compare"];

    it.each(ROUTES)(
      "AC-3[P0]: route %s mounts without throwing or logging console.error",
      (route) => {
        expect(() => {
          render(
            React.createElement(
              MemoryRouter,
              { initialEntries: [route] },
              React.createElement(App),
            ),
          );
        }).not.toThrow();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      },
    );

    it("AC-3: unknown route redirects to home ('/') instead of white screen", () => {
      const { container } = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/this-route-does-not-exist"] },
          React.createElement(App),
        ),
      );

      expect(container.textContent).not.toBe("");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
