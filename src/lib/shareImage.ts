// STUB — placeholder for packet-0013 coder. Not implemented yet (TDD red phase).
import type { ScoreResult } from "@/lib/types";

export type CompanyNames = { current: string; target: string };

export async function saveResultImage(
  _result: ScoreResult,
  _companyNames: CompanyNames,
): Promise<boolean> {
  return false;
}
