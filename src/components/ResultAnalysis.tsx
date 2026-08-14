import { useEffect, useState } from "react";
import { Chip, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { TossRewardAd } from "@/components/TossRewardAd";
import type { ScoreResult } from "@/lib/types";

const AD_SLOT_ID = (import.meta.env.VITE_TOSS_AD_SLOT_ID as string) ?? "";

export interface ResultAnalysisProps {
  offerId: string;
  score: ScoreResult;
  unlocked: boolean;
  onUnlock: () => void;
}

function AnalysisBody({ score }: { score: ScoreResult }) {
  return (
    <>
      <Paragraph.Text typography="t4">항목별 점수</Paragraph.Text>
      <Spacing size={12} />
      {score.items.map((item) => (
        <div key={item.key} data-testid="analysis-row">
          <ListRow
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={item.label}
                bottom={`가중치 ${Math.round(item.weightRatio * 100)}%`}
              />
            }
            right={<Chip>{`${item.currentScore} → ${item.offerScore}`}</Chip>}
          />
        </div>
      ))}
      <Spacing size={24} />
      <Paragraph.Text typography="t4">협상 포인트 3가지</Paragraph.Text>
      <Spacing size={12} />
      {score.negotiationPoints.map((point) => (
        <div key={point} data-testid="negotiation-point">
          <ListRow contents={<ListRow.Texts type="1RowTypeA" top={point} />} />
        </div>
      ))}
    </>
  );
}

/**
 * 상세 분석표 + 협상 포인트. 미해금 오퍼는 TossRewardAd로 게이트하고,
 * 시청 완료 시 onUnlock(offerId 영구 해금)을 호출한다.
 */
export function ResultAnalysis({ score, unlocked, onUnlock }: ResultAnalysisProps) {
  const [revealed, setRevealed] = useState(unlocked);

  useEffect(() => {
    if (unlocked) setRevealed(true);
  }, [unlocked]);

  if (revealed) {
    return <AnalysisBody score={score} />;
  }

  return (
    <TossRewardAd
      slotId={AD_SLOT_ID}
      description="광고를 보면 상세 분석표를 볼 수 있어요"
      buttonText="광고 보고 확인하기"
      onRewarded={() => {
        setRevealed(true);
        onUnlock();
      }}
    >
      <AnalysisBody score={score} />
    </TossRewardAd>
  );
}
