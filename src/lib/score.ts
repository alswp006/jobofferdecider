/**
 * PLACEHOLDER — TDD Red Phase
 *
 * This file is a stub to allow tests to run while waiting for implementation.
 * Tests are defined in src/__tests__/packet-0005.test.ts
 *
 * TODO: Implement normalizeWeights and calcScore
 */

import type { CompanyProfile, Weights, ScoreResult } from "@/lib/types";

export function normalizeWeights(w: Weights): Record<keyof Weights, number> {
  // TODO: Implement
  throw new Error("normalizeWeights not implemented");
}

export function calcScore(
  current: CompanyProfile | null,
  offer: CompanyProfile,
  weights: Weights,
): ScoreResult | null {
  // TODO: Implement
  throw new Error("calcScore not implemented");
}
