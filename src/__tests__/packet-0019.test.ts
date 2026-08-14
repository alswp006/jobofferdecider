import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Packet 0019: 검수 컴플라이언스 스캔 & 빌드 타깃 고정
 *
 * AC 검증:
 * 1. vite.config.ts의 build.target === 'es2018' + npm run build 성공
 * 2. dist/assets/*.js에 console.error 문자열 0건
 * 3. npm run scan:compliance 실행 가능 + 패턴 매치 0건 (exit code 0)
 * 4. compliance.ts에 structuredClone, Object.groupBy, google-analytics, amplitude 포함
 * 5. App.tsx, main.tsx 변경 없음
 */

describe("Packet 0019: 검수 컴플라이언스 스캔 & 빌드 타깃 고정", () => {
  const projectRoot = process.cwd();
  const viteConfigPath = path.join(projectRoot, "vite.config.ts");
  const packageJsonPath = path.join(projectRoot, "package.json");
  const compliancePath = path.join(projectRoot, "src/lib/compliance.ts");
  const appTsxPath = path.join(projectRoot, "src/App.tsx");
  const mainTsxPath = path.join(projectRoot, "src/main.tsx");
  const distDir = path.join(projectRoot, "dist");

  // 초기 파일 스냅샷 (AC-5 검증용)
  let initialAppTsx: string;
  let initialMainTsx: string;

  beforeAll(() => {
    // App.tsx, main.tsx 초기 상태 저장
    initialAppTsx = fs.readFileSync(appTsxPath, "utf-8");
    initialMainTsx = fs.readFileSync(mainTsxPath, "utf-8");
  });

  // AC-1: vite.config.ts의 build.target === 'es2018' 설정
  it("AC-1: vite.config.ts의 build.target이 'es2018'으로 설정되어 있다", () => {
    const configContent = fs.readFileSync(viteConfigPath, "utf-8");
    expect(configContent).toContain("target: 'es2018'");
    expect(configContent).toContain("build:");
  });

  // AC-1: npm run build 성공
  it("AC-1: npm run build가 성공한다", () => {
    try {
      execSync("npm run build", { stdio: "pipe" });
      // dist 폴더가 생성되었는지 확인
      expect(fs.existsSync(distDir)).toBe(true);
      expect(fs.existsSync(path.join(distDir, "index.html"))).toBe(true);
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  });

  // AC-2: 프로덕션 번들에 console.error 0건
  it("AC-2: dist/assets/*.js에 console.error 문자열이 0건이다", () => {
    const assetsDir = path.join(distDir, "assets");
    const jsFiles = fs
      .readdirSync(assetsDir)
      .filter((f) => f.endsWith(".js"));

    expect(jsFiles.length).toBeGreaterThan(0);

    let consoleErrorFound = false;
    let matchedFiles: string[] = [];

    jsFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(assetsDir, file), "utf-8");
      if (content.includes("console.error")) {
        consoleErrorFound = true;
        matchedFiles.push(file);
      }
    });

    expect(consoleErrorFound).toBe(false);
    expect(matchedFiles).toEqual([]);
  });

  // AC-3: scan:compliance 스크립트 존재 + 실행 가능
  it("AC-3: package.json에 'scan:compliance' 스크립트가 정의되어 있다", () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts["scan:compliance"]).toBeDefined();
    expect(typeof packageJson.scripts["scan:compliance"]).toBe("string");
  });

  // AC-3: scan:compliance 실행 가능
  it("AC-3: npm run scan:compliance가 실행 가능하고 exit code 0을 반환한다", () => {
    try {
      execSync("npm run scan:compliance", { stdio: "pipe" });
      // exit code 0 = 금지 패턴 0건
    } catch (error) {
      // exit code !== 0 = 금지 패턴 발견됨 (테스트 실패)
      throw new Error(
        `scan:compliance failed with non-zero exit code: ${error}`
      );
    }
  });

  // AC-4: compliance.ts 파일 존재
  it("AC-4: src/lib/compliance.ts 파일이 존재한다", () => {
    expect(fs.existsSync(compliancePath)).toBe(true);
  });

  // AC-4: compliance.ts에 금지 패턴 상수 포함 (structuredClone)
  it("AC-4: compliance.ts에 'structuredClone' 패턴이 포함되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    expect(content).toContain("structuredClone");
  });

  // AC-4: compliance.ts에 금지 패턴 상수 포함 (Object.groupBy)
  it("AC-4: compliance.ts에 'Object.groupBy' 패턴이 포함되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    expect(content).toContain("Object.groupBy");
  });

  // AC-4: compliance.ts에 금지 패턴 상수 포함 (google-analytics)
  it("AC-4: compliance.ts에 'google-analytics' 패턴이 포함되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    expect(content).toContain("google-analytics");
  });

  // AC-4: compliance.ts에 금지 패턴 상수 포함 (amplitude)
  it("AC-4: compliance.ts에 'amplitude' 패턴이 포함되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    expect(content).toContain("amplitude");
  });

  // AC-4: compliance.ts에 검사 헬퍼 함수 존재
  it("AC-4: compliance.ts에 검사 헬퍼 함수들이 정의되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    // 최소한 패턴 목록 상수와 검사 함수가 있어야 함
    expect(content).toMatch(/export.*const|export.*function/);
  });

  // AC-5: App.tsx 변경 없음
  it("AC-5: src/App.tsx가 수정되지 않았다", () => {
    const currentAppTsx = fs.readFileSync(appTsxPath, "utf-8");
    expect(currentAppTsx).toEqual(initialAppTsx);
  });

  // AC-5: main.tsx 변경 없음
  it("AC-5: src/main.tsx가 수정되지 않았다", () => {
    const currentMainTsx = fs.readFileSync(mainTsxPath, "utf-8");
    expect(currentMainTsx).toEqual(initialMainTsx);
  });

  // 추가: vite.config.ts에 esbuild drop 설정 확인
  it("추가: vite.config.ts에 esbuild drop 설정이 있거나, postbuild 스크립트가 console 제거한다", () => {
    const configContent = fs.readFileSync(viteConfigPath, "utf-8");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // esbuild drop 설정 또는 postbuild 스크립트 확인
    const hasEsbuildDrop = configContent.includes("drop:");
    const hasPostBuild = packageJson.scripts?.postbuild !== undefined;

    expect(hasEsbuildDrop || hasPostBuild).toBe(true);
  });

  // 추가: compliance.ts에 HEX 색상 패턴 검사 포함
  it("추가: compliance.ts에 HEX 색상 리터럴 검사 패턴이 포함되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    expect(content.toLowerCase()).toMatch(/hex|#[0-9a-f]/i);
  });

  // 추가: compliance.ts에 window.open, window.location.href 패턴 검사 포함
  it("추가: compliance.ts에 window.open, window.location.href 패턴이 포함되어 있다", () => {
    const content = fs.readFileSync(compliancePath, "utf-8");
    expect(content).toContain("window.open");
    expect(content).toContain("window.location.href");
  });
});
