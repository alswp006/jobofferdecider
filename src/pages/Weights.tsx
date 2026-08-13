import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { LoadingState } from "@/components/StateView";
import { useWeights } from "@/hooks/useWeights";
import { AXIS_ORDER, AXIS_LABELS, type Axis, type Weights } from "@/lib/types";

/** SDK는 WebView 밖에서 throw하므로 가드 필수 — +/- 조절은 tickWeak. */
function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function clamp(value: number): number {
  return Math.min(10, Math.max(0, value));
}

function toValues(weights: Weights): Record<Axis, number> {
  return {
    money: weights.money,
    remote: weights.remote,
    commute: weights.commute,
    growth: weights.growth,
    culture: weights.culture,
    stability: weights.stability,
  };
}

const adjustButtonStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  borderRadius: 8,
  border: "1px solid var(--adaptiveGrey300)",
  backgroundColor: "var(--adaptiveBackground)",
  color: "var(--adaptiveGrey900)",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function WeightsPage() {
  const navigate = useNavigate();
  const { isLoading, weights, save, wasReset, loadError } = useWeights();
  const [values, setValues] = useState<Record<Axis, number>>(() => toValues(weights));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setValues(toValues(weights));
    }
  }, [isLoading, weights]);

  const sum = AXIS_ORDER.reduce((acc, axis) => acc + values[axis], 0);
  const showResetNotice = wasReset || loadError;

  function adjust(axis: Axis, delta: number) {
    fireTickWeak();
    setValues((prev) => ({ ...prev, [axis]: clamp(prev[axis] + delta) }));
  }

  function handleSave() {
    if (sum === 0) return;
    const result = save({ ...values, updatedAt: Date.now() });
    if (result.ok) {
      setSaved(true);
      navigate("/");
    }
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>무엇이 더 중요한가요?</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="저장하기" onClick={handleSave} disabled={sum === 0} />}
    >
      <Paragraph.Text typography="st13" color="var(--adaptiveGrey600)">
        중요도는 0~10점으로 조절할 수 있어요
      </Paragraph.Text>
      <Spacing size={16} />

      {isLoading ? (
        <LoadingState rows={6} testId="weights-skeleton" />
      ) : (
        <>
          {showResetNotice && (
            <>
              <Paragraph.Text typography="st13" color="var(--adaptiveGrey600)">
                이전 설정을 불러오지 못해 기본값으로 시작해요
              </Paragraph.Text>
              <Spacing size={12} />
            </>
          )}

          {AXIS_ORDER.map((axis) => (
            <div key={axis} data-testid={`weight-row-${axis}`}>
              <ListRow
                contents={<ListRow.Texts type="1RowTypeA" top={AXIS_LABELS[axis]} />}
                right={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      aria-label={`${AXIS_LABELS[axis]} 낮추기`}
                      onClick={() => adjust(axis, -1)}
                      disabled={values[axis] <= 0}
                      style={adjustButtonStyle}
                    >
                      －
                    </button>
                    <Paragraph.Text typography="t5" data-testid={`weight-value-${axis}`}>
                      {values[axis]}
                    </Paragraph.Text>
                    <button
                      type="button"
                      aria-label={`${AXIS_LABELS[axis]} 높이기`}
                      onClick={() => adjust(axis, 1)}
                      disabled={values[axis] >= 10}
                      style={adjustButtonStyle}
                    >
                      ＋
                    </button>
                  </div>
                }
              />
            </div>
          ))}

          {sum === 0 && (
            <>
              <Spacing size={12} />
              <Paragraph.Text typography="st13" color="var(--adaptiveRed500)">
                중요도를 최소 1개 이상 1점 이상으로 설정해주세요
              </Paragraph.Text>
            </>
          )}

          <Spacing size={24} />
        </>
      )}

      <Toast open={saved} position="bottom" text="중요도를 저장했어요" onClose={() => setSaved(false)} />
    </ScreenScaffold>
  );
}
