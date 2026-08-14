/**
 * Test-First (TDD Red Phase)
 * localStorage 저장소 모듈 — AppState + onboarded flag persistence
 *
 * AC-1: 손상된 JSON 폴백
 * AC-2: setItem 할당량 초과 처리
 * AC-3: 정상 저장 및 로드
 * AC-4: version 불일치 폴백
 * AC-5: 온보딩 플래그 저장소
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadState,
  saveState,
  isValidAppState,
  migrate,
  isOnboarded,
  setOnboarded,
} from "@/lib/storage";
import { INITIAL_STATE, STORAGE_KEY, ONBOARDED_KEY } from "@/lib/constants";
import type { AppState } from "@/lib/types";

describe("localStorage 저장소 모듈 (packet-0003)", () => {
  // ─────────────────────────────────────────────────────────────
  // Setup: 매 테스트 전에 localStorage 초기화
  // ─────────────────────────────────────────────────────────────
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, "error");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // AC-1: 손상된 JSON 폴백 (깊은 동등성 + 예외 0건 + console.error 0회)
  // ─────────────────────────────────────────────────────────────
  describe("AC-1: 손상된 JSON 폴백", () => {
    it("AC-1.1: 손상된 JSON → INITIAL_STATE 반환 (깊은 동등)", () => {
      // Arrange: 손상된 JSON 주입
      localStorage.setItem(STORAGE_KEY, "{broken json");

      // Act
      const result = loadState();

      // Assert: 깊은 동등 + 독립 객체
      expect(result).toEqual(INITIAL_STATE);
      expect(result).not.toBe(INITIAL_STATE); // 깊은 복사 확인 (같은 참조 아님)
      expect(result.version).toBe(1);
      expect(result.current).toBeNull();
      expect(Array.isArray(result.offers)).toBe(true);
    });

    it("AC-1.2: 손상된 JSON → console.error 호출 안 함", () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, "{broken");
      const consoleErrorSpy = vi.spyOn(console, "error");

      // Act
      loadState();

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("AC-1.3: 손상된 JSON 로드 시 예외 던지지 않음", () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, '{"unclosed":');

      // Act & Assert
      expect(() => loadState()).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-2: setItem 할당량 초과 처리
  // ─────────────────────────────────────────────────────────────
  describe("AC-2: setItem QuotaExceededError 처리", () => {
    it("AC-2.1: QuotaExceededError → saveState false 반환", () => {
      // Arrange: localStorage.setItem을 QuotaExceededError를 던지도록 스파이
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      // Act
      const result = saveState(INITIAL_STATE);

      // Assert
      expect(result).toBe(false);
    });

    it("AC-2.2: QuotaExceededError → 예외 전파 안 함", () => {
      // Arrange
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      // Act & Assert
      expect(() => saveState(INITIAL_STATE)).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-3: 정상 저장 및 로드
  // ─────────────────────────────────────────────────────────────
  describe("AC-3: 정상 저장 및 로드", () => {
    it("AC-3.1: saveState 정상 환경 → true 반환", () => {
      // Arrange
      const testState: AppState = {
        version: 1,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };

      // Act
      const result = saveState(testState);

      // Assert
      expect(result).toBe(true);
    });

    it("AC-3.2: 저장된 상태 → JSON 문자열로 저장됨", () => {
      // Arrange
      const testState: AppState = {
        version: 1,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };

      // Act
      saveState(testState);

      // Assert: localStorage에 JSON 문자열로 저장
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.version).toBe(1);
    });

    it("AC-3.3: loadState → 저장된 상태 복원", () => {
      // Arrange: 테스트 상태 저장
      const testState: AppState = {
        version: 1,
        current: {
          id: "current",
          name: "현재 직장",
          baseSalary: 50000000,
          bonusPerYear: 0,
          remoteDaysPerWeek: 2,
          commuteMinutesOneWay: 30,
          commuteCostPerDay: 3000,
          lunchCostPerDay: 8000,
          mealSupportPerMonth: 200000,
          welfarePointsPerYear: 1000000,
          ratings: { growth: 3, workLife: 3, stability: 4, culture: 3, commuteEase: 3 },
          updatedAt: "2026-08-15T10:00:00Z",
        },
        offers: [],
        weights: { money: 60, growth: 40, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };
      saveState(testState);

      // Act
      const loaded = loadState();

      // Assert
      expect(loaded).toEqual(testState);
      expect(loaded.current?.name).toBe("현재 직장");
      expect(loaded.weights.money).toBe(60);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-4: version 불일치 폴백
  // ─────────────────────────────────────────────────────────────
  describe("AC-4: version 불일치 폴백", () => {
    it("AC-4.1: version !== 1 → INITIAL_STATE 반환", () => {
      // Arrange: 잘못된 version 주입
      const invalidState = {
        version: 2,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      // Act
      const result = loadState();

      // Assert
      expect(result).toEqual(INITIAL_STATE);
      expect(result.version).toBe(1);
    });

    it("AC-4.2: version 필드 누락 → INITIAL_STATE 반환", () => {
      // Arrange: version 누락
      const invalidState = {
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      // Act
      const result = loadState();

      // Assert
      expect(result).toEqual(INITIAL_STATE);
    });

    it("AC-4.3: version 0 (정수 타입) → INITIAL_STATE 반환", () => {
      // Arrange
      const invalidState = {
        version: 0,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      // Act
      const result = loadState();

      // Assert
      expect(result).toEqual(INITIAL_STATE);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // AC-5: 온보딩 플래그 저장소
  // ─────────────────────────────────────────────────────────────
  describe("AC-5: 온보딩 플래그 저장소", () => {
    it("AC-5.1: isOnboarded() 최초 호출 → false", () => {
      // Arrange: 깨끗한 localStorage

      // Act
      const result = isOnboarded();

      // Assert
      expect(result).toBe(false);
    });

    it("AC-5.2: setOnboarded() → localStorage에 '1' 저장", () => {
      // Arrange

      // Act
      setOnboarded();

      // Assert
      const stored = localStorage.getItem(ONBOARDED_KEY);
      expect(stored).toBe("1");
    });

    it("AC-5.3: setOnboarded() 후 isOnboarded() → true", () => {
      // Arrange
      setOnboarded();

      // Act
      const result = isOnboarded();

      // Assert
      expect(result).toBe(true);
    });

    it("AC-5.4: 손상된 온보딩 값 → isOnboarded false", () => {
      // Arrange: 잘못된 값 주입
      localStorage.setItem(ONBOARDED_KEY, "invalid");

      // Act
      const result = isOnboarded();

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // isValidAppState type guard 검증
  // ─────────────────────────────────────────────────────────────
  describe("isValidAppState type guard", () => {
    it("valid state → true", () => {
      // Arrange
      const validState: AppState = {
        version: 1,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };

      // Act & Assert
      expect(isValidAppState(validState)).toBe(true);
    });

    it("invalid version → false", () => {
      // Arrange
      const invalidState = {
        version: 999,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };

      // Act & Assert
      expect(isValidAppState(invalidState)).toBe(false);
    });

    it("null → false", () => {
      expect(isValidAppState(null)).toBe(false);
    });

    it("undefined → false", () => {
      expect(isValidAppState(undefined)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // migrate 함수
  // ─────────────────────────────────────────────────────────────
  describe("migrate function", () => {
    it("valid v1 state → unchanged", () => {
      // Arrange
      const validState = {
        version: 1,
        current: null,
        offers: [],
        weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
        unlockedOfferIds: [],
      };

      // Act
      const result = migrate(validState);

      // Assert
      expect(result).toEqual(validState);
    });

    it("invalid/missing version → INITIAL_STATE", () => {
      // Arrange
      const invalidState = { version: 2 };

      // Act
      const result = migrate(invalidState);

      // Assert
      expect(result).toEqual(INITIAL_STATE);
    });

    it("null → INITIAL_STATE", () => {
      // Act
      const result = migrate(null);

      // Assert
      expect(result).toEqual(INITIAL_STATE);
    });
  });
});
