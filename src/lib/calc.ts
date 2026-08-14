import type { CompanyProfile, MoneyBreakdown } from "@/lib/types";
import { TAX_TABLE, TIME_VALUE_PER_HOUR } from "@/lib/constants";

/** 세율 구간별 실효세율 조회 */
export function getTaxRate(grossAnnual: number): number {
  const bracket = TAX_TABLE.find((entry) => grossAnnual <= entry.upTo);
  return bracket!.rate;
}

/** 월 실질가치 계산 */
export function calcMoney(profile: CompanyProfile): MoneyBreakdown {
  const officeDaysPerMonth = (5 - profile.remoteDaysPerWeek) * 4;
  const grossAnnual = profile.baseSalary + profile.bonusPerYear;
  const effectiveTaxRate = getTaxRate(grossAnnual);
  const netMonthlySalary = Math.round((grossAnnual * (1 - effectiveTaxRate)) / 12);
  const monthlyBenefit = Math.round(profile.welfarePointsPerYear / 12) + profile.mealSupportPerMonth;
  const monthlyCommuteCost = profile.commuteCostPerDay * officeDaysPerMonth;
  const monthlyLunchCost = profile.lunchCostPerDay * officeDaysPerMonth;
  const monthlyCommuteTimeCost = Math.round(
    ((profile.commuteMinutesOneWay * 2 * officeDaysPerMonth) / 60) * TIME_VALUE_PER_HOUR,
  );
  const netMonthlyValue =
    netMonthlySalary + monthlyBenefit - monthlyCommuteCost - monthlyLunchCost - monthlyCommuteTimeCost;

  return {
    officeDaysPerMonth,
    grossAnnual,
    effectiveTaxRate,
    netMonthlySalary,
    monthlyBenefit,
    monthlyCommuteCost,
    monthlyLunchCost,
    monthlyCommuteTimeCost,
    netMonthlyValue,
  };
}
