// STUB — TDD red-phase placeholder for packet 0009.
// Intentionally unimplemented: throws so tests fail on behavior, not on unresolved imports.
// The Coder replaces this with the real implementation (see .ai-factory/spec.md packet 0009).

export interface ScoreSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreSelector(_props: ScoreSelectorProps): never {
  throw new Error("ScoreSelector: not implemented yet (TDD red phase — packet 0009)");
}
