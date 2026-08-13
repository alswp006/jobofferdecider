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
// Verdict Labels (SPEC: 판정 (verdict) section)
// ============================================================================

export const VERDICT_LABELS: Record<Verdict, string> = {
  strong_move: "이직 강력 추천",
  lean_move: "이직 우세",
  neutral: "박빙 — 추가 협상 필요",
  lean_stay: "잔류 우세",
  strong_stay: "잔류 강력 추천",
};

// ============================================================================
// Default Weights (SPEC: Weights section)
// ============================================================================

export const DEFAULT_WEIGHTS: Weights = {
  money: 5,
  remote: 5,
  commute: 5,
  growth: 5,
  culture: 5,
  stability: 5,
  updatedAt: 0,
};

// ============================================================================
// Storage Keys (SPEC: localStorage 키 & 크기 추정 section)
// ============================================================================

export const STORAGE_KEYS = {
  OFFERS: "jod.offers.v1",
  WEIGHTS: "jod.weights.v1",
  UNLOCK: "jod.unlock.v1",
  META: "jod.meta.v1",
} as const;

// ============================================================================
// Navigation State Contract (SPEC: Screen Definitions → 라우트 요약)
// ============================================================================

export type RouteState = {
  "/": undefined;
  "/offer/new": { kind: OfferKind };
  "/offer/:id/edit": undefined;
  "/weights": undefined;
  "/compare": { targetOfferId: string };
  "/rank": undefined;
};
export const RouteState = {} as RouteState;

export type RoutePath = keyof RouteState;
