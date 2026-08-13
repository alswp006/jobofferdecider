/**
 * TDD Red Phase Tests for packet-0005: 앱 상태 훅 4종
 *
 * Tests describe the expected behavior of:
 * - useOffers() — manage offers from storage
 * - useWeights() — manage weights from storage
 * - useUnlock() — manage unlock state
 * - useAppMeta() — manage app metadata
 *
 * Implementation files (to be created):
 *   src/hooks/useOffers.ts
 *   src/hooks/useWeights.ts
 *   src/hooks/useUnlock.ts
 *   src/hooks/useAppMeta.ts
 *
 * Tests will initially FAIL — that's the intent of TDD red phase.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Offer, Weights, SaveResult, AppMeta } from "@/lib/types";
import { STORAGE_KEYS, DEFAULT_WEIGHTS } from "@/lib/types";
import {
  loadOffers,
  saveOffer,
  deleteOffer,
  loadWeights,
  saveWeights,
  loadUnlock,
  addUnlockKey,
  loadMeta,
  setCalcNoticeAcknowledged,
} from "@/lib/storage";
import { useOffers } from "@/hooks/useOffers";
import { useWeights } from "@/hooks/useWeights";
import { useUnlock } from "@/hooks/useUnlock";
import { useAppMeta } from "@/hooks/useAppMeta";

describe("앱 상태 훅 4종", () => {
  // ========================================================================
  // AC-1: useOffers() returns expected shape with initial isLoading
  // ========================================================================
  describe("AC-1[P0]: useOffers() interface & initial loading state", () => {
    it("should return { isLoading, offers, current, save, remove, refresh, loadError } shape", () => {
      const { result } = renderHook(() => useOffers());

      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("offers");
      expect(result.current).toHaveProperty("current");
      expect(result.current).toHaveProperty("save");
      expect(result.current).toHaveProperty("remove");
      expect(result.current).toHaveProperty("refresh");
      expect(result.current).toHaveProperty("loadError");
    });

    it("should expose isLoading:true on initial render for at least 1 tick", async () => {
      const { result } = renderHook(() => useOffers());

      // First tick: isLoading should be true
      expect(result.current.isLoading).toBe(true);

      // After effect runs (next tick), isLoading becomes false
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should load offers from storage after mount", async () => {
      const now = Date.now();
      const testOffer: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Test Corp",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 60,
        cultureScore: 70,
        stabilityScore: 80,
        createdAt: now,
        updatedAt: now,
      };

      act(() => {
        saveOffer(testOffer);
      });

      const { result } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.offers).toHaveLength(1);
      expect(result.current.offers[0]?.companyName).toBe("Test Corp");
    });

    it("should set current to the offer with kind='current'", async () => {
      const now = Date.now();
      const currentOffer: Offer = {
        id: "c1",
        kind: "current",
        companyName: "Current Corp",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 45,
        commuteCostPerDayWon: 4000,
        lunchCostPerDayWon: 10000,
        growthScore: 50,
        cultureScore: 60,
        stabilityScore: 70,
        createdAt: now,
        updatedAt: now,
      };

      act(() => {
        saveOffer(currentOffer);
      });

      const { result } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.current?.id).toBe("c1");
      expect(result.current.current?.kind).toBe("current");
    });
  });

  // ========================================================================
  // AC-2: useOffers().save() returns SaveResult as-is, no throw
  // ========================================================================
  describe("AC-2[P0]: useOffers().save() returns SaveResult & no throw", () => {
    it("should return SaveResult.ok=true on successful save", async () => {
      const { result } = renderHook(() => useOffers());

      const now = Date.now();
      const offer: Offer = {
        id: "new-offer",
        kind: "offer",
        companyName: "New Corp",
        baseSalaryManwon: 4500,
        bonusManwon: 450,
        welfarePointManwon: 90,
        remoteDaysPerWeek: 3,
        commuteMinutesOneWay: 15,
        commuteCostPerDayWon: 2000,
        lunchCostPerDayWon: 8000,
        growthScore: 75,
        cultureScore: 80,
        stabilityScore: 85,
        createdAt: now,
        updatedAt: now,
      };

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      let saveResult: SaveResult | undefined;
      act(() => {
        saveResult = result.current.save(offer);
      });

      expect(saveResult?.ok).toBe(true);
    });

    it("should return SaveResult as-is from storage on quota exceeded", async () => {
      const { result } = renderHook(() => useOffers());

      // Create 3 offers to hit max
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        const offer: Offer = {
          id: `offer-${i}`,
          kind: "offer",
          companyName: `Corp ${i}`,
          baseSalaryManwon: 5000,
          bonusManwon: 500,
          welfarePointManwon: 100,
          remoteDaysPerWeek: 2,
          commuteMinutesOneWay: 30,
          commuteCostPerDayWon: 3000,
          lunchCostPerDayWon: 9000,
          growthScore: 60,
          cultureScore: 60,
          stabilityScore: 60,
          createdAt: now,
          updatedAt: now,
        };
        act(() => {
          saveOffer(offer);
        });
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const fourthOffer: Offer = {
        id: "offer-4",
        kind: "offer",
        companyName: "Corp 4",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 60,
        cultureScore: 60,
        stabilityScore: 60,
        createdAt: now,
        updatedAt: now,
      };

      let saveResult: SaveResult | undefined;
      act(() => {
        saveResult = result.current.save(fourthOffer);
      });

      expect(saveResult?.ok).toBe(false);
      expect(saveResult?.error).toBeDefined();
    });

    it("should not throw when save() is called", async () => {
      const { result } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const now = Date.now();
      const offer: Offer = {
        id: "test-no-throw",
        kind: "offer",
        companyName: "Test",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 60,
        cultureScore: 60,
        stabilityScore: 60,
        createdAt: now,
        updatedAt: now,
      };

      let threw = false;
      try {
        act(() => {
          result.current.save(offer);
        });
      } catch {
        threw = true;
      }

      expect(threw).toBe(false);
    });
  });

  // ========================================================================
  // AC-3: useOffers().remove() deletes offer by id
  // ========================================================================
  describe("AC-3[P0]: useOffers().remove() deletes by id", () => {
    it("should remove offer from list after remove(id) is called", async () => {
      const now = Date.now();
      const offer: Offer = {
        id: "to-delete",
        kind: "offer",
        companyName: "Deletable Corp",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 60,
        cultureScore: 60,
        stabilityScore: 60,
        createdAt: now,
        updatedAt: now,
      };

      act(() => {
        saveOffer(offer);
      });

      const { result, rerender } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.offers).toHaveLength(1);

      act(() => {
        result.current.remove("to-delete");
      });

      rerender();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.offers).toHaveLength(0);
    });
  });

  // ========================================================================
  // AC-4: useWeights() returns DEFAULT_WEIGHTS + wasReset when sum is 0
  // ========================================================================
  describe("AC-4[P0]: useWeights() returns DEFAULT_WEIGHTS & wasReset flag", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should return DEFAULT_WEIGHTS + wasReset:true when no weights in storage", async () => {
      const { result } = renderHook(() => useWeights());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.weights).toEqual(expect.objectContaining({
        money: DEFAULT_WEIGHTS.money,
        remote: DEFAULT_WEIGHTS.remote,
        commute: DEFAULT_WEIGHTS.commute,
        growth: DEFAULT_WEIGHTS.growth,
        culture: DEFAULT_WEIGHTS.culture,
        stability: DEFAULT_WEIGHTS.stability,
      }));
      expect(result.current.wasReset).toBe(true);
    });

    it("should return wasReset:false when weights with sum > 0 are loaded", async () => {
      const customWeights: Weights = {
        money: 10,
        remote: 5,
        commute: 3,
        growth: 7,
        culture: 8,
        stability: 6,
        updatedAt: Date.now(),
      };

      act(() => {
        saveWeights(customWeights);
      });

      const { result } = renderHook(() => useWeights());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.weights).toEqual(expect.objectContaining({
        money: 10,
        remote: 5,
        commute: 3,
      }));
      expect(result.current.wasReset).toBe(false);
    });

    it("should return DEFAULT_WEIGHTS + wasReset:true when stored weights sum is 0", async () => {
      const zeroWeights: Weights = {
        money: 0,
        remote: 0,
        commute: 0,
        growth: 0,
        culture: 0,
        stability: 0,
        updatedAt: Date.now(),
      };

      // Directly set in localStorage (bypassing saveWeights validation)
      localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(zeroWeights));

      const { result } = renderHook(() => useWeights());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.weights).toEqual(expect.objectContaining({
        money: DEFAULT_WEIGHTS.money,
        remote: DEFAULT_WEIGHTS.remote,
      }));
      expect(result.current.wasReset).toBe(true);
    });
  });

  // ========================================================================
  // AC-5: useUnlock() isUnlocked checks key existence, provides unlock()
  // ========================================================================
  describe("AC-5[P0]: useUnlock().isUnlocked(currentId, targetId) & unlock()", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should return false for isUnlocked when ${currentId}:${targetId} key doesn't exist", async () => {
      const { result } = renderHook(() => useUnlock());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const isUnlocked = result.current.isUnlocked("c1", "o1");
      expect(isUnlocked).toBe(false);
    });

    it("should return true for isUnlocked when ${currentId}:${targetId} key exists", async () => {
      // Pre-unlock a comparison
      act(() => {
        addUnlockKey("c1:o1");
      });

      const { result } = renderHook(() => useUnlock());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const isUnlocked = result.current.isUnlocked("c1", "o1");
      expect(isUnlocked).toBe(true);
    });

    it("should provide unlock(currentId, targetId) function to add unlock key", async () => {
      const { result } = renderHook(() => useUnlock());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isUnlocked("c2", "o2")).toBe(false);

      act(() => {
        result.current.unlock("c2", "o2");
      });

      // Verify the unlock was stored
      const isUnlockedAfter = result.current.isUnlocked("c2", "o2");
      expect(isUnlockedAfter).toBe(true);
    });

    it("should not duplicate unlock key when called multiple times", async () => {
      const { result } = renderHook(() => useUnlock());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.unlock("c3", "o3");
        result.current.unlock("c3", "o3");
      });

      const state = loadUnlock();
      // Should have only 1 occurrence of "c3:o3"
      const count = state.unlockedComparisonKeys.filter((k) => k === "c3:o3").length;
      expect(count).toBe(1);
    });
  });

  // ========================================================================
  // AC-6: useAppMeta() returns { isLoading, calcNoticeAcknowledged, acknowledgeCalcNotice }
  // ========================================================================
  describe("AC-6[P0]: useAppMeta() interface & calc notice acknowledgment", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should return { isLoading, calcNoticeAcknowledged, acknowledgeCalcNotice } shape", () => {
      const { result } = renderHook(() => useAppMeta());

      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("calcNoticeAcknowledged");
      expect(result.current).toHaveProperty("acknowledgeCalcNotice");
    });

    it("should expose isLoading:true on initial render", async () => {
      const { result } = renderHook(() => useAppMeta());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should load calcNoticeAcknowledged from storage", async () => {
      act(() => {
        setCalcNoticeAcknowledged(true);
      });

      const { result } = renderHook(() => useAppMeta());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.calcNoticeAcknowledged).toBe(true);
    });

    it("should default calcNoticeAcknowledged to false when not in storage", async () => {
      const { result } = renderHook(() => useAppMeta());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.calcNoticeAcknowledged).toBe(false);
    });

    it("should update calcNoticeAcknowledged via acknowledgeCalcNotice() function", async () => {
      const { result, rerender } = renderHook(() => useAppMeta());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.calcNoticeAcknowledged).toBe(false);

      act(() => {
        result.current.acknowledgeCalcNotice();
      });

      rerender();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.calcNoticeAcknowledged).toBe(true);
    });
  });

  // ========================================================================
  // AC-7: useOffers().refresh() reloads from storage
  // ========================================================================
  describe("AC-7[P0]: useOffers().refresh() reloads from storage", () => {
    it("should refresh offers from storage when refresh() is called", async () => {
      const now = Date.now();
      const offer1: Offer = {
        id: "o1",
        kind: "offer",
        companyName: "Corp 1",
        baseSalaryManwon: 5000,
        bonusManwon: 500,
        welfarePointManwon: 100,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDayWon: 3000,
        lunchCostPerDayWon: 9000,
        growthScore: 60,
        cultureScore: 60,
        stabilityScore: 60,
        createdAt: now,
        updatedAt: now,
      };

      act(() => {
        saveOffer(offer1);
      });

      const { result } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.offers).toHaveLength(1);

      // Add another offer outside the hook
      const offer2: Offer = {
        id: "o2",
        kind: "offer",
        companyName: "Corp 2",
        baseSalaryManwon: 5500,
        bonusManwon: 550,
        welfarePointManwon: 110,
        remoteDaysPerWeek: 3,
        commuteMinutesOneWay: 20,
        commuteCostPerDayWon: 2500,
        lunchCostPerDayWon: 8500,
        growthScore: 70,
        cultureScore: 70,
        stabilityScore: 70,
        createdAt: now,
        updatedAt: now,
      };

      act(() => {
        saveOffer(offer2);
      });

      // Call refresh to reload
      act(() => {
        result.current.refresh();
      });

      expect(result.current.offers).toHaveLength(2);
    });
  });

  // ========================================================================
  // AC-8: useOffers() handles storage load errors gracefully
  // ========================================================================
  describe("AC-8[P0]: useOffers() error handling", () => {
    it("should set loadError flag when storage load fails", async () => {
      // Simulate a corrupted storage state
      localStorage.setItem(STORAGE_KEYS.OFFERS, "not-json{{{");

      const { result } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should have returned empty array and set loadError
      expect(result.current.offers).toEqual([]);
      expect(result.current.loadError).toBeTruthy();
    });

    it("should default to empty offers array when loadError occurs", async () => {
      localStorage.setItem(STORAGE_KEYS.OFFERS, "invalid");

      const { result } = renderHook(() => useOffers());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(Array.isArray(result.current.offers)).toBe(true);
      expect(result.current.offers).toHaveLength(0);
    });
  });
});
