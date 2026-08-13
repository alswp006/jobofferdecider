import type { Offer } from "@/lib/types";

const TAX_BRACKETS: { threshold: number; rate: number }[] = [
  { threshold: 100000000, rate: 0.28 },
  { threshold: 70000000, rate: 0.23 },
  { threshold: 50000000, rate: 0.18 },
  { threshold: 30000000, rate: 0.14 },
  { threshold: 0, rate: 0.1 },
];

export function getEffectiveTaxRate(annualGross: number): number {
  const bracket = TAX_BRACKETS.find((b) => annualGross >= b.threshold);
  return bracket ? bracket.rate : TAX_BRACKETS[TAX_BRACKETS.length - 1].rate;
}

// @AI:NOTE 연간 출근일 = (5 - 재택일수) * 24주. spec에 명시된 고정 가정치.
const WORK_WEEKS_PER_YEAR = 24;

export function calcMonthlyNet(input: {
  base: number;
  bonus: number;
  welfare: number;
  remote: number;
  commute: number;
  lunch: number;
}): number {
  const annualGross = (input.base + input.bonus) * 10000;
  const rate = getEffectiveTaxRate(annualGross);
  const annualNet = annualGross * (1 - rate);
  const annualWelfare = input.welfare * 10000;
  const officeDaysPerYear = Math.max(0, 5 - input.remote) * WORK_WEEKS_PER_YEAR;
  const annualCommute = input.commute * officeDaysPerYear;
  const annualLunch = input.lunch * officeDaysPerYear;
  const annualTotal = annualNet + annualWelfare - annualCommute - annualLunch;
  return Math.round(annualTotal / 12);
}

export function validateOffer(offer: Offer): Array<{ field: keyof Offer; message: string }> {
  const errors: Array<{ field: keyof Offer; message: string }> = [];

  if (!offer.companyName || offer.companyName.trim().length === 0) {
    errors.push({ field: "companyName", message: "회사명을 입력해 주세요" });
  }

  if (!Number.isInteger(offer.baseSalaryManwon)) {
    errors.push({ field: "baseSalaryManwon", message: "연봉은 정수로 입력해 주세요" });
  } else if (offer.baseSalaryManwon <= 0) {
    errors.push({ field: "baseSalaryManwon", message: "연봉을 입력해 주세요" });
  }

  if (offer.bonusManwon !== undefined && !Number.isInteger(offer.bonusManwon)) {
    errors.push({ field: "bonusManwon", message: "상여금은 정수로 입력해 주세요" });
  }

  if (offer.welfarePointManwon !== undefined && !Number.isInteger(offer.welfarePointManwon)) {
    errors.push({ field: "welfarePointManwon", message: "복지포인트는 정수로 입력해 주세요" });
  }

  if (offer.commuteCostPerDayWon !== undefined && !Number.isInteger(offer.commuteCostPerDayWon)) {
    errors.push({ field: "commuteCostPerDayWon", message: "통근 비용은 정수로 입력해 주세요" });
  }

  if (offer.lunchCostPerDayWon !== undefined && !Number.isInteger(offer.lunchCostPerDayWon)) {
    errors.push({ field: "lunchCostPerDayWon", message: "점심 비용은 정수로 입력해 주세요" });
  }

  if (offer.commuteMinutesOneWay !== undefined && offer.commuteMinutesOneWay < 0) {
    errors.push({ field: "commuteMinutesOneWay", message: "통근 시간을 올바르게 입력해 주세요" });
  }

  if (offer.growthScore !== undefined && (offer.growthScore < 0 || offer.growthScore > 100)) {
    errors.push({ field: "growthScore", message: "성장성 점수는 0~100 사이로 입력해 주세요" });
  }

  return errors;
}
