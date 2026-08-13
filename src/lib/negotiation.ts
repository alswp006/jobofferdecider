import type { Axis, AxisScore, MoneyBreakdown } from "@/lib/types";
import { getEffectiveTaxRate } from "@/lib/calc";

const FALLBACK_POINTS = [
  "사이닝 보너스를 요청하세요. 통상 연봉의 10~20%가 협상 범위입니다.",
  "입사일을 2주 이상 늦춰 현 직장 잔여 연차·상여를 확보하세요.",
  "스톡옵션·RSU 여부와 베스팅 조건을 서면으로 확인하세요.",
];

const STATIC_TEMPLATES: Partial<Record<Axis, string>> = {
  growth: "성장성 평가가 낮습니다. 담당 업무 범위와 승진 트랙을 서면 확인하세요.",
  culture: "조직문화 평가가 낮습니다. 팀 리더와 1:1 미팅을 입사 전 요청하세요.",
  stability: "고용안정성 평가가 낮습니다. 계약 형태와 수습 조건을 문서로 확인하세요.",
};

function moneyPoint(money: MoneyBreakdown, targetAnnualGrossWon: number): string {
  const absDiff = Math.abs(money.diffMonthlyWon);
  const taxRate = getEffectiveTaxRate(targetAnnualGrossWon);
  const needManwon = Math.ceil(Math.abs(money.diffYearlyWon) / (1 - taxRate) / 10000);
  return `월 실수령이 ${absDiff.toLocaleString()}원 낮습니다. 연봉을 ${needManwon.toLocaleString()}만원 이상 올려 협상하세요.`;
}

function remotePoint(axis: AxisScore): string {
  const d = Math.round(axis.rawCurrent - axis.rawTarget);
  return `재택이 주 ${d}일 적습니다. 주 ${d}일 재택 보장을 서면으로 요청하세요.`;
}

function commutePoint(axis: AxisScore): string {
  const m = Math.round(axis.rawTarget - axis.rawCurrent);
  return `편도 통근이 ${m}분 깁니다. 유연출근제 또는 교통비 지원을 요청하세요.`;
}

export function buildNegotiationPoints(
  disadvantagedAxes: AxisScore[],
  money: MoneyBreakdown,
  targetAnnualGrossWon: number,
): string[] {
  const points: string[] = [];

  for (const axis of disadvantagedAxes) {
    if (axis.axis === "money") {
      points.push(moneyPoint(money, targetAnnualGrossWon));
    } else if (axis.axis === "remote") {
      points.push(remotePoint(axis));
    } else if (axis.axis === "commute") {
      points.push(commutePoint(axis));
    } else {
      points.push(STATIC_TEMPLATES[axis.axis]!);
    }
  }

  let fallbackIndex = 0;
  while (points.length < 3 && fallbackIndex < FALLBACK_POINTS.length) {
    points.push(FALLBACK_POINTS[fallbackIndex]);
    fallbackIndex++;
  }

  return points.slice(0, 3);
}
