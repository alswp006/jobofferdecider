/**
 * TDD Red Phase — Tests for packet 0005 (점수 산출: calcScore)
 * These tests define the expected behavior. Implementation will follow.
 *
 * Acceptance Criteria:
 * 1. Weight normalization with specific distribution
 * 2. Default weights when all zero
 * 3. Money score calculation (specific case: 4M → 4.4M)
 * 4. Money score clamping (edge cases: 10x, 1/10x)
 * 5. Null handling and SCORE_LABELS usage
 */

import { describe, it, expect } from "vitest";
import type { CompanyProfile, Weights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { SCORE_LABELS } from "@/lib/constants";

/** Sample CompanyProfile for testing */
function makeProfile(overrides?: Partial<CompanyProfile>): CompanyProfile {
  return {
    id: "test-" + Math.random(),
    name: "Test Company",
    baseSalary: 50_000_000,
    bonusPerYear: 0,
    remoteDaysPerWeek: 0,
    commuteMinutesOneWay: 0,
    commuteCostPerDay: 0,
    lunchCostPerDay: 0,
    mealSupportPerMonth: 0,
    welfarePointsPerYear: 0,
    ratings: {
      growth: 3,
      workLife: 3,
      stability: 3,
      culture: 3,
      commuteEase: 3,
    },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("점수 산출 (calcScore)", () => {
  // ─────────────────────────────────────────────────────────────
  // AC-1: Weight normalization with specific distribution
  // ─────────────────────────────────────────────────────────────

  it("AC-1a: normalizes weights to sum 1.0000 (4 decimal places)", async () => {
    const { normalizeWeights } = await import("@/lib/score");
    const weights: Weights = {
      money: 100,
      growth: 50,
      workLife: 50,
      stability: 0,
      culture: 0,
      commuteEase: 0,
    };

    const normalized = normalizeWeights(weights);

    // Verify 6 items
    expect(Object.keys(normalized).length).toBe(6);

    // Verify sum ≈ 1.0000 (4 decimal places)
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 10000) / 10000).toBe(1.0);

    // Verify specific ratios
    expect(normalized.money).toBeCloseTo(100 / 200, 4);
    expect(normalized.growth).toBeCloseTo(50 / 200, 4);
    expect(normalized.workLife).toBeCloseTo(50 / 200, 4);
  });

  it("AC-1b: zero-weighted items have weightRatio === 0", async () => {
    const { normalizeWeights } = await import("@/lib/score");
    const weights: Weights = {
      money: 100,
      growth: 50,
      workLife: 50,
      stability: 0,
      culture: 0,
      commuteEase: 0,
    };

    const normalized = normalizeWeights(weights);

    expect(normalized.stability).toBe(0);
    expect(normalized.culture).toBe(0);
    expect(normalized.commuteEase).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2: Default weights when all zero
  // ─────────────────────────────────────────────────────────────

  it("AC-2: uses DEFAULT_WEIGHTS when all weights are 0", async () => {
    const { normalizeWeights } = await import("@/lib/score");
    const weights: Weights = {
      money: 0,
      growth: 0,
      workLife: 0,
      stability: 0,
      culture: 0,
      commuteEase: 0,
    };

    const normalized = normalizeWeights(weights);

    // Each should be 1/6 ≈ 0.1667
    const expected = 1 / 6;
    expect(normalized.money).toBeCloseTo(expected, 4);
    expect(normalized.growth).toBeCloseTo(expected, 4);
    expect(normalized.workLife).toBeCloseTo(expected, 4);
    expect(normalized.stability).toBeCloseTo(expected, 4);
    expect(normalized.culture).toBeCloseTo(expected, 4);
    expect(normalized.commuteEase).toBeCloseTo(expected, 4);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3: Money score calculation (specific case)
  // ─────────────────────────────────────────────────────────────

  it("AC-3a: calculates money score correctly (4M → 4.4M net)", async () => {
    const { calcScore } = await import("@/lib/score");

    // Setup: current net monthly = 4M, offer net = 4.4M
    // money score = 50 + (4.4 - 4) / 4 * 200 = 50 + 0.1 * 200 = 50 + 20 = 70
    const current = makeProfile({
      baseSalary: 48_000_000,
      bonusPerYear: 0,
      remoteDaysPerWeek: 0,
      commuteCostPerDay: 0,
      lunchCostPerDay: 0,
      commuteMinutesOneWay: 0,
      welfarePointsPerYear: 0,
      mealSupportPerMonth: 0,
    });

    const offer = makeProfile({
      baseSalary: 52_800_000,
      bonusPerYear: 0,
      remoteDaysPerWeek: 0,
      commuteCostPerDay: 0,
      lunchCostPerDay: 0,
      commuteMinutesOneWay: 0,
      welfarePointsPerYear: 0,
      mealSupportPerMonth: 0,
    });

    const weights: Weights = DEFAULT_WEIGHTS;
    const result = calcScore(current, offer, weights);

    expect(result).not.toBeNull();
    if (!result) return;

    // Find money item
    const moneyItem = result.items.find((item) => item.key === "money");
    expect(moneyItem).toBeDefined();
    expect(moneyItem?.currentScore).toBe(50);
    expect(moneyItem?.offerScore).toBe(70);
  });

  it("AC-3b: currentScore for money is always 50", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile({ baseSalary: 100_000_000 });
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    const moneyItem = result.items.find((item) => item.key === "money");
    expect(moneyItem?.currentScore).toBe(50);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4: Money score clamping (0–100)
  // ─────────────────────────────────────────────────────────────

  it("AC-4a: clamps offerScore to 100 when offer is 10x current", async () => {
    const { calcScore } = await import("@/lib/score");

    // current: 5M net, offer: 50M net
    // score = 50 + (50-5)/5*200 = 50 + 9*200 = 50 + 1800 = 1850 → clamp to 100
    const current = makeProfile({
      baseSalary: 60_000_000,
      bonusPerYear: 0,
    });

    const offer = makeProfile({
      baseSalary: 600_000_000,
      bonusPerYear: 0,
    });

    const weights: Weights = DEFAULT_WEIGHTS;
    const result = calcScore(current, offer, weights);

    expect(result).not.toBeNull();
    if (!result) return;

    const moneyItem = result.items.find((item) => item.key === "money");
    expect(moneyItem?.offerScore).toBe(100);
  });

  it("AC-4b: clamps offerScore to 0 when offer is 1/10th current", async () => {
    const { calcScore } = await import("@/lib/score");

    // current: 50M net, offer: 5M net
    // score = 50 + (5-50)/50*200 = 50 - 180 = -130 → clamp to 0
    const current = makeProfile({
      baseSalary: 600_000_000,
      bonusPerYear: 0,
    });

    const offer = makeProfile({
      baseSalary: 60_000_000,
      bonusPerYear: 0,
    });

    const weights: Weights = DEFAULT_WEIGHTS;
    const result = calcScore(current, offer, weights);

    expect(result).not.toBeNull();
    if (!result) return;

    const moneyItem = result.items.find((item) => item.key === "money");
    expect(moneyItem?.offerScore).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-5: Null handling and SCORE_LABELS
  // ─────────────────────────────────────────────────────────────

  it("AC-5a: returns null when current is null", async () => {
    const { calcScore } = await import("@/lib/score");
    const offer = makeProfile();
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(null, offer, weights);
    expect(result).toBeNull();
  });

  it("AC-5b: all items have labels from SCORE_LABELS", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile();
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    // Verify exactly 6 items with correct labels
    expect(result.items.length).toBe(6);

    for (const item of result.items) {
      const expectedLabel = SCORE_LABELS[item.key];
      expect(expectedLabel).toBeDefined();
      expect(item.label).toBe(expectedLabel);
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("AC-5c: no items have empty labels", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile();
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    for (const item of result.items) {
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Additional: Score calculations for non-monetary items
  // ─────────────────────────────────────────────────────────────

  it("calculates non-monetary scores (rating * 20)", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile({
      ratings: { growth: 2, workLife: 3, stability: 4, culture: 5, commuteEase: 1 },
    });

    const offer = makeProfile({
      ratings: { growth: 4, workLife: 5, stability: 2, culture: 3, commuteEase: 5 },
    });

    const weights: Weights = DEFAULT_WEIGHTS;
    const result = calcScore(current, offer, weights);

    expect(result).not.toBeNull();
    if (!result) return;

    // growth: rating 2 → score 40, rating 4 → score 80
    const growthItem = result.items.find((item) => item.key === "growth");
    expect(growthItem?.currentScore).toBe(2 * 20);
    expect(growthItem?.offerScore).toBe(4 * 20);

    // workLife: rating 3 → score 60, rating 5 → score 100
    const workLifeItem = result.items.find((item) => item.key === "workLife");
    expect(workLifeItem?.currentScore).toBe(3 * 20);
    expect(workLifeItem?.offerScore).toBe(5 * 20);

    // stability: rating 4 → score 80, rating 2 → score 40
    const stabilityItem = result.items.find((item) => item.key === "stability");
    expect(stabilityItem?.currentScore).toBe(4 * 20);
    expect(stabilityItem?.offerScore).toBe(2 * 20);

    // culture: rating 5 → score 100, rating 3 → score 60
    const cultureItem = result.items.find((item) => item.key === "culture");
    expect(cultureItem?.currentScore).toBe(5 * 20);
    expect(cultureItem?.offerScore).toBe(3 * 20);

    // commuteEase: rating 1 → score 20, rating 5 → score 100
    const commuteItem = result.items.find((item) => item.key === "commuteEase");
    expect(commuteItem?.currentScore).toBe(1 * 20);
    expect(commuteItem?.offerScore).toBe(5 * 20);
  });

  // ─────────────────────────────────────────────────────────────
  // Additional: Total score calculation
  // ─────────────────────────────────────────────────────────────

  it("calculates total score as sum of (item.score * item.weightRatio)", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile({
      baseSalary: 50_000_000,
      ratings: {
        growth: 3,
        workLife: 3,
        stability: 3,
        culture: 3,
        commuteEase: 3,
      },
    });

    const offer = makeProfile({
      baseSalary: 50_000_000, // same net → offerScore = 50
      ratings: {
        growth: 3,
        workLife: 3,
        stability: 3,
        culture: 3,
        commuteEase: 3,
      },
    });

    const weights: Weights = DEFAULT_WEIGHTS;
    const result = calcScore(current, offer, weights);

    expect(result).not.toBeNull();
    if (!result) return;

    // All scores should be 50 (money) or 60 (rating 3 * 20)
    // All weights equal (DEFAULT_WEIGHTS), so each weightRatio = 1/6
    // currentTotal = (50 + 60 + 60 + 60 + 60 + 60) * (1/6) = 50
    // offerTotal should also be 50 (identical profile)

    expect(result.currentTotal).toBeCloseTo(50, 0);
    expect(result.offerTotal).toBeCloseTo(50, 0);
    expect(result.diff).toBe(0);
  });

  it("totals are integers (rounded)", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile({ baseSalary: 55_000_000 });
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(Number.isInteger(result.currentTotal)).toBe(true);
    expect(Number.isInteger(result.offerTotal)).toBe(true);
    expect(Number.isInteger(result.diff)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // Additional: ScoreResult structure
  // ─────────────────────────────────────────────────────────────

  it("returns complete ScoreResult with all fields", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile();
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    // Verify structure
    expect(result.offerId).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.currentTotal).toBeDefined();
    expect(result.offerTotal).toBeDefined();
    expect(result.diff).toBeDefined();
    expect(result.verdict).toBeDefined();
    expect(result.verdictLabel).toBeDefined();
    expect(Array.isArray(result.negotiationPoints)).toBe(true);
    expect(result.currentMoney).toBeDefined();
    expect(result.offerMoney).toBeDefined();
  });

  it("items array has exactly 6 ScoreItems", async () => {
    const { calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile();
    const weights: Weights = DEFAULT_WEIGHTS;

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.items.length).toBe(6);

    // Verify each has required fields
    for (const item of result.items) {
      expect(item.key).toBeDefined();
      expect(["money", "growth", "workLife", "stability", "culture", "commuteEase"]).toContain(
        item.key,
      );
      expect(item.label).toBeDefined();
      expect(item.currentScore).toBeDefined();
      expect(item.offerScore).toBeDefined();
      expect(item.weightRatio).toBeDefined();

      // Scores should be 0–100 integers
      expect(item.currentScore).toBeGreaterThanOrEqual(0);
      expect(item.currentScore).toBeLessThanOrEqual(100);
      expect(item.offerScore).toBeGreaterThanOrEqual(0);
      expect(item.offerScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(item.currentScore)).toBe(true);
      expect(Number.isInteger(item.offerScore)).toBe(true);

      // weightRatio should be 0–1 with 4 decimal precision
      expect(item.weightRatio).toBeGreaterThanOrEqual(0);
      expect(item.weightRatio).toBeLessThanOrEqual(1);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Edge case: Asymmetric weights
  // ─────────────────────────────────────────────────────────────

  it("handles asymmetric weights (e.g., money-only focus)", async () => {
    const { normalizeWeights, calcScore } = await import("@/lib/score");
    const current = makeProfile();
    const offer = makeProfile();
    const weights: Weights = {
      money: 100,
      growth: 0,
      workLife: 0,
      stability: 0,
      culture: 0,
      commuteEase: 0,
    };

    const normalized = normalizeWeights(weights);

    // Only money should have non-zero weightRatio
    expect(normalized.money).toBe(1);
    expect(normalized.growth).toBe(0);
    expect(normalized.workLife).toBe(0);
    expect(normalized.stability).toBe(0);
    expect(normalized.culture).toBe(0);
    expect(normalized.commuteEase).toBe(0);

    const result = calcScore(current, offer, weights);
    expect(result).not.toBeNull();
    if (!result) return;

    // currentTotal should equal money score (50)
    expect(result.currentTotal).toBe(50);
  });
});
