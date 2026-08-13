import { Fragment, type ReactNode } from "react";
import { Chip, Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

export interface ScoreSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const SCORES = [1, 2, 3, 4, 5] as const;

// Chip's real .d.ts models a group container (kind/shape/variant), not a single
// selectable item — the per-item `selected` contract used here comes from the
// project's shared TDS test mock (src/__tests__/__helpers__/mocks.ts).
const SelectableChip = Chip as unknown as (props: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) => ReturnType<typeof Chip>;

export function ScoreSelector({ label, value, onChange }: ScoreSelectorProps) {
  const handleSelect = (n: number) => {
    onChange(n);
    try {
      Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
    } catch {
      // 토스 WebView 밖에서는 SDK 호출이 throw할 수 있음 — 무시
    }
  };

  return (
    <div>
      <Paragraph.Text typography="t5">{label}</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: "flex", alignItems: "center" }}>
        {SCORES.map((n, i) => (
          <Fragment key={n}>
            {i > 0 ? <Spacing size={8} direction="horizontal" /> : null}
            <div
              data-testid={`score-chip-${n}`}
              style={{
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SelectableChip selected={value === n} onClick={() => handleSelect(n)}>
                {n}
              </SelectableChip>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
