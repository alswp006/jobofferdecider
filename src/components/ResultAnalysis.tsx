// STUB — placeholder for packet-0014 coder. Not implemented yet (TDD red phase).
import type { ScoreResult } from "@/lib/types";

export interface ResultAnalysisProps {
  offerId: string;
  score: ScoreResult;
  unlocked: boolean;
  onUnlock: () => void;
}

export function ResultAnalysis(_props: ResultAnalysisProps) {
  return null;
}
