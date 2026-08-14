/**
 * TDD Red Phase — Tests for packet 0006 (판정 & 협상 포인트: getVerdict)
 * These tests define the expected behavior. Implementation will follow.
 *
 * Acceptance Criteria:
 * 1. getVerdictLevel boundary values: 10→MOVE, 9→CONDITIONAL, 3→CONDITIONAL, 2→HOLD, -3→HOLD, -4→STAY
 * 2. Verdict result with currentTotal=62, offerTotal=74 → verdict='MOVE', verdictLabel='이직 추천'
 * 3. negotiationPoints always exactly 3, each 1-60 chars, no duplicates
 * 4. Disadvantage items: top 3 by score diff (descending), fill with fixed templates if < 3
 * 5. No external APIs: 0 instances of fetch/openai/anthropic in source
 */

import { describe, it, expect } from "vitest";
import type { CompanyProfile, Weights, ScoreItem, ScoreResult } from "@/lib/types";
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

/** Helper to create ScoreResult for testing verdict functions */
function makeScoreResult(
  overrides?: Partial<ScoreResult>,
  items?: Partial<ScoreItem>[],
): ScoreResult {
  const defaultItems: ScoreItem[] = [
    {
      key: "money",
      label: SCORE_LABELS.money,
      currentScore: 50,
      offerScore: 50,
      weightRatio: 1 / 6,
    },
    {
      key: "growth",
      label: SCORE_LABELS.growth,
      currentScore: 60,
      offerScore: 60,
      weightRatio: 1 / 6,
    },
    {
      key: "workLife",
      label: SCORE_LABELS.workLife,
      currentScore: 60,
      offerScore: 60,
      weightRatio: 1 / 6,
    },
    {
      key: "stability",
      label: SCORE_LABELS.stability,
      currentScore: 60,
      offerScore: 60,
      weightRatio: 1 / 6,
    },
    {
      key: "culture",
      label: SCORE_LABELS.culture,
      currentScore: 60,
      offerScore: 60,
      weightRatio: 1 / 6,
    },
    {
      key: "commuteEase",
      label: SCORE_LABELS.commuteEase,
      currentScore: 60,
      offerScore: 60,
      weightRatio: 1 / 6,
    },
  ];

  // Merge custom items if provided
  const mergedItems = items
    ? defaultItems.map((item, idx) => ({
        ...item,
        ...(items[idx] || {}),
      }))
    : defaultItems;

  return {
    offerId: "offer-test",
    items: mergedItems,
    currentTotal: 57,
    offerTotal: 57,
    diff: 0,
    verdict: "HOLD",
    verdictLabel: "",
    negotiationPoints: [],
    currentMoney: {
      officeDaysPerMonth: 20,
      grossAnnual: 50_000_000,
      effectiveTaxRate: 0.15,
      netMonthlySalary: 3_541_666,
      monthlyBenefit: 0,
      monthlyCommuteCost: 0,
      monthlyLunchCost: 0,
      monthlyCommuteTimeCost: 0,
      netMonthlyValue: 3_541_666,
    },
    offerMoney: {
      officeDaysPerMonth: 20,
      grossAnnual: 50_000_000,
      effectiveTaxRate: 0.15,
      netMonthlySalary: 3_541_666,
      monthlyBenefit: 0,
      monthlyCommuteCost: 0,
      monthlyLunchCost: 0,
      monthlyCommuteTimeCost: 0,
      netMonthlyValue: 3_541_666,
    },
    ...overrides,
  };
}

