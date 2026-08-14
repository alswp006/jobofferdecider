import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, CompanyProfile, Weights } from "@/lib/types";
import { MAX_OFFERS } from "@/lib/constants";
import { loadState, saveState } from "@/lib/storage";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAppState() {
  const stateRef = useRef<AppState>(loadState());
  const [state, setState] = useState<AppState>(stateRef.current);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    stateRef.current = loaded;
    setState(loaded);
    setLoading(false);
  }, []);

  const clearSaveError = useCallback(() => {
    setSaveError(false);
  }, []);

  const commit = useCallback((next: AppState): boolean => {
    const ok = saveState(next);
    stateRef.current = next;
    setState(next);
    setSaveError(!ok);
    return ok;
  }, []);

  const saveCurrent = useCallback(
    (profile: CompanyProfile): boolean => {
      return commit({ ...stateRef.current, current: profile });
    },
    [commit]
  );

  const saveOffer = useCallback(
    (offer: CompanyProfile): boolean => {
      const prev = stateRef.current;
      if (prev.offers.length >= MAX_OFFERS) {
        return false;
      }
      return commit({
        ...prev,
        offers: [...prev.offers, { ...offer, id: generateId() }],
      });
    },
    [commit]
  );

  const deleteOffer = useCallback(
    (id: string): boolean => {
      const prev = stateRef.current;
      return commit({
        ...prev,
        offers: prev.offers.filter((o) => o.id !== id),
        unlockedOfferIds: prev.unlockedOfferIds.filter((oid) => oid !== id),
      });
    },
    [commit]
  );

  const saveWeights = useCallback(
    (weights: Weights): boolean => {
      return commit({ ...stateRef.current, weights });
    },
    [commit]
  );

  const unlockOffer = useCallback(
    (offerId: string): boolean => {
      const prev = stateRef.current;
      if (prev.unlockedOfferIds.includes(offerId)) {
        return commit(prev);
      }
      return commit({
        ...prev,
        unlockedOfferIds: [...prev.unlockedOfferIds, offerId],
      });
    },
    [commit]
  );

  return {
    state,
    loading,
    saveError,
    clearSaveError,
    saveCurrent,
    saveOffer,
    deleteOffer,
    saveWeights,
    unlockOffer,
  };
}
