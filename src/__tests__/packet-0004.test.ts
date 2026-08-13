import { describe, it, expect } from "vitest";
import type { Offer, Weights, ScoreResult, Verdict, AxisScore } from "@/lib/types";
import { AXIS_ORDER, DEFAULT_WEIGHTS } from "@/lib/types";

/**
 * TDD Red Phase Tests for packet-0004: 정규화·총점·판정·협상 포인트
 *
 * Tests describe the expected behavior of buildScoreResult(current, target, weights).
 * Implementation files: src/lib/score.ts, src/lib/negotiation.ts
 * Tests will initially FAIL — that's the intent of TDD red phase.
 *
 * Note: buildScoreResult stub below will be replaced with real import from @/lib/score when implemented.
 */

// Stub: Coder will replace this with: import { buildScoreResult } from "@/lib/score";
function buildScoreResult(current: Offer, target: Offer, weights: Weights): ScoreResult {
  throw new Error("buildScoreResult not implemented yet");
}

describe("정규화·총점·판정·협상 포인트", () => {
  // ========================================================================
  // AC-1: Normalization — remote raw 0 vs 3 → normCurrent 40, normTarget 100
  //       commute 30 vs 30 → both 50 (no advantage)
  // ========================================================================
  describe("AC-1[P0]: Normalization & Raw Score Extraction", () => {
    it("should normalize remote: 0 days → 40, 3 days → 100", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,     // 0 remote days
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 3,     // 3 remote days (maximum)
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Find remote axis in result.axes
      const remoteAxis = result.axes.find((a: AxisScore) => a.axis === "remote");
      expect(remoteAxis).toBeDefined();
      expect(remoteAxis!.normCurrent).toBe(40);
      expect(remoteAxis!.normTarget).toBe(100);
    });

    it("should normalize commute (minutes): equal values both → 50 (no advantage)", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,  // 30 minutes
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,  // Same 30 minutes
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Find commute axis in result.axes
      const commuteAxis = result.axes.find((a: AxisScore) => a.axis === "commute");
      expect(commuteAxis).toBeDefined();
      expect(commuteAxis!.normCurrent).toBe(50);
      expect(commuteAxis!.normTarget).toBe(50);
    });

    it("should extract and normalize all 6 axes with correct raw values", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 20,
        commuteCostPerDayWon: 2000,
        lunchCostPerDayWon: 8000,
        growthScore: 40,
        cultureScore: 50,
        stabilityScore: 60,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6000,
        bonusManwon: 600,
        welfarePointManwon: 120,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 40,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 70,
        cultureScore: 80,
        stabilityScore: 75,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Verify raw values are extracted
      const moneyAxis = result.axes.find((a: AxisScore) => a.axis === "money");
      expect(moneyAxis?.rawCurrent).toBeDefined();
      expect(moneyAxis?.rawTarget).toBeDefined();

      const growthAxis = result.axes.find((a: AxisScore) => a.axis === "growth");
      expect(growthAxis?.rawCurrent).toBe(40);
      expect(growthAxis?.rawTarget).toBe(70);

      const cultureAxis = result.axes.find((a: AxisScore) => a.axis === "culture");
      expect(cultureAxis?.rawCurrent).toBe(50);
      expect(cultureAxis?.rawTarget).toBe(80);

      const stabilityAxis = result.axes.find((a: AxisScore) => a.axis === "stability");
      expect(stabilityAxis?.rawCurrent).toBe(60);
      expect(stabilityAxis?.rawTarget).toBe(75);
    });
  });

  // ========================================================================
  // AC-2: axes array structure — length 6, order matches AXIS_ORDER
  // ========================================================================
  describe("AC-2[P0]: axes array structure", () => {
    it("should have exactly 6 axes", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.axes).toHaveLength(6);
    });

    it("should maintain AXIS_ORDER sequence: money, remote, commute, growth, culture, stability", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Extract axis names from result
      const resultAxisOrder = result.axes.map((a: AxisScore) => a.axis);

      // Verify order matches AXIS_ORDER
      expect(resultAxisOrder).toEqual(["money", "remote", "commute", "growth", "culture", "stability"]);
      expect(resultAxisOrder).toEqual(Array.from(AXIS_ORDER));
    });

    it("should include required properties in each AxisScore", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      result.axes.forEach((axis: AxisScore) => {
        expect(axis).toHaveProperty("axis");
        expect(axis).toHaveProperty("label");
        expect(axis).toHaveProperty("rawCurrent");
        expect(axis).toHaveProperty("rawTarget");
        expect(axis).toHaveProperty("normCurrent");
        expect(axis).toHaveProperty("normTarget");
        expect(axis).toHaveProperty("weight");
        expect(axis).toHaveProperty("weightedCurrent");
        expect(axis).toHaveProperty("weightedTarget");
      });
    });
  });

  // ========================================================================
  // AC-3: verdict boundaries — gap thresholds
  // ========================================================================
  describe("AC-3[P0]: verdict based on gap", () => {
    it("should render strong_move when gap >= 15.0", () => {
      const now = Date.now();
      // Setup offers such that gap is exactly 15.0 or slightly above
      // For this test, we'll construct offers where the total gap equals 15.0
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,     // 40 normalized
        commuteMinutesOneWay: 60, // Lower score (longer commute)
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 30,
        cultureScore: 30,
        stabilityScore: 30,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6500,    // Significantly higher
        bonusManwon: 650,
        welfarePointManwon: 130,
        remoteDaysPerWeek: 5,      // 100 normalized (maximum)
        commuteMinutesOneWay: 0,   // 100 normalized (no commute)
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 90,
        cultureScore: 90,
        stabilityScore: 90,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.gap).toBeGreaterThanOrEqual(15.0);
      expect(result.verdict).toBe("strong_move");
    });

    it("should render lean_move when 5.0 < gap < 15.0", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 45,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 45,
        cultureScore: 45,
        stabilityScore: 45,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6000,
        bonusManwon: 600,
        welfarePointManwon: 120,
        remoteDaysPerWeek: 3,
        commuteMinutesOneWay: 20,
        commuteCostPerDayWon: 2000,
        lunchCostPerDayWon: 8000,
        growthScore: 70,
        cultureScore: 70,
        stabilityScore: 70,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.gap).toBeGreaterThan(5.0);
      expect(result.gap).toBeLessThan(15.0);
      expect(result.verdict).toBe("lean_move");
    });

    it("should render neutral when gap is around ±5.0", () => {
      const now = Date.now();
      // Create nearly balanced offers
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 5200,    // Slight increase
        bonusManwon: 520,
        welfarePointManwon: 110,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 55,           // Slight increase
        cultureScore: 55,
        stabilityScore: 55,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      // Gap should be close to 0 (within ±5)
      expect(Math.abs(result.gap)).toBeLessThan(5.0);
      expect(result.verdict).toBe("neutral");
    });

    it("should render lean_stay when -15.0 < gap <= -5.0", () => {
      const now = Date.now();
      // Offer is worse than current
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 6000,
        bonusManwon: 600,
        welfarePointManwon: 120,
        remoteDaysPerWeek: 3,
        commuteMinutesOneWay: 20,
        commuteCostPerDayWon: 2000,
        lunchCostPerDayWon: 8000,
        growthScore: 70,
        cultureScore: 70,
        stabilityScore: 70,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 45,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 45,
        cultureScore: 45,
        stabilityScore: 45,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.gap).toBeLessThan(-5.0);
      expect(result.gap).toBeGreaterThan(-15.0);
      expect(result.verdict).toBe("lean_stay");
    });

    it("should render strong_stay when gap <= -15.0", () => {
      const now = Date.now();
      // Offer is much worse than current
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 6500,
        bonusManwon: 650,
        welfarePointManwon: 130,
        remoteDaysPerWeek: 5,
        commuteMinutesOneWay: 0,
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 90,
        cultureScore: 90,
        stabilityScore: 90,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 60,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 30,
        cultureScore: 30,
        stabilityScore: 30,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.gap).toBeLessThanOrEqual(-15.0);
      expect(result.verdict).toBe("strong_stay");
    });
  });

  // ========================================================================
  // AC-4: negotiationPoints — exactly 3, correct template for 0 disadvantaged axes
  // ========================================================================
  describe("AC-4[P0]: negotiationPoints (협상 포인트)", () => {
    it("should return exactly 3 negotiation points when all axes favor offer", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 60,
        commuteCostPerDayWon: 4000,
        lunchCostPerDayWon: 10000,
        growthScore: 30,
        cultureScore: 30,
        stabilityScore: 30,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6500,
        bonusManwon: 650,
        welfarePointManwon: 130,
        remoteDaysPerWeek: 5,
        commuteMinutesOneWay: 0,
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 90,
        cultureScore: 90,
        stabilityScore: 90,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.negotiationPoints).toHaveLength(3);
    });

    it("should include specific signing bonus advice when no disadvantaged axes", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 60,
        commuteCostPerDayWon: 4000,
        lunchCostPerDayWon: 10000,
        growthScore: 30,
        cultureScore: 30,
        stabilityScore: 30,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6500,
        bonusManwon: 650,
        welfarePointManwon: 130,
        remoteDaysPerWeek: 5,
        commuteMinutesOneWay: 0,
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 90,
        cultureScore: 90,
        stabilityScore: 90,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.negotiationPoints[0]).toBe("사이닝 보너스를 요청하세요. 통상 연봉의 10~20%가 협상 범위입니다.");
    });

    it("should contain no duplicate strings in negotiationPoints", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 60,
        commuteCostPerDayWon: 4000,
        lunchCostPerDayWon: 10000,
        growthScore: 30,
        cultureScore: 30,
        stabilityScore: 30,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6500,
        bonusManwon: 650,
        welfarePointManwon: 130,
        remoteDaysPerWeek: 5,
        commuteMinutesOneWay: 0,
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 90,
        cultureScore: 90,
        stabilityScore: 90,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      const uniquePoints = new Set(result.negotiationPoints);
      expect(uniquePoints.size).toBe(result.negotiationPoints.length);
    });

    it("should generate different negotiation points for different scenarios", () => {
      const now = Date.now();
      const baseOffer: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const targetWithGrowthAdvantage: Offer = {
        ...baseOffer,
        id: "o1",
        kind: "offer",
        growthScore: 85,  // Strong growth advantage
      };

      const targetWithRemoteAdvantage: Offer = {
        ...baseOffer,
        id: "o2",
        kind: "offer",
        remoteDaysPerWeek: 5,  // Full remote advantage
      };

      const result1 = buildScoreResult(baseOffer, targetWithGrowthAdvantage, DEFAULT_WEIGHTS);
      const result2 = buildScoreResult(baseOffer, targetWithRemoteAdvantage, DEFAULT_WEIGHTS);

      // negotiationPoints should be different because scenarios are different
      expect(result1.negotiationPoints).not.toEqual(result2.negotiationPoints);
    });
  });

  // ========================================================================
  // AC-5: DEFAULT_WEIGHTS fallback — sumWeight===0 → use defaults, no NaN
  // ========================================================================
  describe("AC-5[P0]: DEFAULT_WEIGHTS fallback", () => {
    it("should use DEFAULT_WEIGHTS when sumWeight === 0", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      // Empty/zero weights
      const zeroWeights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, zeroWeights);

      // Should not contain NaN in JSON representation
      const resultJson = JSON.stringify(result);
      expect(resultJson.includes("NaN")).toBe(false);
    });

    it("should calculate consistent scores whether using DEFAULT_WEIGHTS or zero weights that trigger fallback", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const zeroWeights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: now,
      };

      const resultWithDefault = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      const resultWithZero = buildScoreResult(current, target, zeroWeights);

      // Both should have valid totalCurrent and totalTarget
      expect(resultWithDefault.totalCurrent).toBeDefined();
      expect(resultWithDefault.totalTarget).toBeDefined();
      expect(resultWithZero.totalCurrent).toBeDefined();
      expect(resultWithZero.totalTarget).toBeDefined();

      // Verdict should be the same because the underlying normalized scores are the same
      // (only weights change, which affects interpretation but gap/verdict should align)
      // Actually, if weights are all 0, the weighted total would be 0 for both, making gap 0 → neutral
      expect(resultWithZero.verdict).toBe("neutral");
    });

    it("should produce no NaN values in result when weights sum to zero", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const zeroWeights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, zeroWeights);

      // Check individual numeric fields
      expect(Number.isFinite(result.totalCurrent)).toBe(true);
      expect(Number.isFinite(result.totalTarget)).toBe(true);
      expect(Number.isFinite(result.gap)).toBe(true);

      // Check axes
      result.axes.forEach((axis) => {
        expect(Number.isFinite(axis.normCurrent)).toBe(true);
        expect(Number.isFinite(axis.normTarget)).toBe(true);
        expect(Number.isFinite(axis.weightedCurrent)).toBe(true);
        expect(Number.isFinite(axis.weightedTarget)).toBe(true);
      });
    });
  });

  // ========================================================================
  // Additional boundary and edge case tests
  // ========================================================================
  describe("Additional: Comprehensive validations", () => {
    it("should compute ScoreResult.totalCurrent & totalCurrent as weighted sum", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Verify totals match sum of weighted scores
      const sumWeightedCurrent = result.axes.reduce((sum: number, a: AxisScore) => sum + a.weightedCurrent, 0);
      const sumWeightedTarget = result.axes.reduce((sum: number, a: AxisScore) => sum + a.weightedTarget, 0);

      expect(result.totalCurrent).toBeCloseTo(sumWeightedCurrent, 1);
      expect(result.totalTarget).toBeCloseTo(sumWeightedTarget, 1);
    });

    it("should format totalCurrent & totalTarget to 1 decimal place", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Total should be formatted to 1 decimal place (e.g., 50.5, not 50.123456)
      // Check by converting to string and counting decimals
      const totalCurrentStr = result.totalCurrent.toString();
      const decimalIndex = totalCurrentStr.indexOf(".");
      if (decimalIndex !== -1) {
        const decimalPlaces = totalCurrentStr.length - decimalIndex - 1;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      }
    });

    it("should set currentOfferId and targetOfferId from offers", () => {
      const now = Date.now();
      const current: Offer = {
        id: "current-123",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "target-456",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 6000,
        bonusManwon: 600,
        welfarePointManwon: 120,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.currentOfferId).toBe("current-123");
      expect(result.targetOfferId).toBe("target-456");
    });

    it("should set computedAt to a valid timestamp", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.computedAt).toBeDefined();
      expect(typeof result.computedAt).toBe("number");
      expect(result.computedAt).toBeGreaterThan(0);
    });

    it("should include MoneyBreakdown with computed values", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        ...current,
        id: "o1",
        kind: "offer",
        baseSalaryManwon: 6000,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      expect(result.money).toBeDefined();
      expect(result.money).toHaveProperty("currentMonthlyNetWon");
      expect(result.money).toHaveProperty("targetMonthlyNetWon");
      expect(result.money).toHaveProperty("diffMonthlyWon");
      expect(result.money).toHaveProperty("diffYearlyWon");
      expect(result.money).toHaveProperty("currentTaxWon");
      expect(result.money).toHaveProperty("targetTaxWon");

      // Money values should be valid numbers
      expect(typeof result.money.currentMonthlyNetWon).toBe("number");
      expect(typeof result.money.targetMonthlyNetWon).toBe("number");
      expect(result.money.diffMonthlyWon).toBe(result.money.targetMonthlyNetWon - result.money.currentMonthlyNetWon);
      expect(result.money.diffYearlyWon).toBe(result.money.diffMonthlyWon * 12);
    });

    it("should handle commute normalization: shorter commute = higher score", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 60,  // Long commute
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 10,  // Short commute
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 50,
        cultureScore: 50,
        stabilityScore: 50,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);
      const commuteAxis = result.axes.find((a: AxisScore) => a.axis === "commute");

      // Shorter commute should have higher normalized score
      expect(commuteAxis!.normTarget).toBeGreaterThan(commuteAxis!.normCurrent);
    });

    it("should handle edge case: maximum vs minimum values", () => {
      const now = Date.now();
      const current: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Company A",
        baseSalaryManwon: 0,        // Minimum
        bonusManwon: 0,
        welfarePointManwon: 0,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 9999, // Extremely long
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 0,
        cultureScore: 0,
        stabilityScore: 0,
        createdAt: now,
        updatedAt: now,
      };

      const target: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Company B",
        baseSalaryManwon: 10000,    // Maximum
        bonusManwon: 10000,
        welfarePointManwon: 10000,
        remoteDaysPerWeek: 5,       // Maximum (full remote)
        commuteMinutesOneWay: 0,    // No commute
        commuteCostPerDayWon: 0,
        lunchCostPerDayWon: 0,
        growthScore: 100,
        cultureScore: 100,
        stabilityScore: 100,
        createdAt: now,
        updatedAt: now,
      };

      const result = buildScoreResult(current, target, DEFAULT_WEIGHTS);

      // Should not crash and should have a strong_move verdict
      expect(result).toBeDefined();
      expect(result.verdict).toBe("strong_move");
      expect(result.gap).toBeGreaterThan(15.0);
    });
  });
});
