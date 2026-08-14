import { describe, it, expect, beforeEach } from "vitest";
import type { CompanyProfile, Weights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { normalizeWeights, calcScore } from "@/lib/score";

describe("packet-heal-1-02: score.ts (normalizeWeights/calcScore)", () => {
  let mockCurrent: CompanyProfile;
  let mockOffer: CompanyProfile;

  beforeEach(() => {
    // 기본 현재 직장 프로필
    mockCurrent = {
      id: "current",
      name: "현재 회사",
      baseSalary: 48_000_000,
      bonusPerYear: 0,
      remoteDaysPerWeek: 2,
      commuteMinutesOneWay: 30,
      commuteCostPerDay: 5_000,
      lunchCostPerDay: 8_000,
      mealSupportPerMonth: 150_000,
      welfarePointsPerYear: 3_600_000,
      ratings: {
        growth: 3,
        workLife: 3,
        stability: 4,
        culture: 3,
        commuteEase: 2,
      },
      updatedAt: new Date().toISOString(),
    };

    // 기본 제안 직장 프로필
    mockOffer = {
      id: "offer-1",
      name: "제안 회사",
      baseSalary: 52_800_000,
      bonusPerYear: 0,
      remoteDaysPerWeek: 3,
      commuteMinutesOneWay: 20,
      commuteCostPerDay: 3_000,
      lunchCostPerDay: 7_000,
      mealSupportPerMonth: 200_000,
      welfarePointsPerYear: 4_800_000,
      ratings: {
        growth: 4,
        workLife: 4,
        stability: 4,
        culture: 4,
        commuteEase: 3,
      },
      updatedAt: new Date().toISOString(),
    };
  });

  describe("normalizeWeights", () => {
    // AC-1: 일반 가중치 케이스
    it("AC-1[P0]: should normalize weights to 1.0 and return 6 items with correct ratio sum", () => {
      const weights: Weights = {
        money: 100,
        growth: 50,
        workLife: 50,
        stability: 0,
        culture: 0,
        commuteEase: 0,
      };

      const result = normalizeWeights(weights);

      // 6개 키 모두 존재
      expect(Object.keys(result).length).toBe(6);
      expect(result).toHaveProperty("money");
      expect(result).toHaveProperty("growth");
      expect(result).toHaveProperty("workLife");
      expect(result).toHaveProperty("stability");
      expect(result).toHaveProperty("culture");
      expect(result).toHaveProperty("commuteEase");

      // 합이 1.0 (소수 4자리 기준)
      const sum = Object.values(result).reduce((acc, v) => acc + v, 0);
      expect(sum).toBeCloseTo(1.0, 4);

      // 각 값이 소수 4자리 이하
      Object.values(result).forEach((ratio) => {
        const decimalPlaces = (ratio.toString().split(".")[1] || "").length;
        expect(decimalPlaces).toBeLessThanOrEqual(4);
      });
    });

    // AC-2: 모두 0인 경우 DEFAULT_WEIGHTS 사용
    it("AC-2[P0]: should use DEFAULT_WEIGHTS when all weights are 0, each ratio ≈ 0.1667", () => {
      const zeroWeights: Weights = {
        money: 0,
        growth: 0,
        workLife: 0,
        stability: 0,
        culture: 0,
        commuteEase: 0,
      };

      const result = normalizeWeights(zeroWeights);

      // DEFAULT_WEIGHTS는 각각 50이므로 6개 항목 각각 50/300 = 1/6 ≈ 0.1667
      Object.values(result).forEach((ratio) => {
        expect(ratio).toBeCloseTo(1 / 6, 4);
      });
    });

    // 정규화 공식 검증
    it("should calculate correct ratios: money/sum weight", () => {
      const weights: Weights = {
        money: 200,
        growth: 100,
        workLife: 100,
        stability: 100,
        culture: 100,
        commuteEase: 100,
      };
      // 합: 700, money의 기대값: 200/700 ≈ 0.2857

      const result = normalizeWeights(weights);
      expect(result.money).toBeCloseTo(200 / 700, 4);
      expect(result.growth).toBeCloseTo(100 / 700, 4);
    });
  });

  describe("calcScore", () => {
    // AC-3: money 점수 계산 검증
    it("AC-3[P0]: should calculate money item scores: currentScore=50, offerScore based on net salary diff", () => {
      // currentNet = (48M + 0) / 12 = 4,000,000
      // offerNet = (52.8M + 0) / 12 = 4,400,000
      // offerScore = clamp(round(50 + (4.4M - 4M) / 4M * 200), 0, 100)
      //            = clamp(round(50 + 0.1 * 200), 0, 100)
      //            = clamp(round(50 + 20), 0, 100)
      //            = clamp(70, 0, 100) = 70

      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        const moneyItem = result.items[0];
        expect(moneyItem.key).toBe("money");
        expect(moneyItem.currentScore).toBe(50);
        expect(moneyItem.offerScore).toBe(70);
      }
    });

    // AC-4: clamp 동작 (상한/하한)
    it("AC-4[P0]: should clamp offerScore to [0, 100] when salary diff is extreme", () => {
      const weights: Weights = DEFAULT_WEIGHTS;

      // Case 1: offerNet이 10배인 경우 (상한 테스트)
      const tenXOffer: CompanyProfile = {
        ...mockOffer,
        baseSalary: 480_000_000, // 10배
        bonusPerYear: 0,
      };
      const resultHighSalary = calcScore(mockCurrent, tenXOffer, weights);
      expect(resultHighSalary).not.toBeNull();
      if (resultHighSalary) {
        const moneyItem = resultHighSalary.items[0];
        expect(moneyItem.offerScore).toBeLessThanOrEqual(100);
        expect(moneyItem.offerScore).toBeGreaterThanOrEqual(0);
      }

      // Case 2: offerNet이 1/10인 경우 (하한 테스트)
      const tenthOffer: CompanyProfile = {
        ...mockOffer,
        baseSalary: 4_800_000, // 1/10
        bonusPerYear: 0,
      };
      const resultLowSalary = calcScore(mockCurrent, tenthOffer, weights);
      expect(resultLowSalary).not.toBeNull();
      if (resultLowSalary) {
        const moneyItem = resultLowSalary.items[0];
        expect(moneyItem.offerScore).toBeLessThanOrEqual(100);
        expect(moneyItem.offerScore).toBeGreaterThanOrEqual(0);
      }
    });

    // AC-4: 총점이 0~100 정수
    it("AC-4[P0]: should return currentTotal and offerTotal as integers in [0, 100]", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        expect(Number.isInteger(result.currentTotal)).toBe(true);
        expect(Number.isInteger(result.offerTotal)).toBe(true);
        expect(result.currentTotal).toBeGreaterThanOrEqual(0);
        expect(result.currentTotal).toBeLessThanOrEqual(100);
        expect(result.offerTotal).toBeGreaterThanOrEqual(0);
        expect(result.offerTotal).toBeLessThanOrEqual(100);
      }
    });

    // AC-3 추가: null 반환 케이스 (currentNet <= 0 방어)
    it("should return null when current is null", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(null, mockOffer, weights);
      expect(result).toBeNull();
    });

    // AC-4 추가: diff 정확성
    it("should calculate diff correctly: offerTotal - currentTotal", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.diff).toBe(result.offerTotal - result.currentTotal);
      }
    });

    // AC-1 추가: items 구조 검증
    it("should return exactly 6 items in SCORE_LABELS order", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.items.length).toBe(6);

        // 순서: money, growth, workLife, stability, culture, commuteEase
        const keys = result.items.map((item) => item.key);
        expect(keys).toEqual([
          "money",
          "growth",
          "workLife",
          "stability",
          "culture",
          "commuteEase",
        ]);

        // 각 item이 ScoreItem 구조
        result.items.forEach((item) => {
          expect(item).toHaveProperty("key");
          expect(item).toHaveProperty("label");
          expect(item).toHaveProperty("currentScore");
          expect(item).toHaveProperty("offerScore");
          expect(item).toHaveProperty("weightRatio");
        });
      }
    });

    // 비금전 항목 점수 계산 검증 (rating * 20)
    it("should calculate non-monetary scores: rating * 20", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        // growth: current rating 3, offer rating 4
        const growthItem = result.items.find((item) => item.key === "growth");
        expect(growthItem?.currentScore).toBe(3 * 20); // 60
        expect(growthItem?.offerScore).toBe(4 * 20); // 80
      }
    });

    // AC-5: 통합 타입 검증 (getVerdict와 호환성)
    it("AC-5[P0]: should return ScoreResult with all required fields for getVerdict compatibility", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        // ScoreResult 필수 필드 검증
        expect(result).toHaveProperty("offerId", mockOffer.id);
        expect(result).toHaveProperty("items");
        expect(result).toHaveProperty("currentTotal");
        expect(result).toHaveProperty("offerTotal");
        expect(result).toHaveProperty("diff");
        expect(result).toHaveProperty("verdict");
        expect(result).toHaveProperty("verdictLabel");
        expect(result).toHaveProperty("negotiationPoints");
        expect(result).toHaveProperty("currentMoney");
        expect(result).toHaveProperty("offerMoney");

        // verdict는 초기값 (getVerdict에서 채워짐)
        expect(result.verdict).toBe("HOLD");
        expect(result.verdictLabel).toBe("");
        expect(Array.isArray(result.negotiationPoints)).toBe(true);
      }
    });

    // 가중치 분배 정확성 검증
    it("should apply weightRatio correctly in total score calculation", () => {
      const weights: Weights = {
        money: 100,
        growth: 50,
        workLife: 50,
        stability: 0,
        culture: 0,
        commuteEase: 0,
      };
      const result = calcScore(mockCurrent, mockOffer, weights);

      expect(result).not.toBeNull();
      if (result) {
        // 각 항목의 weightRatio가 정규화됨
        const weightRatioSum = result.items.reduce((sum, item) => sum + item.weightRatio, 0);
        expect(weightRatioSum).toBeCloseTo(1.0, 4);

        // currentTotal = sum(currentScore * weightRatio)
        const expectedCurrentTotal = Math.round(
          result.items.reduce((sum, item) => sum + item.currentScore * item.weightRatio, 0)
        );
        expect(result.currentTotal).toBe(expectedCurrentTotal);
      }
    });
  });

  describe("Integration: getVerdict and Result component compatibility", () => {
    // AC-5: 기존 코드와 호환성 테스트
    it("AC-5[P0]: calcScore result should be compatible with getVerdict() and Result component", () => {
      const weights: Weights = DEFAULT_WEIGHTS;
      const scoreResult = calcScore(mockCurrent, mockOffer, weights);

      expect(scoreResult).not.toBeNull();
      if (scoreResult) {
        // getVerdict에서 기대하는 필드가 모두 존재
        expect(typeof scoreResult.diff).toBe("number");
        expect(Array.isArray(scoreResult.items)).toBe(true);
        scoreResult.items.forEach((item) => {
          expect(typeof item.currentScore).toBe("number");
          expect(typeof item.offerScore).toBe("number");
          expect(typeof item.key).toBe("string");
        });

        // Result.tsx에서 기대하는 필드
        expect(typeof scoreResult.offerId).toBe("string");
        expect(scoreResult.offerId).toBe(mockOffer.id);
      }
    });
  });
});
