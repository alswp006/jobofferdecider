/**
 * 토스 검수 컴플라이언스 — 금지 패턴 단일 소스.
 *
 * `npm run scan:compliance`(scripts/scan-compliance.mjs)가 이 목록으로 src 전체를 훑는다.
 * 앱 코드에서 import 하지 않으므로 프로덕션 번들에는 들어가지 않는다.
 *
 * 금지 사유는 두 갈래다.
 *  - 정책: 외부 도메인 이탈, 외부 분석 SDK, HEX 하드코딩(다크모드) → 검수 반려
 *  - 호환: Android 7 WebView / iOS 16 하한선에서 죽는 최신 문법
 */

/** 금지 패턴 1건 */
export interface CompliancePattern {
  /** kebab-case 식별자 */
  id: string;
  /** 줄 단위로 test 하는 정규식. g 플래그 금지 — lastIndex가 줄 사이에 남는다 */
  regex: RegExp;
  /** 검사할 파일 확장자 */
  extensions: string[];
  /** 왜 막는지 + 무엇으로 대체할지 */
  message: string;
}

/** 검사 결과 1건 */
export interface ComplianceViolation {
  patternId: string;
  /** 레포 기준 상대경로 ('/' 구분자) */
  file: string;
  /** 1-based */
  line: number;
  text: string;
  message: string;
}

/**
 * 스캔 제외 경로. 두 곳은 금지 문자열을 "데이터로" 담고 있어 스스로를 매치시킨다.
 *  - 이 파일: 패턴 정의 자체
 *  - src/__tests__/: 패턴 존재를 검증하는 테스트
 */
export const SCAN_EXCLUDE_PATHS = ['src/lib/compliance.ts', 'src/__tests__/'] as const;

export const FORBIDDEN_PATTERNS: CompliancePattern[] = [
  {
    id: 'hardcoded-hex-color',
    // 3·6·8자리(실제 색상 길이)만 — '#root', '#1' 같은 앵커/식별자 오탐 방지
    regex: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/,
    extensions: ['.ts', '.tsx', '.css'],
    message:
      'HEX 색상 리터럴 — 다크모드에서 깨진다. TDS 컴포넌트나 var(--tds-color-*) / var(--adaptive*) 토큰을 써라.',
  },
  {
    id: 'external-nav-window-open',
    regex: /window\s*\.\s*open\s*\(/,
    extensions: ['.ts', '.tsx'],
    message: 'window.open — 외부 도메인 이탈은 검수 반려. 앱 내 라우팅이나 SDK openURL을 써라.',
  },
  {
    id: 'external-nav-location-href',
    regex: /location\s*\.\s*(?:href\s*=|assign\s*\(|replace\s*\()/,
    extensions: ['.ts', '.tsx'],
    message: 'window.location.href 이동 — 외부 이탈 금지. 라우터 navigate() 또는 SDK openURL을 써라.',
  },
  {
    id: 'unsupported-array-at',
    regex: /\.at\s*\(/,
    extensions: ['.ts', '.tsx'],
    message: 'Array.prototype.at — Android 7 WebView 미지원. arr[arr.length - 1] 형태로 바꿔라.',
  },
  {
    id: 'unsupported-structured-clone',
    regex: /\bstructuredClone\s*\(/,
    extensions: ['.ts', '.tsx'],
    message: 'structuredClone — Android 7 WebView 미지원. JSON 직렬화나 수동 복사로 대체해라.',
  },
  {
    id: 'unsupported-object-groupby',
    regex: /Object\s*\.\s*groupBy\s*\(/,
    extensions: ['.ts', '.tsx'],
    message: 'Object.groupBy — ES2024라 구형 WebView에서 죽는다. reduce로 직접 묶어라.',
  },
  {
    id: 'external-analytics-sdk',
    regex: /google-analytics|googletagmanager|\bgtag\s*\(|amplitude|mixpanel/i,
    extensions: ['.ts', '.tsx'],
    message:
      '외부 분석 SDK(google-analytics / amplitude 등) — 검수 반려. SDK Analytics.screen / Analytics.click만 허용.',
  },
];

/** 경로 구분자를 '/'로 통일 (Windows 대응) */
function toPosix(relPath: string): string {
  return relPath.split('\\').join('/');
}

/** 확장자와 제외 목록으로 스캔 대상 여부를 판정한다 */
export function isScannableFile(relPath: string): boolean {
  const normalized = toPosix(relPath);
  if (SCAN_EXCLUDE_PATHS.some((excluded) => normalized.startsWith(excluded))) return false;
  return FORBIDDEN_PATTERNS.some((pattern) =>
    pattern.extensions.some((ext) => normalized.endsWith(ext)),
  );
}

/** 파일 하나를 줄 단위로 검사한다 */
export function scanSource(content: string, relPath: string): ComplianceViolation[] {
  const normalized = toPosix(relPath);
  const lines = content.split('\n');
  const violations: ComplianceViolation[] = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (!pattern.extensions.some((ext) => normalized.endsWith(ext))) continue;
    lines.forEach((line, index) => {
      if (!pattern.regex.test(line)) return;
      violations.push({
        patternId: pattern.id,
        file: normalized,
        line: index + 1,
        text: line.trim().slice(0, 120),
        message: pattern.message,
      });
    });
  }

  return violations;
}

/** 리포트 한 줄 — `src/pages/Home.tsx:12 [id] 내용` */
export function formatViolation(violation: ComplianceViolation): string {
  return `${violation.file}:${violation.line} [${violation.patternId}] ${violation.text}`;
}
