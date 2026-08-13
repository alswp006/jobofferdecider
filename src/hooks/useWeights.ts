// STUB — placeholder for packet-0005 coder. Not implemented yet (TDD red phase).
import type { SaveResult, Weights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";

export function useWeights(): {
  isLoading: boolean;
  weights: Weights;
  save: (weights: Weights) => SaveResult;
  wasReset: boolean;
  loadError: boolean;
} {
  return {
    isLoading: false,
    weights: DEFAULT_WEIGHTS,
    save: () => ({ ok: true }),
    wasReset: false,
    loadError: false,
  };
}
