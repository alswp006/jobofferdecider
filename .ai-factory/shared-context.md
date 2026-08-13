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

export type Offer = { id: string; date: string; company: string; position: string; baseSalary: number; amountKrw?: number; scores: { growth: number; culture: number; stability: number }; createdAt: string };

export type Weight = { growth: number; culture: number; stability: number; salary: number };

export type RouteState = 'home' | 'offers' | 'offer-new' | 'offer-edit' | 'weights' | 'compare' | 'rank';

export type useOffersFn = () => { offers: Offer[]; addOffer: (o: Offer) => void; updateOffer: (id: string, o: Partial<Offer>) => void; deleteOffer: (id: string) => void };

export type useWeightsFn = () => { weights: Weight; setWeights: (w: Weight) => void };

export type useUnlockFn = () => { unlockedFeatures: string[]; unlock: (featureId: string) => void };

export type useAppMetaFn = () => { version: string; initialized: boolean };

export type useRewardGateFn = () => { isUnlocked: boolean; remainingAds: number; watchAd: () => Promise<void> };

export type loadOffersFn = () => Offer[];

export type saveOfferFn = (offer: Offer) => void;

export type deleteOfferFn = (id: string) => void;

export type calculateMonthlyIncomeFn = (offer: Offer) => number;

export type validateOfferFn = (offer: Partial<Offer>) => { valid: boolean; errors: string[] };

export type calculateTotalScoreFn = (offer: Offer, weights: Weight) => number;

export type normalizeScoreFn = (score: number, min?: number, max?: number) => number;

export type ScoreSelectorProps = { score: number; onScoreChange: (v: number) => void; label?: string; max?: number };

export type CompareDetailProps = { offer1: Offer; offer2: Offer; weights: Weight; baseline?: number };

export type generateCompareImageFn = (offer1: Offer, offer2: Offer, scores: { s1: number; s2: number }, weights: Weight) => Promise<Blob>;

export type SaveImageButtonProps = { data: { offer1: Offer; offer2: Offer; scores: { s1: number; s2: number } }; onSaved?: () => void };

export type AdSectionProps = { placement: 'top' | 'bottom' | 'modal'; onAdComplete?: () => void };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
/**
 * 엔티티 & RouteState 타입 정의
 * SPEC: Data Models, Screen Definitions, Navigation state contract
 */

// ============================================================================
// Data Models (SPEC: Data Models section)
// ============================================================================

export type OfferKind = "current" | "offer";

