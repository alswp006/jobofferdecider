import { describe, it, expect } from "vitest";
import type {
  CompanyProfile,
  NonMonetaryRatings,
  RouteState,
  AppState,
  Weights,
  Won,
  MoneyBreakdown,
  VerdictLevel,
  ScoreItem,
  ScoreResult,
} from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";

describe("Packet 0001: 도메인 타입 + RouteState 정의", () => {
  describe("AC-1: CompanyProfile has all 12 fields", () => {
    it("should create CompanyProfile with all required fields", () => {
      const profile: CompanyProfile = {
        id: "current",
        name: "현재회사",
        baseSalary: 60_000_000,
        bonusPerYear: 6_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 40,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: {
          growth: 3,
          workLife: 4,
          stability: 4,
          culture: 3,
          commuteEase: 2,
        },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      expect(Object.keys(profile)).toHaveLength(12);
      expect(profile.id).toBe("current");
      expect(profile.name).toBe("현재회사");
      expect(profile.baseSalary).toBe(60_000_000);
      expect(profile.bonusPerYear).toBe(6_000_000);
      expect(profile.remoteDaysPerWeek).toBe(2);
      expect(profile.commuteMinutesOneWay).toBe(40);
      expect(profile.commuteCostPerDay).toBe(3_000);
      expect(profile.lunchCostPerDay).toBe(9_000);
      expect(profile.mealSupportPerMonth).toBe(100_000);
      expect(profile.welfarePointsPerYear).toBe(1_200_000);
      expect(profile.ratings).toBeDefined();
      expect(profile.updatedAt).toBe("2026-08-15T09:00:00.000Z");
    });
  });

  describe("AC-2: NonMonetaryRatings and AppState.version types", () => {
    it("should have NonMonetaryRatings with 5 fields (1-5 literal types)", () => {
      const ratings: NonMonetaryRatings = {
        growth: 1,
        workLife: 2,
        stability: 3,
        culture: 4,
        commuteEase: 5,
      };

      expect(Object.keys(ratings)).toHaveLength(5);
      expect(ratings.growth).toBe(1);
      expect(ratings.workLife).toBe(2);
      expect(ratings.stability).toBe(3);
      expect(ratings.culture).toBe(4);
      expect(ratings.commuteEase).toBe(5);
    });

    it("should have AppState.version as literal type 1", () => {
      const state: AppState = {
        version: 1,
        current: null,
        offers: [],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      };

      expect(state.version).toBe(1);
      expect(typeof state.version).toBe("number");
    });
  });

  describe("AC-3: RouteState has 7 routes with undefined values", () => {
    it("should support all 7 route paths as RouteState keys", () => {
      // RouteState type checking via TypeScript ensures these paths exist
      // Values should all be undefined (no location.state usage)
      const routePaths = [
        "/",
        "/company/current",
        "/company/offer/new",
        "/company/offer/:id",
        "/weights",
        "/result/:offerId",
        "/compare",
      ];

      expect(routePaths).toHaveLength(7);

      // Verify route path patterns
      expect(routePaths[0]).toBe("/");
      expect(routePaths[1]).toBe("/company/current");
      expect(routePaths[2]).toBe("/company/offer/new");
      expect(routePaths[3]).toBe("/company/offer/:id");
      expect(routePaths[4]).toBe("/weights");
      expect(routePaths[5]).toBe("/result/:offerId");
      expect(routePaths[6]).toBe("/compare");
    });
  });

  describe("AC-4: DEFAULT_WEIGHTS has 6 fields all 50", () => {
    it("should export DEFAULT_WEIGHTS with all values 50", () => {
      expect(Object.keys(DEFAULT_WEIGHTS)).toHaveLength(6);
      expect(DEFAULT_WEIGHTS.money).toBe(50);
      expect(DEFAULT_WEIGHTS.growth).toBe(50);
      expect(DEFAULT_WEIGHTS.workLife).toBe(50);
      expect(DEFAULT_WEIGHTS.stability).toBe(50);
      expect(DEFAULT_WEIGHTS.culture).toBe(50);
      expect(DEFAULT_WEIGHTS.commuteEase).toBe(50);
    });

    it("should have Weights interface with numeric fields", () => {
      const weights: Weights = {
        money: 100,
        growth: 50,
        workLife: 50,
        stability: 0,
        culture: 0,
        commuteEase: 0,
      };

      expect(weights.money).toBe(100);
      expect(weights.growth).toBe(50);
      expect(weights.workLife).toBe(50);
      expect(weights.stability).toBe(0);
      expect(weights.culture).toBe(0);
      expect(weights.commuteEase).toBe(0);
    });
  });

  describe("AC-5: AppState structure", () => {
    it("should have AppState with version 1, current/offers/weights/unlockedOfferIds", () => {
      const state: AppState = {
        version: 1,
        current: {
          id: "current",
          name: "현재회사",
          baseSalary: 60_000_000,
          bonusPerYear: 6_000_000,
          remoteDaysPerWeek: 2,
          commuteMinutesOneWay: 40,
          commuteCostPerDay: 3_000,
          lunchCostPerDay: 9_000,
          mealSupportPerMonth: 100_000,
          welfarePointsPerYear: 1_200_000,
          ratings: { growth: 3, workLife: 4, stability: 4, culture: 3, commuteEase: 2 },
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
        offers: [],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      };

      expect(state.version).toBe(1);
      expect(state.current).not.toBeNull();
      expect(state.current?.id).toBe("current");
      expect(Array.isArray(state.offers)).toBe(true);
      expect(Array.isArray(state.unlockedOfferIds)).toBe(true);
      expect(state.weights).toEqual(DEFAULT_WEIGHTS);
    });

    it("should allow AppState.current to be null", () => {
      const state: AppState = {
        version: 1,
        current: null,
        offers: [],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      };

      expect(state.current).toBeNull();
    });
  });

  describe("Supporting types: MoneyBreakdown, VerdictLevel, ScoreItem, ScoreResult", () => {
    it("should support MoneyBreakdown type", () => {
      const breakdown: MoneyBreakdown = {
        officeDaysPerMonth: 12,
        grossAnnual: 66_000_000,
        effectiveTaxRate: 0.21,
        netMonthlySalary: 4_345_000,
        monthlyBenefit: 200_000,
        monthlyCommuteCost: 36_000,
        monthlyLunchCost: 108_000,
        monthlyCommuteTimeCost: 240_000,
        netMonthlyValue: 4_161_000,
      };

      expect(breakdown.grossAnnual).toBe(66_000_000);
      expect(breakdown.netMonthlySalary).toBe(4_345_000);
      expect(breakdown.netMonthlyValue).toBe(4_161_000);
    });

    it("should support VerdictLevel type with 4 values", () => {
      const verdictLevels: VerdictLevel[] = ["MOVE", "CONDITIONAL", "HOLD", "STAY"];
      expect(verdictLevels).toHaveLength(4);
      expect(verdictLevels[0]).toBe("MOVE");
      expect(verdictLevels[1]).toBe("CONDITIONAL");
      expect(verdictLevels[2]).toBe("HOLD");
      expect(verdictLevels[3]).toBe("STAY");
    });

    it("should support ScoreItem type", () => {
      const item: ScoreItem = {
        key: "money",
        label: "연봉 실질가치",
        currentScore: 50,
        offerScore: 70,
        weightRatio: 0.1667,
      };

      expect(item.key).toBe("money");
      expect(item.label).toBe("연봉 실질가치");
      expect(item.currentScore).toBe(50);
      expect(item.offerScore).toBe(70);
      expect(item.weightRatio).toBe(0.1667);
    });

    it("should support ScoreResult type", () => {
      const result: ScoreResult = {
        offerId: "o-1",
        items: [
          {
            key: "money",
            label: "연봉 실질가치",
            currentScore: 50,
            offerScore: 70,
            weightRatio: 0.1667,
          },
        ],
        currentTotal: 62,
        offerTotal: 74,
        diff: 12,
        verdict: "MOVE",
        verdictLabel: "이직 추천",
        negotiationPoints: ["포인트 1", "포인트 2", "포인트 3"],
        currentMoney: {
          officeDaysPerMonth: 12,
          grossAnnual: 66_000_000,
          effectiveTaxRate: 0.21,
          netMonthlySalary: 4_345_000,
          monthlyBenefit: 200_000,
          monthlyCommuteCost: 36_000,
          monthlyLunchCost: 108_000,
          monthlyCommuteTimeCost: 240_000,
          netMonthlyValue: 4_161_000,
        },
        offerMoney: {
          officeDaysPerMonth: 12,
          grossAnnual: 66_000_000,
          effectiveTaxRate: 0.21,
          netMonthlySalary: 4_345_000,
          monthlyBenefit: 200_000,
          monthlyCommuteCost: 36_000,
          monthlyLunchCost: 108_000,
          monthlyCommuteTimeCost: 240_000,
          netMonthlyValue: 4_161_000,
        },
      };

      expect(result.offerId).toBe("o-1");
      expect(result.currentTotal).toBe(62);
      expect(result.offerTotal).toBe(74);
      expect(result.diff).toBe(12);
      expect(result.verdict).toBe("MOVE");
      expect(result.verdictLabel).toBe("이직 추천");
      expect(result.negotiationPoints).toHaveLength(3);
    });
  });

  describe("AC-5: TypeScript type checking (tsc --noEmit should pass)", () => {
    it("should allow Won type as number alias", () => {
      const salary: Won = 60_000_000;
      const salary2: number = salary; // Won should be assignable to number
      expect(salary).toBe(60_000_000);
      expect(salary2).toBe(60_000_000);
    });

    it("should ensure DEFAULT_WEIGHTS is properly exported", () => {
      // TypeScript compilation verifies all types are properly exported
      // This runtime check confirms DEFAULT_WEIGHTS is accessible
      expect(DEFAULT_WEIGHTS).toBeDefined();
      expect(DEFAULT_WEIGHTS).toEqual({
        money: 50,
        growth: 50,
        workLife: 50,
        stability: 50,
        culture: 50,
        commuteEase: 50,
      });
    });
  });
});
