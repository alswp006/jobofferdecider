import type { CompanyProfile, MoneyBreakdown } from "@/lib/types";

/** 세율 구간별 실효세율 조회 */
export function getTaxRate(grossAnnual: number): number {
  throw new Error("Not implemented");
}

/** 월 실질가치 계산 */
export function calcMoney(profile: CompanyProfile): MoneyBreakdown {
  throw new Error("Not implemented");
}
