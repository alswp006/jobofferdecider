// STUB — placeholder for packet-0005 coder. Not implemented yet (TDD red phase).
import type { Offer, SaveResult } from "@/lib/types";

export function useOffers(): {
  isLoading: boolean;
  offers: Offer[];
  current: Offer | undefined;
  save: (offer: Offer) => SaveResult;
  remove: (id: string) => void;
  refresh: () => void;
  loadError: boolean;
} {
  return {
    isLoading: false,
    offers: [],
    current: undefined,
    save: () => ({ ok: true }),
    remove: () => {},
    refresh: () => {},
    loadError: false,
  };
}
