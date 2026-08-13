import { useState, useEffect } from "react";
import type { Offer, SaveResult } from "@/lib/types";
import { loadOffers, saveOffer, deleteOffer } from "@/lib/storage";

export function useOffers(): {
  isLoading: boolean;
  offers: Offer[];
  current: Offer | undefined;
  save: (offer: Offer) => SaveResult;
  remove: (id: string) => void;
  refresh: () => void;
  loadError: boolean;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadError, setLoadError] = useState(false);

  const current = offers.find((o) => o.kind === "current");

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.resolve(); // Ensure isLoading stays true for at least 1 tick

        // Detect storage corruption by checking raw value
        const rawValue = localStorage.getItem("jod.offers.v1");
        if (rawValue) {
          try {
            JSON.parse(rawValue);
          } catch {
            // Raw JSON is corrupted
            setLoadError(true);
            setOffers([]);
            setIsLoading(false);
            return;
          }
        }

        const loaded = loadOffers();
        setOffers(loaded);
        setLoadError(false);
      } catch {
        setLoadError(true);
        setOffers([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const save = (offer: Offer): SaveResult => {
    try {
      const result = saveOffer(offer);
      if (result.ok) {
        const loaded = loadOffers();
        setOffers(loaded);
      }
      return result;
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  };

  const remove = (id: string): void => {
    try {
      deleteOffer(id);
      const loaded = loadOffers();
      setOffers(loaded);
    } catch {
      // silently fail
    }
  };

  const refresh = (): void => {
    try {
      const loaded = loadOffers();
      setOffers(loaded);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  return {
    isLoading,
    offers,
    current,
    save,
    remove,
    refresh,
    loadError,
  };
}
