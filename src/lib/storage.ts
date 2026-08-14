import { INITIAL_STATE, STORAGE_KEY, ONBOARDED_KEY } from "@/lib/constants";
import type { AppState } from "@/lib/types";

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Type guard: AppState 유효성 확인 (version === 1)
 */
export function isValidAppState(raw: unknown): raw is AppState {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return false;
  }
  const obj = raw as Record<string, unknown>;
  return obj.version === 1;
}

/**
 * 저장된 상태 마이그레이션 또는 폴백
 * version 불일치나 손상된 데이터 → INITIAL_STATE로 리셋 (깊은 복사)
 */
export function migrate(raw: unknown): AppState {
  if (isValidAppState(raw)) {
    return raw;
  }
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}

/**
 * localStorage에서 AppState 로드
 * - JSON 파싱 실패 → INITIAL_STATE (깊은 복사)
 * - version !== 1 → INITIAL_STATE (깊은 복사)
 * - 예외 던지지 않음 (catch블록에서 console.error 호출 금지)
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return migrate(undefined);
    }
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    // JSON 파싱 실패해도 조용히 초기값 반환
    return migrate(undefined);
  }
}

/**
 * AppState를 localStorage에 저장
 * - 성공: true
 * - QuotaExceededError: false 반환 (예외 전파 안 함)
 */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    // QuotaExceededError 또는 다른 setItem 에러
    // 예외를 조용히 먹고 false 반환
    return false;
  }
}

/**
 * 온보딩 완료 여부 확인
 * localStorage['jod:onboarded:v1'] === '1'이면 true
 */
export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 온보딩 완료 표시
 * localStorage['jod:onboarded:v1'] = '1' 저장
 */
export function setOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // 저장 실패해도 조용히 무시 (이미 저장되어 있거나 할당량 초과)
  }
}
