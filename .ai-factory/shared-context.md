# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type RouteState = 'home' | 'company' | 'weights' | 'result' | 'compare';

export type Company = { id: string; name: string; industry: string; size: number; revenue: number };

export type Offer = { id: string; salary: number; bonus: number; benefits: string[]; year: number };

export type Weights = { salary: number; bonus: number; benefits: number; growth: number; culture: number };

export type Score = { total: number; salary: number; bonus: number; benefits: number; growth: number; culture: number };

export type calcMoneyFn = (amount: number, opts?: { currency?: string; rate?: number }) => string;

export type calcScoreFn = (company: Company, offer: Offer, weights: Weights) => Score;

export type getVerdictFn = (score: Score, threshold?: number) => { passed: boolean; message: string };

export type useAppStateFn = () => { route: RouteState; company: Company | null; weights: Weights; offers: Offer[]; setRoute: (r: RouteState) => void };

export type validateFormFn = (data: unknown, schema: string) => { valid: boolean; errors: Record<string, string> };

export type parseNumberInputFn = (value: string, opts?: { decimal?: number; min?: number; max?: number }) => number | null;

export type saveAppDataFn = (key: string, data: unknown) => void;

export type loadAppDataFn = <T = unknown>(key: string, defaultValue?: T) => T | null;

/** key 생략 시 전체 삭제 (구현: 패킷 0003) */
export type clearAppDataFn = (key?: string) => void;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
/** 원(KRW) 단위 정수. 소수점 없음 */
export type Won = number;

/** 현재 직장 / 제안 직장의 공통 입력 모델 */
export interface CompanyProfile {
  /** UUID v4 문자열. 현재 직장은 고정값 "current" */
  id: string;
  /** 회사명. 1~20자 */
  name: string;
  /** 연봉(세전, 상여 제외). 0 ~ 500_000_000 */
  baseSalary: Won;
  /** 연간 상여/인센티브(세전). 0 ~ 500_000_000 */
  bonusPerYear: Won;
  /** 주당 재택근무 일수. 0 ~ 5 정수 */
  remoteDaysPerWeek: number;
  /** 편도 통근 시간(분). 0 ~ 180 정수 */
  commuteMinutesOneWay: number;
  /** 1일 왕복 교통비. 0 ~ 100_000 */
  commuteCostPerDay: Won;
  /** 1일 점심 식대 지출. 0 ~ 50_000 */
  lunchCostPerDay: Won;
  /** 회사 월 식대 지원금. 0 ~ 1_000_000 */
  mealSupportPerMonth: Won;
  /** 연간 복지포인트. 0 ~ 20_000_000 */
  welfarePointsPerYear: Won;
  /** 비금전 자기평가 1~5 정수 */
  ratings: NonMonetaryRatings;
  /** ISO8601. 생성/수정 시각 */
  updatedAt: string;
}

/** 비금전 항목 자기평가 (1~5 리터럴) */
export interface NonMonetaryRatings {
  growth: 1 | 2 | 3 | 4 | 5;      // 성장성
  workLife: 1 | 2 | 3 | 4 | 5;    // 워라밸
  stability: 1 | 2 | 3 | 4 | 5;   // 안정성
  culture: 1 | 2 | 3 | 4 | 5;     // 조직문화
  commuteEase: 1 | 2 | 3 | 4 | 5; // 통근 편의
}

/** 6개 카테고리 중요도 가중치 */
export interface Weights {
  /** 0 ~ 100 정수. 합이 0이면 전부 50으로 리셋 */
  money: number;
  growth: number;
  workLife: number;
  stability: number;
  culture: number;
  commuteEase: number;
}

/** 기본 가중치 (전부 50) */
export const DEFAULT_WEIGHTS: Weights = {
  money: 50,
  growth: 50,
  workLife: 50,
  stability: 50,
  culture: 50,
  commuteEase: 50,
};

/** 월 실질가치 산출 결과 (계산 산출물, localStorage 저장 안 함) */
export interface MoneyBreakdown {
  /** 월 출근일수 = (5 - remoteDaysPerWeek) * 4 */
  officeDaysPerMonth: number;
  /** 세전 연 총액 = baseSalary + bonusPerYear */
  grossAnnual: Won;
  /** 실효세율(0~1). TAX_TABLE 참조 */
  effectiveTaxRate: number;
  /** 월 세후 급여 = round(grossAnnual * (1 - rate) / 12) */
  netMonthlySalary: Won;
  /** 월 복지 = round(welfarePointsPerYear / 12) + mealSupportPerMonth */
  monthlyBenefit: Won;
  /** 월 통근 교통비 = commuteCostPerDay * officeDaysPerMonth */
  monthlyCommuteCost: Won;
  /** 월 점심값 = lunchCostPerDay * officeDaysPerMonth */
  monthlyLunchCost: Won;
  /** 월 통근시간 기회비용 = round(commuteMinutesOneWay*2*officeDaysPerMonth/60 * 15000) */
  monthlyCommuteTimeCost: Won;
  /** 최종 월 실질가치 */
  netMonthlyValue: Won;
}

/** 판정 레벨 */
export type VerdictLevel = "MOVE" | "CONDITIONAL" | "HOLD" | "STAY";

/** 개별 카테고리별 점수 항목 */
export interface ScoreItem {
  key: "money" | "growth" | "workLife" | "stability" | "culture" | "commuteEase";
  label: string;          // "연봉 실질가치" 등
  currentScore: number;   // 0~100 정수
  offerScore: number;     // 0~100 정수
  weightRatio: number;    // 0~1, 소수 4자리
}

