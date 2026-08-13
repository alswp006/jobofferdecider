import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Offer, Weights, SaveResult } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";

/**
 * Packet 0002: localStorage CRUD 헬퍼
 *
 * AC-1: loadOffers()가 키 없음/"{not-json" 저장 시 [] 반환, throw 0건
 * AC-2: saveOffer()가 kind==='current' 시 기존 id·createdAt 유지하고 배열 내 current 1건 유지
 * AC-3: offer 3건 존재 시 4번째 저장은 제안 직장 3개 제한 에러 반환
 * AC-4: setItem이 QuotaExceededError를 던지면 저장 공간 부족 에러 반환, 예외 전파 없음
 * AC-5: saveWeights()가 6축 합 0이면 중요도 설정 에러 반환
 */

describe("localStorage CRUD 헬퍼", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC-1: loadOffers() returns [] when key missing or invalid JSON
  // ============================================================================
  describe("AC-1: loadOffers() - missing key or invalid JSON", () => {
    it("should return empty array when key is not set", async () => {
      const { loadOffers } = await import("@/lib/storage");

      const result = loadOffers();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should return empty array when stored value is invalid JSON", async () => {
      const { loadOffers } = await import("@/lib/storage");

      localStorage.setItem(STORAGE_KEYS.OFFERS, "{not-json");

      const result = loadOffers();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should return empty array when stored value is null string", async () => {
      const { loadOffers } = await import("@/lib/storage");

      localStorage.setItem(STORAGE_KEYS.OFFERS, "null");

      const result = loadOffers();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should not throw when parsing malformed JSON", async () => {
      const { loadOffers } = await import("@/lib/storage");

      localStorage.setItem(STORAGE_KEYS.OFFERS, "{]malformed[");

      expect(() => {
        loadOffers();
      }).not.toThrow();
    });

    it("should load valid offer array correctly", async () => {
      const { loadOffers } = await import("@/lib/storage");

      const sampleOffers: Offer[] = [
        {
          id: "o_1_1",
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
          createdAt: 1000000,
          updatedAt: 1000000,
        },
      ];

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(sampleOffers));

      const result = loadOffers();

      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe("토스");
      expect(result[0].id).toBe("o_1_1");
    });
  });

  // ============================================================================
  // AC-2: saveOffer() - maintain id/createdAt for current, keep only 1 current
  // ============================================================================
  describe("AC-2: saveOffer() - current kind preserves id/createdAt, singleton current", () => {
    it("should preserve existing id and createdAt when saving current kind offer", async () => {
      const { saveOffer, loadOffers } = await import("@/lib/storage");

      const originalOffer: Offer = {
        id: "o_preserved_id",
        kind: "current",
        companyName: "원래회사",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 8000,
        growthScore: 3,
        cultureScore: 3,
        stabilityScore: 4,
        createdAt: 999999,
        updatedAt: 999999,
      };

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify([originalOffer]));

      const updatedOffer: Offer = {
        ...originalOffer,
        baseSalaryManwon: 6000, // Changed
        updatedAt: Date.now(),
      };

      const result = saveOffer(updatedOffer);

      expect(result.ok).toBe(true);

      const loaded = loadOffers();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("o_preserved_id"); // ID preserved
      expect(loaded[0].createdAt).toBe(999999); // createdAt preserved
      expect(loaded[0].baseSalaryManwon).toBe(6000); // Updated field
    });

    it("should generate new id with o_${timestamp}_${counter} format for offer kind", async () => {
      const { saveOffer, loadOffers } = await import("@/lib/storage");

      const newOffer: Offer = {
        id: "", // Will be generated (or ignored)
        kind: "offer",
        companyName: "새회사",
        baseSalaryManwon: 7000,
        bonusManwon: 700,
        welfarePointManwon: 140,
        remoteDaysPerWeek: 3,
        commuteMinutesOneWay: 15,
        commuteCostPerDayWon: 2000,
        lunchCostPerDayWon: 10000,
        growthScore: 5,
        cultureScore: 5,
        stabilityScore: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = saveOffer(newOffer);

      expect(result.ok).toBe(true);

      const loaded = loadOffers();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toMatch(/^o_\d+_\d+$/); // Format: o_timestamp_counter
    });

    it("should remove previous current offer when saving new current offer", async () => {
      const { saveOffer, loadOffers } = await import("@/lib/storage");

      const currentOffer: Offer = {
        id: "o_current_1",
        kind: "current",
        companyName: "이전 회사",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 8000,
        growthScore: 3,
        cultureScore: 3,
        stabilityScore: 4,
        createdAt: 999999,
        updatedAt: 999999,
      };

      const newCurrentOffer: Offer = {
        id: "o_current_2",
        kind: "current",
        companyName: "새 현재 회사",
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

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify([currentOffer]));

      const result = saveOffer(newCurrentOffer);

      expect(result.ok).toBe(true);

      const loaded = loadOffers();
      // Should have 1 current offer and no old one
      expect(loaded).toHaveLength(1);
      expect(loaded[0].kind).toBe("current");
      expect(loaded[0].companyName).toBe("새 현재 회사");
    });

    it("should maintain offer kind offers when adding new current", async () => {
      const { saveOffer, loadOffers } = await import("@/lib/storage");

      const existingOffers: Offer[] = [
        {
          id: "o_1",
          kind: "offer",
          companyName: "회사1",
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
          createdAt: 1000000,
          updatedAt: 1000000,
        },
        {
          id: "o_2",
          kind: "offer",
          companyName: "회사2",
          baseSalaryManwon: 6500,
          bonusManwon: 650,
          welfarePointManwon: 130,
          remoteDaysPerWeek: 3,
          commuteMinutesOneWay: 20,
          commuteCostPerDayWon: 2500,
          lunchCostPerDayWon: 9500,
          growthScore: 4,
          cultureScore: 4,
          stabilityScore: 3,
          createdAt: 1000001,
          updatedAt: 1000001,
        },
      ];

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(existingOffers));

      const newCurrentOffer: Offer = {
        id: "o_current",
        kind: "current",
        companyName: "현재회사",
        baseSalaryManwon: 5500,
        bonusManwon: 550,
        welfarePointManwon: 110,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 35,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 8500,
        growthScore: 3,
        cultureScore: 3,
        stabilityScore: 4,
        createdAt: 1000002,
        updatedAt: 1000002,
      };

      const result = saveOffer(newCurrentOffer);

      expect(result.ok).toBe(true);

      const loaded = loadOffers();
      expect(loaded).toHaveLength(3); // 2 offer + 1 current
      expect(loaded.filter((o: Offer) => o.kind === "current")).toHaveLength(1);
      expect(loaded.filter((o: Offer) => o.kind === "offer")).toHaveLength(2);
    });
  });

  // ============================================================================
  // AC-3: saveOffer() - max 3 offers
  // ============================================================================
  describe("AC-3: saveOffer() - max 3 offers limit", () => {
    it("should return error when saving 4th offer", async () => {
      const { saveOffer } = await import("@/lib/storage");

      const offers: Offer[] = Array.from({ length: 3 }, (_, i) => ({
        id: `o_existing_${i}`,
        kind: "offer" as const,
        companyName: `회사${i}`,
        baseSalaryManwon: 6000 + i * 100,
        bonusManwon: 600 + i * 10,
        welfarePointManwon: 120 + i * 2,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 25,
        commuteCostPerDayWon: 2800,
        lunchCostPerDayWon: 9000,
        growthScore: 4,
        cultureScore: 4,
        stabilityScore: 3,
        createdAt: 1000000 + i,
        updatedAt: 1000000 + i,
      }));

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(offers));

      const fourthOffer: Offer = {
        id: "o_4",
        kind: "offer",
        companyName: "회사4",
        baseSalaryManwon: 6300,
        bonusManwon: 630,
        welfarePointManwon: 126,
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

      const result = saveOffer(fourthOffer);

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toBeTruthy();
      if (!result.ok) {
        expect(result.error).toContain("제안 직장");
        expect(result.error).toContain("최대 3개");
      }
    });

    it("should allow saving offer when count is less than 3", async () => {
      const { saveOffer, loadOffers } = await import("@/lib/storage");

      const offers: Offer[] = Array.from({ length: 2 }, (_, i) => ({
        id: `o_existing_${i}`,
        kind: "offer" as const,
        companyName: `회사${i}`,
        baseSalaryManwon: 6000 + i * 100,
        bonusManwon: 600 + i * 10,
        welfarePointManwon: 120 + i * 2,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 25,
        commuteCostPerDayWon: 2800,
        lunchCostPerDayWon: 9000,
        growthScore: 4,
        cultureScore: 4,
        stabilityScore: 3,
        createdAt: 1000000 + i,
        updatedAt: 1000000 + i,
      }));

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(offers));

      const thirdOffer: Offer = {
        id: "o_3",
        kind: "offer",
        companyName: "회사3",
        baseSalaryManwon: 6200,
        bonusManwon: 620,
        welfarePointManwon: 124,
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

      const result = saveOffer(thirdOffer);

      expect(result.ok).toBe(true);
      expect(loadOffers()).toHaveLength(3);
    });

    it("should allow updating existing offer even when at 3 limit", async () => {
      const { saveOffer, loadOffers } = await import("@/lib/storage");

      const offers: Offer[] = Array.from({ length: 3 }, (_, i) => ({
        id: `o_existing_${i}`,
        kind: "offer" as const,
        companyName: `회사${i}`,
        baseSalaryManwon: 6000 + i * 100,
        bonusManwon: 600 + i * 10,
        welfarePointManwon: 120 + i * 2,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 25,
        commuteCostPerDayWon: 2800,
        lunchCostPerDayWon: 9000,
        growthScore: 4,
        cultureScore: 4,
        stabilityScore: 3,
        createdAt: 1000000 + i,
        updatedAt: 1000000 + i,
      }));

      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(offers));

      const updatedOffer = { ...offers[0], baseSalaryManwon: 7000 };

      const result = saveOffer(updatedOffer);

      expect(result.ok).toBe(true);
      expect(loadOffers()).toHaveLength(3);
      expect(loadOffers()[0].baseSalaryManwon).toBe(7000);
    });
  });

  // ============================================================================
  // AC-4: saveOffer() - QuotaExceededError handling
  // ============================================================================
  describe("AC-4: saveOffer() - QuotaExceededError -> storage error", () => {
    it("should catch QuotaExceededError and return storage error message", async () => {
      const { saveOffer } = await import("@/lib/storage");

      const originalSetItem = Storage.prototype.setItem;
      try {
        Storage.prototype.setItem = vi.fn(() => {
          const error = new Error("QuotaExceededError");
          (error as any).code = 22; // QuotaExceededError code
          throw error;
        });

        const offer: Offer = {
          id: "o_test",
          kind: "offer",
          companyName: "테스트",
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

        const result = saveOffer(offer);

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.error).toBeTruthy();
        if (!result.ok) {
          expect(result.error).toContain("저장 공간");
        }
      } finally {
        Storage.prototype.setItem = originalSetItem;
      }
    });

    it("should not re-throw QuotaExceededError", async () => {
      const { saveOffer } = await import("@/lib/storage");

      const originalSetItem = Storage.prototype.setItem;
      try {
        Storage.prototype.setItem = vi.fn(() => {
          const error = new Error("QuotaExceededError");
          (error as any).code = 22; // QuotaExceededError code
          throw error;
        });

        const offer: Offer = {
          id: "o_test",
          kind: "offer",
          companyName: "테스트",
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

        expect(() => {
          saveOffer(offer);
        }).not.toThrow();
      } finally {
        Storage.prototype.setItem = originalSetItem;
      }
    });
  });

  // ============================================================================
  // AC-5: saveWeights() - 6-axis sum must be > 0
  // ============================================================================
  describe("AC-5: saveWeights() - axis weight sum validation", () => {
    it("should return error when all 6 axes have weight 0", async () => {
      const { saveWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: Date.now(),
      };

      const result = saveWeights(weights);

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toBeTruthy();
      if (!result.ok) {
        expect(result.error).toContain("중요도");
        expect(result.error).toContain("최소 1개");
      }
    });

    it("should allow saving when at least one axis has weight > 0", async () => {
      const { saveWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 1,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: Date.now(),
      };

      const result = saveWeights(weights);

      expect(result.ok).toBe(true);
    });

    it("should allow saving when multiple axes have weights", async () => {
      const { saveWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 5,
        remote: 3,
        commute: 2,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: Date.now(),
      };

      const result = saveWeights(weights);

      expect(result.ok).toBe(true);
    });

    it("should store weights correctly when valid", async () => {
      const { saveWeights, loadWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 5,
        remote: 4,
        commute: 3,
        growth: 2,
        culture: 1,
        stability: 1,
        updatedAt: Date.now(),
      };

      const result = saveWeights(weights);

      expect(result.ok).toBe(true);

      const loaded = loadWeights();
      expect(loaded).not.toBeNull();
      if (loaded) {
        expect(loaded.money).toBe(5);
        expect(loaded.remote).toBe(4);
        expect(loaded.commute).toBe(3);
        expect(loaded.growth).toBe(2);
        expect(loaded.culture).toBe(1);
        expect(loaded.stability).toBe(1);
      }
    });

    it("should not throw when saving weights with all zeros", async () => {
      const { saveWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: Date.now(),
      };

      expect(() => {
        saveWeights(weights);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Additional: loadWeights() helper
  // ============================================================================
  describe("loadWeights() helper", () => {
    it("should return null when key is not set", async () => {
      const { loadWeights } = await import("@/lib/storage");

      const result = loadWeights();

      expect(result).toBeNull();
    });

    it("should return null when stored value is invalid JSON", async () => {
      const { loadWeights } = await import("@/lib/storage");

      localStorage.setItem(STORAGE_KEYS.WEIGHTS, "{invalid");

      const result = loadWeights();

      expect(result).toBeNull();
    });

    it("should load valid weights correctly", async () => {
      const { loadWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 5,
        remote: 4,
        commute: 3,
        growth: 2,
        culture: 1,
        stability: 1,
        updatedAt: 1000000,
      };

      localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));

      const result = loadWeights();

      expect(result).not.toBeNull();
      if (result) {
        expect(result.money).toBe(5);
        expect(result.remote).toBe(4);
      }
    });
  });

  // ============================================================================
  // Type validation: SaveResult
  // ============================================================================
  describe("SaveResult type validation", () => {
    it("should return SaveResult with ok: true", async () => {
      const { saveWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 5,
        remote: 5,
        commute: 5,
        growth: 5,
        culture: 5,
        stability: 5,
        updatedAt: Date.now(),
      };

      const result = saveWeights(weights) as SaveResult;

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Type narrowing: ok: true has no error field
        expect((result as any).error).toBeUndefined();
      }
    });

    it("should return SaveResult with ok: false and error message", async () => {
      const { saveWeights } = await import("@/lib/storage");

      const weights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: Date.now(),
      };

      const result = saveWeights(weights) as SaveResult;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.error).toBe("string");
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });
});
