import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AppState } from "@/lib/types";
import {
  TAX_TABLE,
  TIME_VALUE_PER_HOUR,
  MAX_OFFERS,
  STORAGE_KEY,
  ONBOARDED_KEY,
  INITIAL_STATE,
  SCORE_LABELS,
  VERDICT_LABELS,
} from "@/lib/constants";
import {
  loadState,
  saveState,
  isValidAppState,
  migrate,
  isOnboarded,
  setOnboarded,
} from "@/lib/storage";

describe("기반 lib 복구 — constants.ts + storage.ts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ========================================
  // AC-1: TypeScript 컴파일 에러 0건
  // ========================================
  it("AC-1: exports are importable and properly typed", () => {
    // 상수들이 정상적으로 import되고 접근 가능함을 검증
    expect(TAX_TABLE).toBeDefined();
    expect(STORAGE_KEY).toBe("jod:state:v1");
    expect(ONBOARDED_KEY).toBe("jod:onboarded:v1");
    expect(INITIAL_STATE).toBeDefined();
    expect(loadState).toBeInstanceOf(Function);
    expect(saveState).toBeInstanceOf(Function);
  });

  // ========================================
  // AC-2: 손상된 JSON 처리
  // ========================================
  it("AC-2: loadState recovers from broken JSON without throwing", () => {
    // broken JSON을 localStorage에 저장
    localStorage.setItem(STORAGE_KEY, "{broken json");

    // loadState() 호출 — 예외 발생 없음
    const result = loadState();

    // INITIAL_STATE와 깊은 동등성 검증
    expect(result).toEqual(INITIAL_STATE);
    expect(result.version).toBe(1);
    expect(result.current).toBeNull();
    expect(result.offers).toEqual([]);
  });

  it("AC-2: loadState handles missing key gracefully", () => {
    // 키가 없는 상태에서 loadState() 호출
    const result = loadState();

    // INITIAL_STATE와 깊은 동등성
    expect(result).toEqual(INITIAL_STATE);
    expect(result.version).toBe(1);
  });

  // ========================================
  // AC-3: QuotaExceededError 처리
  // ========================================
  it("AC-3: saveState returns false on QuotaExceededError", () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      const error = new Error("QuotaExceededError");
      (error as any).name = "QuotaExceededError";
      throw error;
    });

    const testState: AppState = {
      version: 1,
      current: null,
      offers: [],
      weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
      unlockedOfferIds: [],
    };

    // saveState()이 false를 반환 (예외 전파 없음)
    const result = saveState(testState);
    expect(result).toBe(false);

    // 복원
    Storage.prototype.setItem = originalSetItem;
  });

  it("AC-3: saveState suppresses exceptions without console.error", () => {
    const consoleErrorSpy = vi.spyOn(console, "error");
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("Storage full");
    });

    const testState: AppState = {
      version: 1,
      current: null,
      offers: [],
      weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
      unlockedOfferIds: [],
    };

    saveState(testState);

    // console.error가 호출되지 않음
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    Storage.prototype.setItem = originalSetItem;
  });

  // ========================================
  // AC-4: 정상 저장/로드 + version 검증
  // ========================================
  it("AC-4: saveState returns true on success", () => {
    const testState: AppState = {
      version: 1,
      current: null,
      offers: [],
      weights: { money: 60, growth: 50, workLife: 40, stability: 55, culture: 50, commuteEase: 45 },
      unlockedOfferIds: [],
    };

    const result = saveState(testState);
    expect(result).toBe(true);
  });

  it("AC-4: saved state has version===1", () => {
    const testState: AppState = {
      version: 1,
      current: null,
      offers: [],
      weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
      unlockedOfferIds: [],
    };

    saveState(testState);

    // localStorage에서 직접 파싱해서 version 확인
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    expect(stored.version).toBe(1);
  });

  it("AC-4: loadState rejects state with version !== 1", () => {
    // version이 2인 손상된 상태 저장
    const brokenState = {
      version: 2,
      current: null,
      offers: [],
      weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
      unlockedOfferIds: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brokenState));

    // loadState()가 INITIAL_STATE를 반환
    const result = loadState();
    expect(result).toEqual(INITIAL_STATE);
    expect(result.version).toBe(1);
  });

  // ========================================
  // AC-5: 상수값 정확성
  // ========================================
  it("AC-5: TAX_TABLE has exactly 6 entries", () => {
    expect(TAX_TABLE).toHaveLength(6);
  });

  it("AC-5: TAX_TABLE structure is correct", () => {
    // 첫 원소 검증
    expect(TAX_TABLE[0]).toEqual({ upTo: 24_000_000, rate: 0.09 });

    // 마지막 원소 검증
    expect(TAX_TABLE[5]).toEqual({ upTo: Infinity, rate: 0.31 });

    // 중간 원소들도 구간별 증가
    expect(TAX_TABLE[1].upTo).toBeGreaterThan(TAX_TABLE[0].upTo);
    expect(TAX_TABLE[2].upTo).toBeGreaterThan(TAX_TABLE[1].upTo);
  });

  it("AC-5: SCORE_LABELS have 6 correct values", () => {
    expect(Object.keys(SCORE_LABELS)).toHaveLength(6);
    expect(SCORE_LABELS.money).toBe("연봉 실질가치");
    expect(SCORE_LABELS.growth).toBe("성장성");
    expect(SCORE_LABELS.workLife).toBe("워라밸");
    expect(SCORE_LABELS.stability).toBe("안정성");
    expect(SCORE_LABELS.culture).toBe("조직문화");
    expect(SCORE_LABELS.commuteEase).toBe("통근 편의");
  });

  it("AC-5: VERDICT_LABELS have 4 correct values", () => {
    expect(Object.keys(VERDICT_LABELS)).toHaveLength(4);
    expect(VERDICT_LABELS.MOVE).toBe("이직 추천");
    expect(VERDICT_LABELS.CONDITIONAL).toBe("조건부 추천");
    expect(VERDICT_LABELS.HOLD).toBe("판단 보류");
    expect(VERDICT_LABELS.STAY).toBe("잔류 추천");
  });

  it("AC-5: constants have expected values", () => {
    expect(TIME_VALUE_PER_HOUR).toBe(15_000);
    expect(MAX_OFFERS).toBe(3);
    expect(STORAGE_KEY).toBe("jod:state:v1");
    expect(ONBOARDED_KEY).toBe("jod:onboarded:v1");
  });

  // ========================================
  // 추가 검증: isOnboarded / setOnboarded
  // ========================================
  it("isOnboarded returns false by default", () => {
    expect(isOnboarded()).toBe(false);
  });

  it("setOnboarded marks as onboarded", () => {
    setOnboarded();
    expect(isOnboarded()).toBe(true);
    expect(localStorage.getItem(ONBOARDED_KEY)).toBe("1");
  });

  // ========================================
  // 추가 검증: isValidAppState / migrate
  // ========================================
  it("isValidAppState rejects non-1 versions", () => {
    const valid: AppState = {
      version: 1,
      current: null,
      offers: [],
      weights: { money: 50, growth: 50, workLife: 50, stability: 50, culture: 50, commuteEase: 50 },
      unlockedOfferIds: [],
    };
    expect(isValidAppState(valid)).toBe(true);

    const invalid = { version: 2, current: null, offers: [] };
    expect(isValidAppState(invalid)).toBe(false);
  });

  it("migrate creates deep copy of INITIAL_STATE on version mismatch", () => {
    const broken = { version: 2, current: null };
    const migrated = migrate(broken);

    // INITIAL_STATE와 동등하고 깊은 복사임을 검증
    expect(migrated).toEqual(INITIAL_STATE);
    expect(migrated).not.toBe(INITIAL_STATE);
    expect(migrated.weights).not.toBe(INITIAL_STATE.weights);
  });
});