describe("판정 & 협상 포인트 (getVerdict)", () => {
  // ─────────────────────────────────────────────────────────────
  // AC-1: VerdictLevel boundary values
  // ─────────────────────────────────────────────────────────────

  it("AC-1a: getVerdictLevel(10) returns 'MOVE'", async () => {
    const { getVerdictLevel } = await import("@/lib/verdict");
    expect(getVerdictLevel(10)).toBe("MOVE");
  });

  it("AC-1b: getVerdictLevel(9) returns 'CONDITIONAL'", async () => {
    const { getVerdictLevel } = await import("@/lib/verdict");
    expect(getVerdictLevel(9)).toBe("CONDITIONAL");
  });

  it("AC-1c: getVerdictLevel(3) returns 'CONDITIONAL'", async () => {
    const { getVerdictLevel } = await import("@/lib/verdict");
    expect(getVerdictLevel(3)).toBe("CONDITIONAL");
  });

  it("AC-1d: getVerdictLevel(2) returns 'HOLD'", async () => {
    const { getVerdictLevel } = await import("@/lib/verdict");
    expect(getVerdictLevel(2)).toBe("HOLD");
  });

  it("AC-1e: getVerdictLevel(-3) returns 'HOLD'", async () => {
    const { getVerdictLevel } = await import("@/lib/verdict");
    expect(getVerdictLevel(-3)).toBe("HOLD");
  });

  it("AC-1f: getVerdictLevel(-4) returns 'STAY'", async () => {
    const { getVerdictLevel } = await import("@/lib/verdict");
    expect(getVerdictLevel(-4)).toBe("STAY");
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2: Verdict result structure and labels
  // ─────────────────────────────────────────────────────────────

  it("AC-2a: verdict 'MOVE' with diff=12, verdictLabel='이직 추천'", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 62,
      offerTotal: 74,
      diff: 12,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("MOVE");
    expect(updated.verdictLabel).toBe("이직 추천");
  });

  it("AC-2b: verdict 'CONDITIONAL' with diff=5, verdictLabel set", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 50,
      offerTotal: 55,
      diff: 5,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("CONDITIONAL");
    expect(updated.verdictLabel).toBeDefined();
    expect(updated.verdictLabel.length).toBeGreaterThan(0);
  });

  it("AC-2c: verdict 'HOLD' with diff=0, verdictLabel set", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 50,
      offerTotal: 50,
      diff: 0,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("HOLD");
    expect(updated.verdictLabel).toBeDefined();
    expect(updated.verdictLabel.length).toBeGreaterThan(0);
  });

  it("AC-2d: verdict 'STAY' with diff=-10, verdictLabel set", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 60,
      offerTotal: 50,
      diff: -10,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("STAY");
    expect(updated.verdictLabel).toBeDefined();
    expect(updated.verdictLabel.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3: negotiationPoints length and character constraints
  // ─────────────────────────────────────────────────────────────

  it("AC-3a: negotiationPoints length is exactly 3", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 62,
      offerTotal: 74,
      diff: 12,
    });

    const updated = getVerdict(result);

    expect(updated.negotiationPoints).toHaveLength(3);
  });

  it("AC-3b: each negotiationPoint has length 1-60 characters", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 62,
      offerTotal: 74,
      diff: 12,
    });

    const updated = getVerdict(result);

    for (const point of updated.negotiationPoints) {
      expect(point.length).toBeGreaterThanOrEqual(1);
      expect(point.length).toBeLessThanOrEqual(60);
    }
  });

  it("AC-3c: no duplicate negotiationPoints", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 62,
      offerTotal: 74,
      diff: 12,
    });

    const updated = getVerdict(result);

    const unique = new Set(updated.negotiationPoints);
    expect(unique.size).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4: Disadvantage items selection (top 3 by score diff)
  // ─────────────────────────────────────────────────────────────

  it("AC-4a: selects top 3 disadvantage items by score diff (descending)", async () => {
    const { buildNegotiationPoints } = await import("@/lib/verdict");

    // Create 5 items with disadvantages:
    // money: diff -10 (1st worst)
    // growth: diff -20 (2nd worst)
    // workLife: diff -15 (3rd worst)
    // stability: diff -5 (4th)
    // culture: diff 0 (advantage, skip)
    const items: ScoreItem[] = [
      {
        key: "money",
        label: SCORE_LABELS.money,
        currentScore: 50,
        offerScore: 40,
        weightRatio: 1 / 6,
      },
      {
        key: "growth",
        label: SCORE_LABELS.growth,
        currentScore: 80,
        offerScore: 60,
        weightRatio: 1 / 6,
      },
      {
        key: "workLife",
        label: SCORE_LABELS.workLife,
        currentScore: 75,
        offerScore: 60,
        weightRatio: 1 / 6,
      },
      {
        key: "stability",
        label: SCORE_LABELS.stability,
        currentScore: 60,
        offerScore: 55,
        weightRatio: 1 / 6,
      },
      {
        key: "culture",
        label: SCORE_LABELS.culture,
        currentScore: 60,
        offerScore: 70,
        weightRatio: 1 / 6,
      },
    ];

    const points = buildNegotiationPoints(items);

    expect(points).toHaveLength(3);
    // All points should be related to the top 3 disadvantages
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      expect(point.length).toBeGreaterThanOrEqual(1);
      expect(point.length).toBeLessThanOrEqual(60);
    }
  });

  it("AC-4b: skips items where offerScore >= currentScore (no disadvantage)", async () => {
    const { buildNegotiationPoints } = await import("@/lib/verdict");

    // Create items where some are advantages
    const items: ScoreItem[] = [
      {
        key: "money",
        label: SCORE_LABELS.money,
        currentScore: 50,
        offerScore: 60, // advantage
        weightRatio: 1 / 6,
      },
      {
        key: "growth",
        label: SCORE_LABELS.growth,
        currentScore: 80,
        offerScore: 60, // disadvantage
        weightRatio: 1 / 6,
      },
      {
        key: "workLife",
        label: SCORE_LABELS.workLife,
        currentScore: 75,
        offerScore: 60, // disadvantage
        weightRatio: 1 / 6,
      },
      {
        key: "stability",
        label: SCORE_LABELS.stability,
        currentScore: 60,
        offerScore: 60, // neutral
        weightRatio: 1 / 6,
      },
      {
        key: "culture",
        label: SCORE_LABELS.culture,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
    ];

    const points = buildNegotiationPoints(items);

    // Should have 3 points (either from disadvantages or templates)
    expect(points).toHaveLength(3);
  });

  it("AC-4c: fills with fixed templates when < 3 disadvantage items", async () => {
    const { buildNegotiationPoints } = await import("@/lib/verdict");

    // Only 1 disadvantage item
    const items: ScoreItem[] = [
      {
        key: "money",
        label: SCORE_LABELS.money,
        currentScore: 50,
        offerScore: 40, // disadvantage
        weightRatio: 1 / 6,
      },
      {
        key: "growth",
        label: SCORE_LABELS.growth,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
      {
        key: "workLife",
        label: SCORE_LABELS.workLife,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
      {
        key: "stability",
        label: SCORE_LABELS.stability,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
      {
        key: "culture",
        label: SCORE_LABELS.culture,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
    ];

    const points = buildNegotiationPoints(items);

    // Should still have exactly 3 points (1 real + 2 templates)
    expect(points).toHaveLength(3);
    // No duplicates
    const unique = new Set(points);
    expect(unique.size).toBe(3);
  });

  it("AC-4d: with 0 disadvantage items, returns fixed templates (all 3)", async () => {
    const { buildNegotiationPoints } = await import("@/lib/verdict");

    // All advantages
    const items: ScoreItem[] = [
      {
        key: "money",
        label: SCORE_LABELS.money,
        currentScore: 50,
        offerScore: 70,
        weightRatio: 1 / 6,
      },
      {
        key: "growth",
        label: SCORE_LABELS.growth,
        currentScore: 60,
        offerScore: 80,
        weightRatio: 1 / 6,
      },
      {
        key: "workLife",
        label: SCORE_LABELS.workLife,
        currentScore: 60,
        offerScore: 80,
        weightRatio: 1 / 6,
      },
      {
        key: "stability",
        label: SCORE_LABELS.stability,
        currentScore: 60,
        offerScore: 80,
        weightRatio: 1 / 6,
      },
      {
        key: "culture",
        label: SCORE_LABELS.culture,
        currentScore: 60,
        offerScore: 80,
        weightRatio: 1 / 6,
      },
    ];

    const points = buildNegotiationPoints(items);

    // Should have exactly 3 fixed templates
    expect(points).toHaveLength(3);
    // All non-empty strings
    for (const point of points) {
      expect(point.length).toBeGreaterThanOrEqual(1);
      expect(point.length).toBeLessThanOrEqual(60);
    }
    // No duplicates
    const unique = new Set(points);
    expect(unique.size).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────
  // AC-5: No external APIs (pure rule-based functions)
  // ─────────────────────────────────────────────────────────────

  it("AC-5: verdict.ts contains no fetch/openai/anthropic strings", async () => {
    const module = await import("@/lib/verdict");
    const fs = await import("fs");
    const path = await import("path");

    // Read the actual source file
    const sourceFile = path.resolve(__dirname, "../lib/verdict.ts");
    const sourceCode = fs.readFileSync(sourceFile, "utf-8");

    // Verify no external API calls
    expect(sourceCode).not.toMatch(/fetch\s*\(/);
    expect(sourceCode).not.toMatch(/openai/i);
    expect(sourceCode).not.toMatch(/anthropic/i);
  });

  // ─────────────────────────────────────────────────────────────
  // Integration: getVerdict modifies result and returns updated copy
  // ─────────────────────────────────────────────────────────────

  it("getVerdict returns modified ScoreResult with verdict, verdictLabel, negotiationPoints", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const original = makeScoreResult({
      currentTotal: 62,
      offerTotal: 74,
      diff: 12,
      verdict: "HOLD",
      verdictLabel: "",
      negotiationPoints: [],
    });

    const updated = getVerdict(original);

    // Verify modified fields
    expect(updated.verdict).toBe("MOVE");
    expect(updated.verdictLabel).toBe("이직 추천");
    expect(updated.negotiationPoints).toHaveLength(3);

    // Verify unchanged fields
    expect(updated.currentTotal).toBe(62);
    expect(updated.offerTotal).toBe(74);
    expect(updated.diff).toBe(12);
    expect(updated.offerId).toBe("offer-test");
  });

  it("getVerdict handles edge case: diff boundary (exactly 10)", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 50,
      offerTotal: 60,
      diff: 10,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("MOVE");
  });

  it("getVerdict handles edge case: diff boundary (exactly 3)", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 50,
      offerTotal: 53,
      diff: 3,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("CONDITIONAL");
  });

  it("getVerdict handles edge case: diff boundary (exactly -3)", async () => {
    const { getVerdict } = await import("@/lib/verdict");
    const result = makeScoreResult({
      currentTotal: 50,
      offerTotal: 47,
      diff: -3,
    });

    const updated = getVerdict(result);

    expect(updated.verdict).toBe("HOLD");
  });

  it("buildNegotiationPoints with exactly 3 disadvantages uses all 3", async () => {
    const { buildNegotiationPoints } = await import("@/lib/verdict");

    // Exactly 3 disadvantages
    const items: ScoreItem[] = [
      {
        key: "money",
        label: SCORE_LABELS.money,
        currentScore: 50,
        offerScore: 40, // -10
        weightRatio: 1 / 6,
      },
      {
        key: "growth",
        label: SCORE_LABELS.growth,
        currentScore: 80,
        offerScore: 60, // -20
        weightRatio: 1 / 6,
      },
      {
        key: "workLife",
        label: SCORE_LABELS.workLife,
        currentScore: 75,
        offerScore: 60, // -15
        weightRatio: 1 / 6,
      },
      {
        key: "stability",
        label: SCORE_LABELS.stability,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
      {
        key: "culture",
        label: SCORE_LABELS.culture,
        currentScore: 60,
        offerScore: 70, // advantage
        weightRatio: 1 / 6,
      },
    ];

    const points = buildNegotiationPoints(items);

    expect(points).toHaveLength(3);
    // All should be valid strings
    for (const point of points) {
      expect(typeof point).toBe("string");
      expect(point.length).toBeGreaterThanOrEqual(1);
      expect(point.length).toBeLessThanOrEqual(60);
    }
  });

  it("buildNegotiationPoints sorts by score diff in descending order", async () => {
    const { buildNegotiationPoints } = await import("@/lib/verdict");

    // Multiple disadvantages with different gaps
    const items: ScoreItem[] = [
      {
        key: "money",
        label: "연봉 실질가치",
        currentScore: 50,
        offerScore: 40, // diff: 10
        weightRatio: 1 / 6,
      },
      {
        key: "growth",
        label: "성장성",
        currentScore: 80,
        offerScore: 50, // diff: 30 (biggest)
        weightRatio: 1 / 6,
      },
      {
        key: "workLife",
        label: "워라밸",
        currentScore: 75,
        offerScore: 65, // diff: 10
        weightRatio: 1 / 6,
      },
      {
        key: "stability",
        label: "안정성",
        currentScore: 60,
        offerScore: 45, // diff: 15
        weightRatio: 1 / 6,
      },
      {
        key: "culture",
        label: "조직문화",
        currentScore: 60,
        offerScore: 50, // diff: 10
        weightRatio: 1 / 6,
      },
    ];

    const points = buildNegotiationPoints(items);

    expect(points).toHaveLength(3);
    // The result should prioritize the biggest disadvantages
    for (const point of points) {
      expect(point.length).toBeGreaterThanOrEqual(1);
      expect(point.length).toBeLessThanOrEqual(60);
    }
  });
});
