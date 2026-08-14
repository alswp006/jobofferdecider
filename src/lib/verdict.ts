import type { ScoreResult, ScoreItem, VerdictLevel } from "@/lib/types";
import { VERDICT_LABELS } from "@/lib/constants";

/**
 * Maps score difference to verdict level (rule-based, pure function)
 * Boundaries: 10→MOVE, 3–9→CONDITIONAL, -3–2→HOLD, <-3→STAY
 */
export function getVerdictLevel(diff: number): VerdictLevel {
  if (diff >= 10) return "MOVE";
  if (diff >= 3) return "CONDITIONAL";
  if (diff >= -3) return "HOLD";
  return "STAY";
}

/** 카테고리별 협상 포인트 문구 (SPEC 예시 문자열과 일치) */
const ITEM_NEGOTIATION_TEMPLATES: Record<ScoreItem["key"], string> = {
  money: "연봉 인상 폭을 세후 기준으로 재확인하세요",
  growth: "성장 기회와 교육 지원 조건을 구체적으로 물어보세요",
  workLife: "재택 근무일과 근무 시간 유연성을 협의해 보세요",
  stability: "고용 안정성과 조직 변동 계획을 확인해 보세요",
  culture: "팀 문화와 협업 방식을 미리 파악해 두세요",
  commuteEase: "출퇴근 지원이나 재택 비율 조정을 요청해 보세요",
};

/** 열세 항목이 3개 미만일 때 채우는 고정 템플릿 */
const FIXED_NEGOTIATION_TEMPLATES = [
  "연봉 인상 폭을 세후 기준으로 재확인하세요",
  "입사일과 수습 기간 조건을 먼저 협의해 보세요",
  "복지포인트나 재택 근무일 조정 여지를 물어보세요",
];

/**
 * Builds negotiation points from disadvantage items
 * Returns exactly 3 strings: top 3 disadvantages or fixed templates if fewer exist
 */
export function buildNegotiationPoints(items: ScoreItem[]): string[] {
  const disadvantagePoints = items
    .filter((item) => item.offerScore < item.currentScore)
    .sort((a, b) => (b.currentScore - b.offerScore) - (a.currentScore - a.offerScore))
    .slice(0, 3)
    .map((item) => ITEM_NEGOTIATION_TEMPLATES[item.key]);

  const points: string[] = [];
  for (const point of disadvantagePoints) {
    if (!points.includes(point)) points.push(point);
  }
  for (const template of FIXED_NEGOTIATION_TEMPLATES) {
    if (points.length >= 3) break;
    if (!points.includes(template)) points.push(template);
  }

  return points.slice(0, 3);
}

/**
 * Populates verdict, verdictLabel, and negotiationPoints in ScoreResult
 */
export function getVerdict(result: ScoreResult): ScoreResult {
  const verdict = getVerdictLevel(result.diff);
  return {
    ...result,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    negotiationPoints: buildNegotiationPoints(result.items),
  };
}
