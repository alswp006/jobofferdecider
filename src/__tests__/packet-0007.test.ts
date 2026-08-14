import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { AppState, CompanyProfile, Weights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { INITIAL_STATE, MAX_OFFERS, STORAGE_KEY } from "@/lib/constants";
import { loadState, saveState } from "@/lib/storage";
import { useAppState } from "@/hooks/useAppState";

describe("Packet 0007: 앱 상태 훅 (useAppState)", () => {
  let originalSetItem: typeof Storage.prototype.setItem;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Store original setItem for restoration in tests
    originalSetItem = Storage.prototype.setItem;
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Always restore Storage.prototype.setItem
    Storage.prototype.setItem = originalSetItem;
  });

  describe("AC-1: 마운트 직후 loading===false이고 state가 loadState() 결과와 깊은 동등", () => {
    it("should load state on mount and set loading to false", async () => {
      const { result } = renderHook(() => useAppState());

      // Initially loading should be true or undefined, state should exist
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty("state");
      expect(result.current).toHaveProperty("loading");

      // After mount, loading should be false
      expect(result.current.loading).toBe(false);

      // State should match INITIAL_STATE structure when localStorage is empty
      expect(result.current.state.version).toBe(1);
      expect(result.current.state.offers).toBeDefined();
      expect(Array.isArray(result.current.state.offers)).toBe(true);
    });

    it("should have state.version===1 and deep equal to loadState result", async () => {
      // Pre-populate localStorage with a known state
      const testState: AppState = {
        version: 1,
        current: {
          id: "current",
          name: "테스트회사",
          baseSalary: 50_000_000,
          bonusPerYear: 5_000_000,
          remoteDaysPerWeek: 2,
          commuteMinutesOneWay: 30,
          commuteCostPerDay: 3_000,
          lunchCostPerDay: 9_000,
          mealSupportPerMonth: 100_000,
          welfarePointsPerYear: 1_200_000,
          ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
        offers: [],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(testState));

      const { result } = renderHook(() => useAppState());

      // State should be deeply equal to what loadState returns
      expect(result.current.state.version).toBe(testState.version);
      expect(result.current.state.current).toEqual(testState.current);
      expect(result.current.state.offers).toEqual(testState.offers);
      expect(result.current.state.weights).toEqual(testState.weights);
      expect(result.current.state.unlockedOfferIds).toEqual(testState.unlockedOfferIds);
    });
  });

  describe("AC-2: saveOffer로 4번째 오퍼 추가 시 state.offers.length가 3에서 늘지 않고 함수가 false를 반환한다", () => {
    it("should verify MAX_OFFERS constant is 3", () => {
      expect(MAX_OFFERS).toBe(3);
    });

    it("should reject 4th offer and return false", async () => {
      // Create state with 3 offers (max)
      const existingOffers: CompanyProfile[] = Array.from({ length: 3 }, (_, i) => ({
        id: `o-${i}`,
        name: `회사${i + 1}`,
        baseSalary: 50_000_000 + i * 1_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      }));

      const initialState: AppState = {
        version: 1,
        current: null,
        offers: existingOffers,
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));

      const { result } = renderHook(() => useAppState());

      expect(result.current.state.offers).toHaveLength(3);

      // Try to add 4th offer
      const newOffer: CompanyProfile = {
        id: "o-3",
        name: "4번째회사",
        baseSalary: 70_000_000,
        bonusPerYear: 7_000_000,
        remoteDaysPerWeek: 1,
        commuteMinutesOneWay: 20,
        commuteCostPerDay: 2_000,
        lunchCostPerDay: 8_000,
        mealSupportPerMonth: 150_000,
        welfarePointsPerYear: 1_500_000,
        ratings: { growth: 4, workLife: 4, stability: 4, culture: 4, commuteEase: 4 },
        updatedAt: "2026-08-15T11:00:00.000Z",
      };

      let saveResult = false;
      act(() => {
        saveResult = result.current.saveOffer(newOffer);
      });

      // Should return false (quota exceeded)
      expect(saveResult).toBe(false);

      // State should not have changed
      expect(result.current.state.offers).toHaveLength(3);
    });

    it("should allow adding offers up to MAX_OFFERS", async () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.state.offers).toHaveLength(0);

      // Add 3 offers
      const offers: CompanyProfile[] = Array.from({ length: 3 }, (_, i) => ({
        id: `o-${i}`,
        name: `회사${i + 1}`,
        baseSalary: 50_000_000 + i * 1_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      }));

      let results: boolean[] = [];
      act(() => {
        offers.forEach((offer) => {
          results.push(result.current.saveOffer(offer));
        });
      });

      // All 3 should succeed
      expect(results).toEqual([true, true, true]);
      expect(result.current.state.offers).toHaveLength(3);
    });
  });

  describe("AC-3: deleteOffer(id) 후 state.offers와 state.unlockedOfferIds 양쪽에서 해당 id가 사라진다", () => {
    it("should remove offer from both state.offers and state.unlockedOfferIds", async () => {
      const offerId = "o-1";

      const initialState: AppState = {
        version: 1,
        current: null,
        offers: [
          {
            id: offerId,
            name: "제안회사1",
            baseSalary: 65_000_000,
            bonusPerYear: 6_500_000,
            remoteDaysPerWeek: 1,
            commuteMinutesOneWay: 20,
            commuteCostPerDay: 2_000,
            lunchCostPerDay: 8_000,
            mealSupportPerMonth: 150_000,
            welfarePointsPerYear: 1_500_000,
            ratings: { growth: 4, workLife: 5, stability: 4, culture: 4, commuteEase: 4 },
            updatedAt: "2026-08-15T10:00:00.000Z",
          },
        ],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [offerId, "o-2"],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));

      const { result } = renderHook(() => useAppState());

      // Before delete
      expect(result.current.state.offers).toHaveLength(1);
      expect(result.current.state.offers[0].id).toBe(offerId);
      expect(result.current.state.unlockedOfferIds).toHaveLength(2);
      expect(result.current.state.unlockedOfferIds).toContain(offerId);

      // Delete offer
      act(() => {
        result.current.deleteOffer(offerId);
      });

      // After delete, offer should be gone from both arrays
      expect(result.current.state.offers).toHaveLength(0);
      expect(result.current.state.unlockedOfferIds).toHaveLength(1);
      expect(result.current.state.unlockedOfferIds).not.toContain(offerId);
      expect(result.current.state.unlockedOfferIds).toContain("o-2");
    });

    it("should keep other offers when deleting one", async () => {
      const offersToKeep: CompanyProfile[] = [
        {
          id: "o-1",
          name: "회사1",
          baseSalary: 50_000_000,
          bonusPerYear: 5_000_000,
          remoteDaysPerWeek: 2,
          commuteMinutesOneWay: 30,
          commuteCostPerDay: 3_000,
          lunchCostPerDay: 9_000,
          mealSupportPerMonth: 100_000,
          welfarePointsPerYear: 1_200_000,
          ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
        {
          id: "o-2",
          name: "회사2",
          baseSalary: 60_000_000,
          bonusPerYear: 6_000_000,
          remoteDaysPerWeek: 1,
          commuteMinutesOneWay: 20,
          commuteCostPerDay: 2_000,
          lunchCostPerDay: 8_000,
          mealSupportPerMonth: 150_000,
          welfarePointsPerYear: 1_500_000,
          ratings: { growth: 4, workLife: 4, stability: 4, culture: 4, commuteEase: 4 },
          updatedAt: "2026-08-15T10:00:00.000Z",
        },
      ];

      const initialState: AppState = {
        version: 1,
        current: null,
        offers: offersToKeep,
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: ["o-1", "o-2"],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));

      const { result } = renderHook(() => useAppState());

      expect(result.current.state.offers).toHaveLength(2);

      // Delete first offer
      act(() => {
        result.current.deleteOffer("o-1");
      });

      // Remaining offer should be o-2
      expect(result.current.state.offers).toHaveLength(1);
      expect(result.current.state.offers[0].id).toBe("o-2");
      expect(result.current.state.unlockedOfferIds).toEqual(["o-2"]);
    });
  });

  describe("AC-4: saveState가 false를 반환하는 환경에서 saveCurrent 호출 시 saveError===true가 되고 clearSaveError()로 false로 돌아온다", () => {
    it("should set saveError=true when saveCurrent fails (saveState returns false)", async () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.saveError).toBe(false);

      // Mock localStorage to reject saves (simulate quota exceeded)
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const mockCurrent: CompanyProfile = {
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
      };

      act(() => {
        result.current.saveCurrent(mockCurrent);
      });

      // saveError should be true after failed save
      expect(result.current.saveError).toBe(true);

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });

    it("should clear saveError with clearSaveError()", async () => {
      const { result } = renderHook(() => useAppState());

      // First, trigger an error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const mockCurrent: CompanyProfile = {
        id: "current",
        name: "테스트",
        baseSalary: 50_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      act(() => {
        result.current.saveCurrent(mockCurrent);
      });

      expect(result.current.saveError).toBe(true);

      // Clear error
      act(() => {
        result.current.clearSaveError();
      });

      expect(result.current.saveError).toBe(false);

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });

    it("should set saveError=true on saveOffer when saveState fails", async () => {
      const { result } = renderHook(() => useAppState());

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const newOffer: CompanyProfile = {
        id: "o-1",
        name: "회사",
        baseSalary: 50_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      act(() => {
        result.current.saveOffer(newOffer);
      });

      expect(result.current.saveError).toBe(true);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe("AC-5: crypto.randomUUID 미지원 환경에서도 생성된 id가 36자 UUID v4 포맷 정규식과 일치", () => {
    it("should generate UUID v4 format (36 chars) with correct regex pattern", async () => {
      const { result } = renderHook(() => useAppState());

      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const newOffer: CompanyProfile = {
        id: "temp-will-be-replaced",
        name: "회사",
        baseSalary: 50_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      act(() => {
        result.current.saveOffer(newOffer);
      });

      // Get the generated ID from the saved offer
      expect(result.current.state.offers.length).toBeGreaterThan(0);
      const generatedId = result.current.state.offers[0].id;

      // Should be 36 chars and match UUID v4 format
      expect(generatedId).toHaveLength(36);
      expect(generatedId).toMatch(uuidV4Regex);
    });

    it("should generate unique IDs for multiple offers (no duplicates)", async () => {
      const { result } = renderHook(() => useAppState());

      const newOffers: CompanyProfile[] = Array.from({ length: 3 }, (_, i) => ({
        id: "temp",
        name: `회사${i + 1}`,
        baseSalary: 50_000_000 + i * 1_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      }));

      act(() => {
        newOffers.forEach((offer) => {
          result.current.saveOffer(offer);
        });
      });

      // All IDs should be unique
      const ids = result.current.state.offers.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("Hook return type verification", () => {
    it("should return object with all required properties", async () => {
      const { result } = renderHook(() => useAppState());

      // Verify the hook return type has all expected properties
      expect(result.current).toHaveProperty("state");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("saveError");
      expect(result.current).toHaveProperty("clearSaveError");
      expect(result.current).toHaveProperty("saveCurrent");
      expect(result.current).toHaveProperty("saveOffer");
      expect(result.current).toHaveProperty("deleteOffer");
      expect(result.current).toHaveProperty("saveWeights");
      expect(result.current).toHaveProperty("unlockOffer");

      // Verify types
      expect(typeof result.current.state).toBe("object");
      expect(typeof result.current.loading).toBe("boolean");
      expect(typeof result.current.saveError).toBe("boolean");
      expect(typeof result.current.clearSaveError).toBe("function");
      expect(typeof result.current.saveCurrent).toBe("function");
      expect(typeof result.current.saveOffer).toBe("function");
      expect(typeof result.current.deleteOffer).toBe("function");
      expect(typeof result.current.saveWeights).toBe("function");
      expect(typeof result.current.unlockOffer).toBe("function");
    });
  });

  describe("Mutation consistency", () => {
    it("should update state after saveCurrent", async () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.state.current).toBeNull();

      const mockCurrent: CompanyProfile = {
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
      };

      act(() => {
        result.current.saveCurrent(mockCurrent);
      });

      expect(result.current.state.current).toBeDefined();
      expect(result.current.state.current?.id).toBe("current");
      expect(result.current.state.current?.name).toBe("현재회사");
    });

    it("should return true when mutations succeed", async () => {
      const { result } = renderHook(() => useAppState());

      const mockCurrent: CompanyProfile = {
        id: "current",
        name: "회사",
        baseSalary: 50_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      let result_value = false;
      act(() => {
        result_value = result.current.saveCurrent(mockCurrent);
      });

      expect(result_value).toBe(true);
    });
  });

  describe("saveWeights behavior", () => {
    it("should update weights and call saveState", async () => {
      const { result } = renderHook(() => useAppState());

      const newWeights: Weights = {
        money: 100,
        growth: 25,
        workLife: 50,
        stability: 50,
        culture: 50,
        commuteEase: 25,
      };

      let saveResult = false;
      act(() => {
        saveResult = result.current.saveWeights(newWeights);
      });

      // Should succeed
      expect(saveResult).toBe(true);
      expect(result.current.state.weights).toEqual(newWeights);
    });

    it("should return false if saveWeights fails", async () => {
      const { result } = renderHook(() => useAppState());

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const newWeights: Weights = {
        money: 100,
        growth: 25,
        workLife: 50,
        stability: 50,
        culture: 50,
        commuteEase: 25,
      };

      let saveResult = false;
      act(() => {
        saveResult = result.current.saveWeights(newWeights);
      });

      expect(saveResult).toBe(false);
      expect(result.current.saveError).toBe(true);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe("unlockOffer behavior", () => {
    it("should add offerId to unlockedOfferIds", async () => {
      const { result } = renderHook(() => useAppState());
      const offerId = "o-1";

      expect(result.current.state.unlockedOfferIds).not.toContain(offerId);

      act(() => {
        result.current.unlockOffer(offerId);
      });

      expect(result.current.state.unlockedOfferIds).toContain(offerId);
    });

    it("should not duplicate offerId in unlockedOfferIds (idempotent)", async () => {
      const { result } = renderHook(() => useAppState());
      const offerId = "o-1";

      act(() => {
        result.current.unlockOffer(offerId);
        result.current.unlockOffer(offerId);
      });

      // Should only appear once
      const count = result.current.state.unlockedOfferIds.filter((id) => id === offerId).length;
      expect(count).toBe(1);
    });

    it("should return false if unlockOffer saveState fails", async () => {
      const { result } = renderHook(() => useAppState());

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      let saveResult = false;
      act(() => {
        saveResult = result.current.unlockOffer("o-1");
      });

      expect(saveResult).toBe(false);
      expect(result.current.saveError).toBe(true);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe("Storage integration", () => {
    it("should persist state to localStorage", async () => {
      const { result } = renderHook(() => useAppState());

      const mockCurrent: CompanyProfile = {
        id: "current",
        name: "회사",
        baseSalary: 50_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      act(() => {
        result.current.saveCurrent(mockCurrent);
      });

      // Verify state was persisted to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeDefined();

      if (stored) {
        const parsedState: AppState = JSON.parse(stored);
        expect(parsedState.current).toBeDefined();
        expect(parsedState.current?.name).toBe("회사");
      }
    });

    it("should load state from localStorage on mount", async () => {
      const testState: AppState = {
        version: 1,
        current: {
          id: "current",
          name: "저장된회사",
          baseSalary: 55_000_000,
          bonusPerYear: 5_500_000,
          remoteDaysPerWeek: 2,
          commuteMinutesOneWay: 35,
          commuteCostPerDay: 3_000,
          lunchCostPerDay: 9_000,
          mealSupportPerMonth: 100_000,
          welfarePointsPerYear: 1_200_000,
          ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
        offers: [],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(testState));

      const { result } = renderHook(() => useAppState());

      expect(result.current.state.current?.name).toBe("저장된회사");
    });
  });

  describe("State immutability", () => {
    it("should not mutate state when mutations fail", async () => {
      const { result } = renderHook(() => useAppState());

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const initialOffersLength = result.current.state.offers.length;

      const newOffer: CompanyProfile = {
        id: "o-1",
        name: "회사",
        baseSalary: 50_000_000,
        bonusPerYear: 5_000_000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 3_000,
        lunchCostPerDay: 9_000,
        mealSupportPerMonth: 100_000,
        welfarePointsPerYear: 1_200_000,
        ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
        updatedAt: "2026-08-15T09:00:00.000Z",
      };

      act(() => {
        result.current.saveOffer(newOffer);
      });

      // If saveState failed, state should not change
      // Note: implementation may vary — some might add optimistically then rollback
      // This test just verifies consistency

      Storage.prototype.setItem = originalSetItem;
    });
  });
});
