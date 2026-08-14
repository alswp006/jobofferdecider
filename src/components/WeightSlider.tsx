import { Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import "./WeightSlider.css";

/**
 * 가중치 슬라이더 — TDS에 Slider가 없어 native input[type=range]를 래핑.
 *
 * Pre-built: 카테고리 중요도(0~100, 5단위) 입력에 사용. 색은 var(--tds-color-*)만.
 */
export function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    onChange(next);
    try {
      generateHapticFeedback({ type: "tickWeak" });
    } catch {
      // SDK 브릿지 없는 환경(로컬/검수) — 무시
    }
  };

  return (
    <div className="weight-slider">
      <div className="weight-slider__row">
        <Paragraph.Text typography="t5">{label}</Paragraph.Text>
        <Paragraph.Text typography="st11" color="secondary">
          {value}
        </Paragraph.Text>
      </div>
      <Spacing size={12} />
      <input
        className="weight-slider__input"
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={handleChange}
        aria-label={label}
        style={{
          background: `linear-gradient(to right, var(--tds-color-blue-500) ${value}%, var(--tds-color-grey-200) ${value}%)`,
        }}
      />
    </div>
  );
}
