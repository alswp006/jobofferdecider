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

import type { ReactNode } from "react";

/** Core offer entity, used in 0004, 0005, 0006, 0013-0016 (구현: 패킷 0001) */
export type OfferInfo = { id: string; companyName: string; salary: number; bonus: number; benefits: string[]; negotiable: string[] };

/** Company details, used in 0005, 0007, 0010 (구현: 패킷 0001) */
export type CompanyInfo = { name: string; industry?: string; location?: string; size?: string };

/** Importance weights (0-100), used in 0005, 0006, 0007, 0011, 0013-0015 (구현: 패킷 0001) */
export type Weights = { salary: number; bonus: number; benefits: number; workLife: number };

/** Comparison verdict, used in 0006, 0013-0015 (구현: 패킷 0001) */
export type Verdict = { better: 'A' | 'B' | 'tie'; reason: string; negotiablePoints: string[] };

/** Current screen state, used in 0007, 0018 (구현: 패킷 0001) */
export type RouteState = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S5-compare';

/** Calculation output, used in 0013-0016 (구현: 패킷 0001) */
export type CalculationResult = { score: number; breakdown: { salary: number; bonus: number; benefits: number; workLife: number } };

/** Format amount as currency string, used in 0013-0016 (구현: 패킷 0004) */
export type calcMoneyFn = (amount: number, opts?: { locale?: string; decimals?: number }) => string;

/** Calculate composite score from offer and weights, used in 0013-0015 (구현: 패킷 0005) */
export type calcScoreFn = (offer: OfferInfo, weights: Weights) => CalculationResult;

/** Determine comparison winner and reasoning, used in 0015 (구현: 패킷 0006) */
export type getVerdictFn = (scoreA: CalculationResult, scoreB: CalculationResult, weights: Weights) => Verdict;

/** App state management hook, used in 0010-0015 (구현: 패킷 0007) */
export type useAppStateFn = () => { state: { route: RouteState; offerA?: OfferInfo; offerB?: OfferInfo; weights: Weights }; setRoute: (s: RouteState) => void; setOfferA: (o: OfferInfo) => void; setOfferB: (o: OfferInfo) => void; setWeights: (w: Weights) => void };

/** Validate company name input, used in 0010 (구현: 패킷 0008) */
export type validateCompanyNameFn = (name: string) => boolean;

/** Validate salary amount input, used in 0010 (구현: 패킷 0008) */
export type validateSalaryFn = (amount: string) => boolean;

/** Format user currency input, used in 0010 (구현: 패킷 0008) */
export type formatCurrencyInputFn = (input: string) => string;

/** Props for WeightSlider component, used in 0011 (구현: 패킷 0009) */
export type WeightSliderProps = { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string };

/** Props for SaveResultImage component, used in 0013 (구현: 패킷 0016) */
export type SaveResultImageProps = { result: CalculationResult; offer: OfferInfo; onSave?: (blob: Blob) => void };

/** Props for OnboardingDialog component, used in 0018 (구현: 패킷 0017) */
export type OnboardingDialogProps = {
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
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    compliance.ts
    constants.ts
    contract.ts
    storage.ts
    types.ts
    utils.ts
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
- compliance.ts: export interface CompliancePattern; export interface ComplianceViolation; export const SCAN_EXCLUDE_PATHS = ['src/lib/compliance.ts', 'src/__tests__/'] as const; export const FORBIDDEN_PATTERNS: CompliancePattern[] = [; export function isScannableFile(relPath: string): boolean; export function scanSource(content: string, relPath: string): ComplianceViolation[]; export function formatViolation(violation: ComplianceViolation): string
- constants.ts: export const TAX_TABLE = [; export const TIME_VALUE_PER_HOUR = 15_000; export const MAX_OFFERS = 3; export const STORAGE_KEY = "jod:state:v1"; export const ONBOARDED_KEY = "jod:onboarded:v1"; export const INITIAL_STATE: AppState =; export const SCORE_LABELS: Record< "money" | "growth" | "workLife" | "stability" | "culture" | "commuteEase", string > =; export const VERDICT_LABELS: Record<VerdictLevel, string> =
- contract.ts: export type OfferInfo =; export type CompanyInfo =; export type Weights =; export type Verdict =; export type RouteState = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S5-compare'; export type CalculationResult =; export type calcMoneyFn = (amount: number, opts?:; export type calcScoreFn = (offer: OfferInfo, weights: Weights) => CalculationResult
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type Won = number; export interface CompanyProfile; export interface NonMonetaryRatings; export interface Weights; export const DEFAULT_WEIGHTS: Weights =; export interface MoneyBreakdown; export type VerdictLevel = "MOVE" | "CONDITIONAL" | "HOLD" | "STAY"; export interface ScoreItem
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

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
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/constants.ts → imports: lib/types, lib/types
  pages/CompanyForm.tsx → imports: components/ScreenScaffold, components/StateView
  pages/Compare.tsx → imports: components/ScreenScaffold, components/StateView
  pages/Result.tsx → imports: components/ScreenScaffold, components/StateView
  pages/Weights.tsx → imports: components/ScreenScaffold, components/StateView
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0018: 라우터 배선 + FloatingTabBar + 전역 Provider (files: src/App.tsx)
- 0004: 금전 실질가치 계산 (calcMoney) (files: src/lib/calc.ts)