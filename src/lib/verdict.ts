import type { ScoreResult, ScoreItem, VerdictLevel } from "@/lib/types";

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

/**
 * Builds negotiation points from disadvantage items
 * Returns exactly 3 strings: top 3 disadvantages or fixed templates if fewer exist
 */
export function buildNegotiationPoints(_items: ScoreItem[]): string[] {
  // TODO: Implement
  // 1. Filter items where offerScore < currentScore
  // 2. Sort by gap (currentScore - offerScore) descending
  // 3. Take top 3
  // 4. Fill with fixed templates if < 3 real disadvantages
  // Return exactly 3 strings (1-60 chars each, no dups)
  return ["", "", ""];
}

/**
 * Populates verdict, verdictLabel, and negotiationPoints in ScoreResult
 */
export function getVerdict(result: ScoreResult): ScoreResult {
  // TODO: Implement
  // 1. Call getVerdictLevel(result.diff) → verdict
  // 2. Map verdict to label → verdictLabel
  // 3. Call buildNegotiationPoints(result.items) → negotiationPoints
  // 4. Return updated result
  return {
    ...result,
    verdict: getVerdictLevel(result.diff),
    verdictLabel: "",
    negotiationPoints: buildNegotiationPoints(result.items),
  };
}
