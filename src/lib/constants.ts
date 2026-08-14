import type { AppState, VerdictLevel } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";

/** 세전 연 총액 구간별 실효세율 (소득세+지방세+4대보험 근사) */
export const TAX_TABLE = [
  { upTo: 24_000_000, rate: 0.09 },
  { upTo: 36_000_000, rate: 0.13 },
  { upTo: 50_000_000, rate: 0.17 },
  { upTo: 70_000_000, rate: 0.21 },
  { upTo: 100_000_000, rate: 0.26 },
  { upTo: Infinity, rate: 0.31 },
] as const;

/** 통근 시간 1시간의 기회비용 */
export const TIME_VALUE_PER_HOUR = 15_000;

/** 최대 제안 직장 개수 */
export const MAX_OFFERS = 3;

/** localStorage 앱 상태 저장 키 */
export const STORAGE_KEY = "jod:state:v1";

/** localStorage 온보딩 완료 여부 저장 키 */
export const ONBOARDED_KEY = "jod:onboarded:v1";

/** 애플리케이션 전역 상태 초기값 */
export const INITIAL_STATE: AppState = {
  version: 1,
  current: null,
  offers: [],
  weights: DEFAULT_WEIGHTS,
  unlockedOfferIds: [],
};

/** 6개 카테고리 점수 레이블 */
export const SCORE_LABELS: Record<
  "money" | "growth" | "workLife" | "stability" | "culture" | "commuteEase",
  string
> = {
  money: "연봉 실질가치",
  growth: "성장성",
  workLife: "워라밸",
  stability: "안정성",
  culture: "조직문화",
  commuteEase: "통근 편의",
};

/** 판정 레벨별 레이블 */
export const VERDICT_LABELS: Record<VerdictLevel, string> = {
  MOVE: "이직 추천",
  CONDITIONAL: "조건부 추천",
  HOLD: "판단 보류",
  STAY: "잔류 추천",
};
