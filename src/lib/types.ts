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
  currentMoney: MoneyBreakdown;
  offerMoney: MoneyBreakdown;
}

/** 애플리케이션 전역 상태 (localStorage 루트) */
export interface AppState {
  /** 스키마 버전. 현재 1 */
  version: 1;
  current: CompanyProfile | null;
  /** 최대 3개 */
  offers: CompanyProfile[];
  weights: Weights;
  /** 리워드 광고 시청 완료된 offerId 목록 (세션 무관 영구) */
  unlockedOfferIds: string[];
}

/**
 * 라우팅 상태 타입 정의
 * 설계 원칙: 모든 화면 간 데이터 전달은 URL param + localStorage로만 수행하고
 * location.state를 일절 사용하지 않는다.
 * 따라서 모든 라우트의 state는 undefined이다.
 */
export interface RouteState {
  "/": undefined;
  "/company/current": undefined;
  "/company/offer/new": undefined;
  "/company/offer/:id": undefined;
  "/weights": undefined;
  "/result/:offerId": undefined;
  "/compare": undefined;
}
