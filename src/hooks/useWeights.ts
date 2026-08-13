import { useState, useEffect } from "react";
import type { SaveResult, Weights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { loadWeights, saveWeights } from "@/lib/storage";

export function useWeights(): {
  isLoading: boolean;
  weights: Weights;
  save: (weights: Weights) => Promise<SaveResult>;
  wasReset: boolean;
  loadError: boolean;
} {
  const [isLoading, setIsLoading] = useState(true);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [wasReset, setWasReset] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = loadWeights();
        if (loaded) {
          const sum =
            loaded.money +
            loaded.remote +
            loaded.commute +
            loaded.growth +
            loaded.culture +
            loaded.stability;
          if (sum > 0) {
            setWeights(loaded);
            setWasReset(false);
          } else {
            setWeights(DEFAULT_WEIGHTS);
            setWasReset(true);
          }
        } else {
          setWeights(DEFAULT_WEIGHTS);
          setWasReset(true);
        }
        setLoadError(false);
      } catch {
        setWeights(DEFAULT_WEIGHTS);
        setWasReset(true);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const save = (w: Weights): SaveResult => {
    try {
      const result = saveWeights(w);
      if (result.ok) {
        setWeights(w);
        setWasReset(false);
      }
      return result;
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  };

  return {
    isLoading,
    weights,
    save,
    wasReset,
    loadError,
  };
}