/** 종합 점수 및 판정 결과 (계산 산출물, localStorage 저장 안 함) */
export interface ScoreResult {
  offerId: string;
  items: ScoreItem[];
  currentTotal: number;   // 0~100 정수
  offerTotal: number;     // 0~100 정수
  diff: number;           // offerTotal - currentTotal
  verdict: VerdictLevel;
  verdictLabel: string;   // "이직 추천" 등
  /** 정확히 3개 */
  negotiationPoints: string[];
  currentMoney:
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    AppErrorBoundary.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    OnboardingDialog.tsx
    PageShell.tsx
    ResultAnalysis.tsx
    SaveResultImage.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    WeightSlider.css
    WeightSlider.tsx
  hooks/
    useAppState.ts
  lib/
    calc.ts
    compliance.ts
    constants.ts
    contract.ts
    form.ts
    score.ts
    storage.ts
    types.ts
    utils.ts
    verdict.ts
  main.tsx
  pages/
    CompanyForm.tsx
    Compare.tsx
    Home.tsx
    Result.tsx
    Weights.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export function getTaxRate(grossAnnual: number): number; export function calcMoney(profile: CompanyProfile): MoneyBreakdown
- compliance.ts: export interface CompliancePattern; export interface ComplianceViolation; export const SCAN_EXCLUDE_PATHS = ['src/lib/compliance.ts', 'src/__tests__/'] as const; export const FORBIDDEN_PATTERNS: CompliancePattern[] = [; export function isScannableFile(relPath: string): boolean; export function scanSource(content: string, relPath: string): ComplianceViolation[]; export function formatViolation(violation: ComplianceViolation): string
- constants.ts: export const TAX_TABLE = [; export const TIME_VALUE_PER_HOUR = 15_000; export const MAX_OFFERS = 3; export const STORAGE_KEY = "jod:state:v1"; export const ONBOARDED_KEY = "jod:onboarded:v1"; export const INITIAL_STATE: AppState =; export const SCORE_LABELS: Record< "money" | "growth" | "workLife" | "stability" | "culture" | "commuteEase", string > =; export const VERDICT_LABELS: Record<VerdictLevel, string> =
- contract.ts: export type RouteState = 'home' | 'company' | 'weights' | 'result' | 'compare'; export type Company =; export type Offer =; export type Weights =; export type Score =; export type calcMoneyFn = (amount: number, opts?:; export type calcScoreFn = (company: Company, offer: Offer, weights: Weights) => Score; export type getVerdictFn = (score: Score, threshold?: number) =>
- form.ts: export function parseWon(input: string): number; export function formatWon(v: number): string; export function clampRange(v: number, min: number, max: number): number; export function validateProfile(draft: ProfileDraft): Record<string, string>; export function emptyDraft(): ProfileDraft
- score.ts: export function normalizeWeights(weights: Weights): Record<keyof Weights, number>; export function calcScore( current: CompanyProfile | null, offer: CompanyProfile, weights: Weights, ): ScoreResult | nul
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function isValidAppState(raw: unknown): raw is AppState; export function migrate(raw: unknown): AppState; export function loadState(): AppState; export function saveState(state: AppState): boolean; export function isOnboarded(): boolean
- types.ts: export type Won = number; export interface CompanyProfile; export interface NonMonetaryRatings; export interface Weights; export const DEFAULT_WEIGHTS: Weights =; export interface MoneyBreakdown; export type VerdictLevel = "MOVE" | "CONDITIONAL" | "HOLD" | "STAY"; export interface ScoreItem
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string
- verdict.ts: export function getVerdictLevel(diff: number): VerdictLevel; export function buildNegotiationPoints(items: ScoreItem[]): string[]; export function getVerdict(result: ScoreResult): ScoreResult

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- OnboardingDialog.tsx: OnboardingDialog
- PageShell.tsx: PageShell
- ResultAnalysis.tsx: ResultAnalysis
- SaveResultImage.tsx: SaveResultImage
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- WeightSlider.tsx: WeightSlider

### Module Dependencies (import graph)
  lib/calc.ts → imports: lib/types, lib/constants
  lib/constants.ts → imports: lib/types, lib/types
  lib/form.ts → imports: lib/types
  lib/score.ts → imports: lib/types, lib/types, lib/constants, lib/calc
  lib/storage.ts → imports: lib/constants, lib/types
  lib/verdict.ts → imports: lib/types, lib/constants
  pages/CompanyForm.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/constants, lib/form, lib/stora...
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0004: 금전 실질가치 계산 (calcMoney) (files: src/lib/calc.ts)
- 0006: 판정 & 협상 포인트 (getVerdict) (files: src/lib/verdict.ts)
- 0007: 앱 상태 훅 (useAppState) (files: src/hooks/useAppState.ts)
- 0008: 폼 유효성 검증 + 숫자 입력 유틸 (files: src/lib/form.ts)
- 0009: WeightSlider 컴포넌트 (files: src/components/WeightSlider.tsx, src/components/WeightSlider.css)
- 0013: 결과 화면 — 공개 영역 & SummaryHero (S4 전반부) (files: src/pages/Result.tsx)
- 0014: 결과 화면 — 리워드 게이트 & 분석표 (S4 후반부) (files: src/components/ResultAnalysis.tsx, src/pages/Result.tsx)
- 0015: 오퍼 비교 페이지 (S5) (files: src/pages/Compare.tsx)
- 0016: 결과 이미지 저장 (F7) (files: src/components/SaveResultImage.tsx)
- 0017: 온보딩 안내 + ErrorBoundary (files: src/components/OnboardingDialog.tsx, src/components/AppErrorBoundary.tsx)
- 0018: 라우터 배선 + FloatingTabBar + 전역 Provider (files: src/App.tsx)
- heal-1-02: 기반 lib 복구 — score.ts (normalizeWeights/calcScore) (files: src/lib/score.ts)