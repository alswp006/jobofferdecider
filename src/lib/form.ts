import type { NonMonetaryRatings, ProfileDraft } from "@/lib/types";

/** 콤마·공백 등 비숫자 제거 후 정수화. 비숫자만 있으면 0 */
export function parseWon(input: string): number {
  const digits = input.replace(/[^0-9]/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
}

/** 3자리 콤마 포맷 (정수화, 음수 부호 유지) */
export function formatWon(v: number): string {
  const rounded = Math.trunc(v);
  return rounded.toLocaleString("ko-KR");
}

/** 값을 min~max 범위로 제한 */
export function clampRange(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

interface FieldRange {
  min: number;
  max: number;
  message: string;
}

const RANGES: Record<
  | "baseSalary"
  | "bonusPerYear"
  | "remoteDaysPerWeek"
  | "commuteMinutesOneWay"
  | "commuteCostPerDay"
  | "lunchCostPerDay"
  | "mealSupportPerMonth"
  | "welfarePointsPerYear",
  FieldRange
> = {
  baseSalary: { min: 1, max: 500_000_000, message: "연봉은 1원 이상 5억원 이하로 입력해주세요" },
  bonusPerYear: { min: 0, max: 500_000_000, message: "상여는 0원 이상 5억원 이하로 입력해주세요" },
  remoteDaysPerWeek: { min: 0, max: 5, message: "재택근무는 0~5일 범위에서 입력해주세요" },
  commuteMinutesOneWay: { min: 0, max: 180, message: "통근시간은 0~180분 범위에서 입력해주세요" },
  commuteCostPerDay: { min: 0, max: 100_000, message: "일일 교통비는 0원 이상 10만원 이하로 입력해주세요" },
  lunchCostPerDay: { min: 0, max: 50_000, message: "일일 점심값은 0원 이상 5만원 이하로 입력해주세요" },
  mealSupportPerMonth: { min: 0, max: 1_000_000, message: "월 식대지원은 0원 이상 100만원 이하로 입력해주세요" },
  welfarePointsPerYear: {
    min: 0,
    max: 20_000_000,
    message: "연간 복지포인트는 0원 이상 2천만원 이하로 입력해주세요",
  },
};

/** 필드별 한국어 에러 메시지. 유효하면 빈 객체 */
export function validateProfile(draft: ProfileDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (draft.name.length < 1 || draft.name.length > 20) {
    errors.name = "1~20자로 적어주세요";
  }

  for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    const range = RANGES[key];
    const value = parseWon(draft[key]);
    if (value < range.min || value > range.max) {
      errors[key] = range.message;
    }
  }

  return errors;
}

/** 신규 폼 진입 시 초기 상태 */
export function emptyDraft(): ProfileDraft {
  const ratings: NonMonetaryRatings = {
    growth: 3,
    workLife: 3,
    stability: 3,
    culture: 3,
    commuteEase: 3,
  };

  return {
    name: "",
    baseSalary: "",
    bonusPerYear: "",
    remoteDaysPerWeek: "",
    commuteMinutesOneWay: "",
    commuteCostPerDay: "",
    lunchCostPerDay: "",
    mealSupportPerMonth: "",
    welfarePointsPerYear: "",
    ratings,
  };
}