export interface Offer {
  id: string;
  kind: OfferKind;
  companyName: string;
  baseSalaryManwon: number;
  bonusManwon: number;
  welfarePointManwon: number;
  remoteDaysPerWeek: number;
  commuteMinutesOneWay: number;
  commuteCostPerDayWon: number;
  lunchCostPerDayWon: number;
  growthScore: number;
  cultureScore: number;
  stabilityScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface Weights {
  money: number;
  remote: number;
  commute: number;
  growth: number;
  culture: number;
  stability: number;
  updatedAt: number;
}
// Runtime placeholder for dynamic `import()` reflection in tests — type carries the real shape.
export const Weights = {} as Weights;

export interface AxisScore {
  axis: "money" | "remote" | "commute" | "growth" | "culture" | "stability";
  label: string;
  rawCurrent: number;
  rawTarget: number;
  normCurrent: number;
  normTarget: number;
  weight: number;
  weightedCurrent: number;
  weightedTarget: number;
}
export const AxisScore = {} as AxisScore;

export interface MoneyBreakdown {
  currentMonthlyNetWon: number;
  targetMonthlyNetWon: number;
  diffMonthlyWon: number;
  diffYearlyWon: number;
  currentTaxWon: number;
  targetTaxWon: number;
}
export const MoneyBreakdown = {} as MoneyBreakdown;

export type Verdict = "strong_move" | "lean_move" | "neutral" | "lean_stay" | "strong_stay";

export interface ScoreResult {
  currentOfferId: string;
  targetOfferId: string;
  axes: AxisScore[];
  totalCurrent: number;
  totalTarget: number;
  gap: number;
  money: MoneyBreakdown;
  verdict: Verdict;
  negotiationPoints: string[];
  computedAt: number;
}
export const ScoreResult = {} as ScoreResult;

export interface UnlockState {
  unlockedComparisonKeys: string[];
  updatedAt: number;
}
export const UnlockState = {} as UnlockState;

export interface AppMeta {
  schemaVersion: 1;
  calcNoticeAcknowledged: boolean;
  onboardedAt: number | null;
}
export const AppMeta = {} as AppMeta;

export type SaveResult = { ok: true } | { ok: false; error: string };

// ============================================================================
// Axis Definitions & Constants
// ============================================================================

export const AXIS_ORDER = ["money", "remote", "commute", "growth", "culture", "stability"] as const;

export type Axis = (typeof AXIS_ORDER)[number];

export const AXIS_LABELS: Record<Axis, string> = {
  money: "실수령",
  remote: "재택",
  commute: "통근",
  growth: "성장성",
  culture: "조직문화",
  stability: "안정성",
};

// ============================================================================
// Verdict Label
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    SaveImageButton.tsx
    ScoreSelector.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    __DebugComp.tsx
  hooks/
    useOffers.ts
    useWeights.ts
  lib/
    calc.ts
    contract.ts
    negotiation.ts
    score.ts
    shareImage.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Compare.tsx
    Home.tsx
    OfferForm.tsx
    Offers.tsx
    Rank.tsx
    Weights.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export function getEffectiveTaxRate(annualGross: number): number; export function calcMonthlyNet(input:; export function validateOffer(offer: Offer): Array<
- contract.ts: export type Offer =; export type Weight =; export type RouteState = 'home' | 'offers' | 'offer-new' | 'offer-edit' | 'weights' | 'compare' | 'rank'; export type useOffersFn = () =>; export type useWeightsFn = () =>; export type useUnlockFn = () =>; export type useAppMetaFn = () =>; export type useRewardGateFn = () =>
- negotiation.ts: export function buildNegotiationPoints( disadvantagedAxes: AxisScore[], money: MoneyBreakdown, targetAnnualGrossWon: num
- score.ts: export function buildScoreResult(current: Offer, target: Offer, weights: Weights): ScoreResult
- shareImage.ts: export async function saveResultImage( result: ScoreResult, companyNames: CompanyNames, ): Promise<boolean>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function newOfferId(): string; export function loadOffers(): Offer[]; export function saveOffer(offer: Offer): SaveResult; export function deleteOffer(id: string): void; export function getOfferById(id: string): Offer | undefined
- types.ts: export type OfferKind = "current" | "offer"; export interface Offer; export interface Weights; export const Weights =; export interface AxisScore; export const AxisScore =; export interface MoneyBreakdown; export const MoneyBreakdown =
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- SaveImageButton.tsx: SaveImageButton
- ScoreSelector.tsx: ScoreSelector
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- __DebugComp.tsx: DebugComp

### Module Dependencies (import graph)
  lib/calc.ts → imports: lib/types
  lib/negotiation.ts → imports: lib/types, lib/calc
  lib/score.ts → imports: lib/types, lib/types, lib/calc, lib/negotiation
  lib/shareImage.ts → imports: lib/types, lib/types
  lib/storage.ts → imports: lib/types, lib/types
  pages/Compare.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Amount, components/Card, components/StateView, components/TossRewardAd, components/AdSlot, lib/storage, lib/score, lib/types
  pages/Home.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Amount, components/StateView, components/AdSlot, lib/storage, lib/calc, lib/utils, lib/types
  pages/OfferForm.tsx → imports: components/ScreenScaffold, components/BottomCTA, hooks/useOffers, lib/calc, lib/types
  pages/Offers.tsx → imports: components/ScreenScaffold, components/Card, components/StateView, lib/storage, lib/types
  pages/Rank.tsx → imports: components/ScreenScaffold, components/StateView, components/AdSlot, lib/storage, lib/score, lib/types, lib/utils
  pages/Weights.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/StateView, hooks/useWeights, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0003: 입력 검증 + 월 실수령 계산 (files: src/lib/calc.ts)
- 0004: 정규화·총점·판정·협상 포인트 (files: src/lib/score.ts, src/lib/negotiation.ts)
- 0009: 점수 선택 컴포넌트 (성장성·조직문화·안정성) (files: src/components/ScoreSelector.tsx)
- 0013: 결과 이미지 저장 유틸 + 저장 버튼 (files: src/lib/shareImage.ts, src/components/SaveImageButton.tsx)
- 0006: 홈 화면 (`/`) (files: src/pages/Home.tsx)
- 0007: 오퍼 목록 화면 (`/offers`) (files: src/pages/Offers.tsx)
- 0008: 직장·오퍼 입력 폼 화면 (`/offer/new`, `/offer/:id/edit`) (files: src/pages/OfferForm.tsx)
- 0010: 가중치 설정 화면 (`/weights`) (files: src/pages/Weights.tsx)
- 0014: 순위 비교 화면 (`/rank`) (files: src/pages/Rank.tsx)