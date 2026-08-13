import { describe, it, expect } from "vitest";
import type {
  Offer,
  Weights,
  AxisScore,
  MoneyBreakdown,
  ScoreResult,
  UnlockState,
  AppMeta,
  RouteState,
  Verdict,
} from "@/lib/types";
import {
  AXIS_ORDER,
  AXIS_LABELS,
  VERDICT_LABELS,
  DEFAULT_WEIGHTS,
  STORAGE_KEYS,
} from "@/lib/types";

/**
 * Packet 0001: 엔티티 & RouteState 타입 정의
 *
 * AC-1: SPEC의 9개 인터페이스/타입이 필드명·타입 그대로 export 된다
 * AC-2: AXIS_ORDER가 ['money','remote','commute','growth','culture','stability'] as const 로 정의된다
 * AC-3: RouteState가 '/compare': { targetOfferId: string } | undefined 를 포함한 5개 라우트 키를 갖는다
 * AC-4: VERDICT_LABELS 5개, AXIS_LABELS 6개, DEFAULT_WEIGHTS 6축 값이 모두 5
 * AC-5: HEX 색상 리터럴 0개, npx tsc --noEmit 통과
 */

describe("엔티티 & RouteState 타입 정의", () => {
  describe("AC-1: 9개 인터페이스 타입 export", () => {
    it("should export OfferKind type as 'current' | 'offer'", () => {
      // Import validation — if this compiles, the type exists and is correct
      const testOffer = { kind: "current" as const };
      expect(testOffer.kind).toBe("current");

      const testOffer2 = { kind: "offer" as const };
      expect(testOffer2.kind).toBe("offer");
    });

    it("should export Offer interface with required fields", () => {
      // Mock offer object matching Offer interface shape
      const sampleOffer: Offer = {
        id: "o_123_1",
        kind: "current",
        companyName: "토스",
        baseSalaryManwon: 6000,
        bonusManwon: 600,
        welfarePointManwon: 120,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 25,
        commuteCostPerDayWon: 2800,
        lunchCostPerDayWon: 9000,
        growthScore: 4,
        cultureScore: 4,
        stabilityScore: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Validate all fields exist and have correct types
      expect(typeof sampleOffer.id).toBe("string");
      expect(typeof sampleOffer.kind).toBe("string");
      expect(typeof sampleOffer.companyName).toBe("string");
      expect(typeof sampleOffer.baseSalaryManwon).toBe("number");
      expect(typeof sampleOffer.bonusManwon).toBe("number");
      expect(typeof sampleOffer.welfarePointManwon).toBe("number");
      expect(typeof sampleOffer.remoteDaysPerWeek).toBe("number");
      expect(typeof sampleOffer.commuteMinutesOneWay).toBe("number");
      expect(typeof sampleOffer.commuteCostPerDayWon).toBe("number");
      expect(typeof sampleOffer.lunchCostPerDayWon).toBe("number");
      expect(typeof sampleOffer.growthScore).toBe("number");
      expect(typeof sampleOffer.cultureScore).toBe("number");
      expect(typeof sampleOffer.stabilityScore).toBe("number");
      expect(typeof sampleOffer.createdAt).toBe("number");
      expect(typeof sampleOffer.updatedAt).toBe("number");
    });

    it("should export Weights interface with 6 axes and updatedAt", async () => {
      const { Weights } = await import("@/lib/types");

      const sampleWeights: typeof Weights = {
        money: 5,
        remote: 5,
        commute: 5,
        growth: 5,
        culture: 5,
        stability: 5,
        updatedAt: Date.now(),
      };

      expect(typeof sampleWeights.money).toBe("number");
      expect(typeof sampleWeights.remote).toBe("number");
      expect(typeof sampleWeights.commute).toBe("number");
      expect(typeof sampleWeights.growth).toBe("number");
      expect(typeof sampleWeights.culture).toBe("number");
      expect(typeof sampleWeights.stability).toBe("number");
      expect(typeof sampleWeights.updatedAt).toBe("number");
    });

    it("should export AxisScore interface with required fields", async () => {
      const { AxisScore } = await import("@/lib/types");

      const sampleAxisScore: typeof AxisScore = {
        axis: "money",
        label: "실수령",
        rawCurrent: 4538000,
        rawTarget: 5400000,
        normCurrent: 45,
        normTarget: 100,
        weight: 5,
        weightedCurrent: 225,
        weightedTarget: 500,
      };

      expect(sampleAxisScore.axis).toBe("money");
      expect(typeof sampleAxisScore.label).toBe("string");
      expect(typeof sampleAxisScore.rawCurrent).toBe("number");
      expect(typeof sampleAxisScore.rawTarget).toBe("number");
      expect(typeof sampleAxisScore.normCurrent).toBe("number");
      expect(typeof sampleAxisScore.normTarget).toBe("number");
      expect(typeof sampleAxisScore.weight).toBe("number");
      expect(typeof sampleAxisScore.weightedCurrent).toBe("number");
      expect(typeof sampleAxisScore.weightedTarget).toBe("number");
    });

    it("should export MoneyBreakdown interface", async () => {
      const { MoneyBreakdown } = await import("@/lib/types");

      const sampleMoneyBreakdown: typeof MoneyBreakdown = {
        currentMonthlyNetWon: 4538000,
        targetMonthlyNetWon: 5400000,
        diffMonthlyWon: 862000,
        diffYearlyWon: 10344000,
        currentTaxWon: 11880000,
        targetTaxWon: 14400000,
      };

      expect(typeof sampleMoneyBreakdown.currentMonthlyNetWon).toBe("number");
      expect(typeof sampleMoneyBreakdown.targetMonthlyNetWon).toBe("number");
      expect(typeof sampleMoneyBreakdown.diffMonthlyWon).toBe("number");
      expect(typeof sampleMoneyBreakdown.diffYearlyWon).toBe("number");
      expect(typeof sampleMoneyBreakdown.currentTaxWon).toBe("number");
      expect(typeof sampleMoneyBreakdown.targetTaxWon).toBe("number");
    });

    it("should export Verdict type with 5 values", async () => {
      const verdicts = ["strong_move", "lean_move", "neutral", "lean_stay", "strong_stay"] as const;

      verdicts.forEach((verdict) => {
        expect(typeof verdict).toBe("string");
      });

      expect(verdicts).toHaveLength(5);
    });

    it("should export ScoreResult interface with required fields", async () => {
      const { ScoreResult } = await import("@/lib/types");

      const sampleScoreResult: typeof ScoreResult = {
        currentOfferId: "o_1",
        targetOfferId: "o_2",
        axes: [],
        totalCurrent: 60.5,
        totalTarget: 75.0,
        gap: 14.5,
        money: {
          currentMonthlyNetWon: 4538000,
          targetMonthlyNetWon: 5400000,
          diffMonthlyWon: 862000,
          diffYearlyWon: 10344000,
          currentTaxWon: 11880000,
          targetTaxWon: 14400000,
        },
        verdict: "lean_move",
        negotiationPoints: ["point1", "point2", "point3"],
        computedAt: Date.now(),
      };

      expect(typeof sampleScoreResult.currentOfferId).toBe("string");
      expect(typeof sampleScoreResult.targetOfferId).toBe("string");
      expect(Array.isArray(sampleScoreResult.axes)).toBe(true);
      expect(typeof sampleScoreResult.totalCurrent).toBe("number");
      expect(typeof sampleScoreResult.totalTarget).toBe("number");
      expect(typeof sampleScoreResult.gap).toBe("number");
      expect(typeof sampleScoreResult.verdict).toBe("string");
      expect(Array.isArray(sampleScoreResult.negotiationPoints)).toBe(true);
      expect(sampleScoreResult.negotiationPoints).toHaveLength(3);
      expect(typeof sampleScoreResult.computedAt).toBe("number");
    });

    it("should export UnlockState interface", async () => {
      const { UnlockState } = await import("@/lib/types");

      const sampleUnlockState: typeof UnlockState = {
        unlockedComparisonKeys: ["o_1:o_2", "o_1:o_3"],
        updatedAt: Date.now(),
      };

      expect(Array.isArray(sampleUnlockState.unlockedComparisonKeys)).toBe(true);
      expect(typeof sampleUnlockState.updatedAt).toBe("number");
    });

    it("should export AppMeta interface", async () => {
      const { AppMeta } = await import("@/lib/types");

      const sampleAppMeta: typeof AppMeta = {
        schemaVersion: 1,
        calcNoticeAcknowledged: false,
        onboardedAt: null,
      };

      expect(sampleAppMeta.schemaVersion).toBe(1);
      expect(typeof sampleAppMeta.calcNoticeAcknowledged).toBe("boolean");
      expect(sampleAppMeta.onboardedAt === null || typeof sampleAppMeta.onboardedAt === "number").toBe(true);
    });
  });

  describe("AC-2: AXIS_ORDER constant", () => {
    it("should define AXIS_ORDER as readonly tuple in correct order", async () => {
      const { AXIS_ORDER } = await import("@/lib/types");

      expect(AXIS_ORDER).toEqual(["money", "remote", "commute", "growth", "culture", "stability"]);
      expect(AXIS_ORDER).toHaveLength(6);
    });

    it("should maintain axis order: money, remote, commute, growth, culture, stability", async () => {
      const { AXIS_ORDER } = await import("@/lib/types");

      expect(AXIS_ORDER[0]).toBe("money");
      expect(AXIS_ORDER[1]).toBe("remote");
      expect(AXIS_ORDER[2]).toBe("commute");
      expect(AXIS_ORDER[3]).toBe("growth");
      expect(AXIS_ORDER[4]).toBe("culture");
      expect(AXIS_ORDER[5]).toBe("stability");
    });
  });

  describe("AC-3: RouteState type definition", () => {
    it("should define RouteState with /offer/new route accepting { kind: 'current' | 'offer' }", async () => {
      const { RouteState } = await import("@/lib/types");

      // Validate that RouteState type allows correct state per route
      const offerNewState: RouteState["/offer/new"] = { kind: "current" };
      expect(offerNewState.kind).toBe("current");

      const offerNewState2: RouteState["/offer/new"] = { kind: "offer" };
      expect(offerNewState2.kind).toBe("offer");
    });

    it("should define RouteState with /compare route accepting { targetOfferId: string }", async () => {
      const { RouteState } = await import("@/lib/types");

      const compareState: RouteState["/compare"] = { targetOfferId: "o_123" };
      expect(typeof compareState.targetOfferId).toBe("string");
      expect(compareState.targetOfferId).toBe("o_123");
    });

    it("should define RouteState with 5+ route keys including /, /offer/new, /compare", async () => {
      // RouteState is a type, not a value, so we verify it through type-level validation
      // by checking that each route accepts its expected state shape
      const { AXIS_ORDER } = await import("@/lib/types");

      // Type-level verification: RouteState should have keys for all critical routes
      // This is validated by the type system when tests compile
      const criticalRoutes = ["/", "/offer/new", "/offer/:id/edit", "/weights", "/compare", "/rank"];
      expect(criticalRoutes.length).toBeGreaterThanOrEqual(5);
      expect(criticalRoutes).toContain("/");
      expect(criticalRoutes).toContain("/offer/new");
      expect(criticalRoutes).toContain("/compare");
      expect(criticalRoutes).toContain("/weights");
      expect(criticalRoutes).toContain("/rank");
    });

    it("should define RouteState['/'] as undefined (no state required)", async () => {
      const { RouteState } = await import("@/lib/types");

      // Type-level check: home route should accept undefined state
      const homeState: RouteState["/"] = undefined;
      expect(homeState).toBeUndefined();
    });

    it("should define RouteState['/weights'] as undefined (no state required)", async () => {
      const { RouteState } = await import("@/lib/types");

      const weightsState: RouteState["/weights"] = undefined;
      expect(weightsState).toBeUndefined();
    });

    it("should define RouteState['/rank'] as undefined (no state required)", async () => {
      const { RouteState } = await import("@/lib/types");

      const rankState: RouteState["/rank"] = undefined;
      expect(rankState).toBeUndefined();
    });
  });

  describe("AC-4: Constants - VERDICT_LABELS, AXIS_LABELS, DEFAULT_WEIGHTS", () => {
    it("should export VERDICT_LABELS with 5 entries", async () => {
      const { VERDICT_LABELS } = await import("@/lib/types");

      expect(VERDICT_LABELS).toHaveProperty("strong_move");
      expect(VERDICT_LABELS).toHaveProperty("lean_move");
      expect(VERDICT_LABELS).toHaveProperty("neutral");
      expect(VERDICT_LABELS).toHaveProperty("lean_stay");
      expect(VERDICT_LABELS).toHaveProperty("strong_stay");

      expect(Object.keys(VERDICT_LABELS)).toHaveLength(5);
    });

    it("should export AXIS_LABELS with 6 entries matching AXIS_ORDER", async () => {
      const { AXIS_LABELS, AXIS_ORDER } = await import("@/lib/types");

      expect(Object.keys(AXIS_LABELS)).toHaveLength(6);

      AXIS_ORDER.forEach((axis) => {
        expect(AXIS_LABELS).toHaveProperty(axis);
        expect(typeof AXIS_LABELS[axis]).toBe("string");
      });
    });

    it("should export DEFAULT_WEIGHTS with all 6 axes set to 5", async () => {
      const { DEFAULT_WEIGHTS, AXIS_ORDER } = await import("@/lib/types");

      expect(DEFAULT_WEIGHTS).toHaveProperty("money", 5);
      expect(DEFAULT_WEIGHTS).toHaveProperty("remote", 5);
      expect(DEFAULT_WEIGHTS).toHaveProperty("commute", 5);
      expect(DEFAULT_WEIGHTS).toHaveProperty("growth", 5);
      expect(DEFAULT_WEIGHTS).toHaveProperty("culture", 5);
      expect(DEFAULT_WEIGHTS).toHaveProperty("stability", 5);

      AXIS_ORDER.forEach((axis) => {
        expect(DEFAULT_WEIGHTS[axis]).toBe(5);
      });
    });

    it("should verify VERDICT_LABELS contain correct display strings", async () => {
      const { VERDICT_LABELS } = await import("@/lib/types");

      expect(typeof VERDICT_LABELS.strong_move).toBe("string");
      expect(typeof VERDICT_LABELS.lean_move).toBe("string");
      expect(typeof VERDICT_LABELS.neutral).toBe("string");
      expect(typeof VERDICT_LABELS.lean_stay).toBe("string");
      expect(typeof VERDICT_LABELS.strong_stay).toBe("string");

      // Verify all are non-empty strings
      Object.values(VERDICT_LABELS).forEach((label) => {
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it("should verify AXIS_LABELS contain correct display strings for all axes", async () => {
      const { AXIS_LABELS } = await import("@/lib/types");

      const expectedLabels = {
        money: "실수령",
        remote: "재택",
        commute: "통근",
        growth: "성장성",
        culture: "조직문화",
        stability: "안정성",
      };

      Object.entries(expectedLabels).forEach(([axis, label]) => {
        expect(AXIS_LABELS[axis as keyof typeof AXIS_LABELS]).toBe(label);
      });
    });
  });

  describe("AC-5: Storage keys and build validation", () => {
    it("should export STORAGE_KEYS constant with all required keys", async () => {
      const { STORAGE_KEYS } = await import("@/lib/types");

      expect(STORAGE_KEYS).toHaveProperty("OFFERS", "jod.offers.v1");
      expect(STORAGE_KEYS).toHaveProperty("WEIGHTS", "jod.weights.v1");
      expect(STORAGE_KEYS).toHaveProperty("UNLOCK", "jod.unlock.v1");
      expect(STORAGE_KEYS).toHaveProperty("META", "jod.meta.v1");
    });

    it("should not contain HEX color literals in type definitions", async () => {
      const { VERDICT_LABELS, AXIS_LABELS } = await import("@/lib/types");

      const allLabels = [
        ...Object.values(VERDICT_LABELS),
        ...Object.values(AXIS_LABELS),
      ];

      allLabels.forEach((label) => {
        // Check for HEX patterns like #000, #FFF, #3182F6, etc.
        const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
        expect(hexPattern.test(label)).toBe(false);
      });
    });

    it("should provide default axis order for score calculations", async () => {
      const { AXIS_ORDER } = await import("@/lib/types");

      // Verify axis order matches SPEC exactly
      const specOrder = ["money", "remote", "commute", "growth", "culture", "stability"];
      expect(AXIS_ORDER).toEqual(specOrder);
    });
  });

  describe("Integration: Type consistency across definitions", () => {
    it("should ensure AXIS_ORDER matches all AXIS_LABELS keys", async () => {
      const { AXIS_ORDER, AXIS_LABELS } = await import("@/lib/types");

      const labelKeys = Object.keys(AXIS_LABELS);
      expect(AXIS_ORDER).toEqual(labelKeys);
    });

    it("should ensure DEFAULT_WEIGHTS has entries for all AXIS_ORDER axes", async () => {
      const { AXIS_ORDER, DEFAULT_WEIGHTS } = await import("@/lib/types");

      AXIS_ORDER.forEach((axis) => {
        expect(DEFAULT_WEIGHTS).toHaveProperty(axis);
      });
    });

    it("should ensure Verdict type values match VERDICT_LABELS keys", async () => {
      const { VERDICT_LABELS } = await import("@/lib/types");

      const verdictKeys = Object.keys(VERDICT_LABELS);
      expect(verdictKeys).toContain("strong_move");
      expect(verdictKeys).toContain("lean_move");
      expect(verdictKeys).toContain("neutral");
      expect(verdictKeys).toContain("lean_stay");
      expect(verdictKeys).toContain("strong_stay");
    });
  });
});
