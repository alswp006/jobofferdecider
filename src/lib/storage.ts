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

// ============================================================================
// Packet 0002: localStorage CRUD helpers for Offer & Weights
// ============================================================================

import type { Offer, Weights, UnlockState, AppMeta, SaveResult } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";

const MAX_OFFERS = 3;

let idCounter = 0;

/** Generate an offer id without relying on crypto.randomUUID (legacy WebView support) */
export function newOfferId(): string {
  idCounter += 1;
  return `o_${Date.now()}_${idCounter}`;
}

function safeSetItem<T>(key: string, value: T): SaveResult {
  try {
    setItem(key, value);
    return { ok: true };
  } catch {
    return { ok: false, error: "저장 공간이 부족합니다. 오퍼를 삭제 후 다시 시도해주세요." };
  }
}

/** Load all offers from storage, return [] on error (no throw) */
export function loadOffers(): Offer[] {
  const raw = getItem<Offer[]>(STORAGE_KEYS.OFFERS);
  return Array.isArray(raw) ? raw : [];
}

/**
 * Save offer to storage with validation:
 * - current kind: preserve id/createdAt, maintain singleton current
 * - offer kind: generate id as o_${Date.now()}_${counter}
 * - max 3 offers per array
 * - catch QuotaExceededError
 */
export function saveOffer(offer: Offer): SaveResult {
  const offers = loadOffers();
  const existing = offers.find((o) => o.id === offer.id && offer.id !== "");

  let toSave: Offer;
  if (offer.kind === "current") {
    toSave = existing
      ? { ...offer, id: existing.id, createdAt: existing.createdAt }
      : offer;
  } else {
    const isNew = !existing;
    if (isNew) {
      const offerCount = offers.filter((o) => o.kind === "offer").length;
      if (offerCount >= MAX_OFFERS) {
        return { ok: false, error: "제안 직장은 최대 3개까지 비교할 수 있어요" };
      }
      toSave = { ...offer, id: offer.id || newOfferId() };
    } else {
      toSave = offer;
    }
  }

  const withoutOldCurrent =
    toSave.kind === "current" ? offers.filter((o) => o.kind !== "current" || o.id === toSave.id) : offers;
  const hadSelf = withoutOldCurrent.some((o) => o.id === toSave.id);
  const nextOffers = hadSelf
    ? withoutOldCurrent.map((o) => (o.id === toSave.id ? toSave : o))
    : [...withoutOldCurrent, toSave];

  return safeSetItem(STORAGE_KEYS.OFFERS, nextOffers);
}

/**
 * Delete offer by id
 */
export function deleteOffer(id: string): void {
  const offers = loadOffers().filter((o) => o.id !== id);
  setItem(STORAGE_KEYS.OFFERS, offers);
}

export function getOfferById(id: string): Offer | undefined {
  return loadOffers().find((o) => o.id === id);
}

export function getCurrentOffer(): Offer | undefined {
  return loadOffers().find((o) => o.kind === "current");
}

/**
 * Save weights with validation: sum of 6 axes must be > 0
 */
export function saveWeights(weights: Weights): SaveResult {
  const sum =
    weights.money +
    weights.remote +
    weights.commute +
    weights.growth +
    weights.culture +
    weights.stability;

  if (sum <= 0) {
    return { ok: false, error: "중요도를 최소 1개 이상 1점 이상으로 설정해주세요" };
  }

  return safeSetItem(STORAGE_KEYS.WEIGHTS, weights);
}

/**
 * Load weights from storage, return null on error (no throw)
 */
export function loadWeights(): Weights | null {
  return getItem<Weights>(STORAGE_KEYS.WEIGHTS);
}

const DEFAULT_UNLOCK_STATE: UnlockState = { unlockedComparisonKeys: [], updatedAt: 0 };

export function loadUnlock(): UnlockState {
  const raw = getItem<UnlockState>(STORAGE_KEYS.UNLOCK);
  return raw && Array.isArray(raw.unlockedComparisonKeys) ? raw : DEFAULT_UNLOCK_STATE;
}

export function addUnlockKey(key: string): void {
  const state = loadUnlock();
  if (state.unlockedComparisonKeys.includes(key)) return;
  setItem(STORAGE_KEYS.UNLOCK, {
    unlockedComparisonKeys: [...state.unlockedComparisonKeys, key],
    updatedAt: Date.now(),
  });
}

const DEFAULT_APP_META: AppMeta = {
  schemaVersion: 1,
  calcNoticeAcknowledged: false,
  onboardedAt: null,
};

export function loadMeta(): AppMeta {
  const raw = getItem<AppMeta>(STORAGE_KEYS.META);
  return raw ?? DEFAULT_APP_META;
}

export function setCalcNoticeAcknowledged(value: boolean): void {
  const meta = loadMeta();
  setItem(STORAGE_KEYS.META, { ...meta, calcNoticeAcknowledged: value });
}
