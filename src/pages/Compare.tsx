import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/StateView";
import { TossRewardAd } from "@/components/TossRewardAd";
import { AdSlot } from "@/components/AdSlot";
import { getCurrentOffer, getOfferById, loadWeights, loadUnlock, addUnlockKey } from "@/lib/storage";
import { buildScoreResult } from "@/lib/score";
import { DEFAULT_WEIGHTS, VERDICT_LABELS, AXIS_LABELS, type RouteState, type ScoreResult } from "@/lib/types";

function unlockKeyOf(currentOfferId: string, targetOfferId: string): string {
  return `${currentOfferId}:${targetOfferId}`;
}

function CompareDetail({ result }: { result: ScoreResult }) {
  return (
    <Card testId="compare-detail">
      {result.axes.map((axis) => (
        <div key={axis.axis}>
          <Paragraph.Text typography="st12">{AXIS_LABELS[axis.axis]}</Paragraph.Text>
          <Spacing size={2} />
          <Paragraph.Text typography="t6">
            {axis.normCurrent} → {axis.normTarget}
          </Paragraph.Text>
          <Spacing size={12} />
        </div>
      ))}
      {result.negotiationPoints.length > 0 ? (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="st11">협상 포인트</Paragraph.Text>
          <Spacing size={4} />
          {result.negotiationPoints.map((point, idx) => (
            <Paragraph.Text key={idx} typography="t6">
              {point}
            </Paragraph.Text>
          ))}
        </>
      ) : null}
    </Card>
  );
}

export default function Compare() {
  const location = useLocation();
  const navigate = useNavigate();
  const [adError, setAdError] = useState(false);
  const [adRetryKey, setAdRetryKey] = useState(0);
  const [unlockedNow, setUnlockedNow] = useState(false);

  const state = (location.state as RouteState["/compare"]) ?? null;
  const targetOffer = state ? getOfferById(state.targetOfferId) : undefined;

  if (!state || !targetOffer) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>비교 결과</Top.TitleParagraph>} />}>
        <EmptyState
          testId="compare-guard"
          title="어떤 오퍼를 비교할지 선택해주세요"
          description="홈에서 비교할 제안을 먼저 선택해주세요"
          action={
            <Button variant="weak" onClick={() => navigate("/", { replace: true })}>
              홈으로 가기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const currentOffer = getCurrentOffer();

  if (!currentOffer) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>비교 결과</Top.TitleParagraph>} />}>
        <EmptyState
          title="현재 직장부터 등록해주세요"
          description="비교하려면 현재 직장 정보가 필요해요"
          action={
            <Button
              variant="weak"
              onClick={() => navigate("/offer/new", { state: { kind: "current" } })}
            >
              현재 직장 등록하기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const weights = loadWeights() ?? DEFAULT_WEIGHTS;
  const result = buildScoreResult(currentOffer, targetOffer, weights);
  const key = unlockKeyOf(currentOffer.id, targetOffer.id);
  const isUnlocked = unlockedNow || loadUnlock().unlockedComparisonKeys.includes(key);
  console.log("DEBUG Compare render, isUnlocked=", isUnlocked, "adError=", adError);

  function handleUnlock() {
    addUnlockKey(key);
    setUnlockedNow(true);
  }

  function handleAdError() {
    setAdError(true);
  }

  function handleRetry() {
    setAdError(false);
    setAdRetryKey((k) => k + 1);
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>비교 결과</Top.TitleParagraph>} />}>
      {isUnlocked ? (
        <>
          <SummaryHero
            label={VERDICT_LABELS[result.verdict]}
            value={<Amount value={result.money.diffMonthlyWon} unit="원" typography="t1" />}
            caption="월 실수령 차액 (제안 - 현재)"
          />
          <Spacing size={12} />
          <Paragraph.Text typography="st13" color="var(--adaptiveGrey600)">
            규칙 기반 계산 결과입니다
          </Paragraph.Text>
          <Spacing size={24} />
          <CompareDetail result={result} />
        </>
      ) : (
        <>
          <SummaryHero
            label="비교 결과"
            value={<Paragraph.Text typography="t2">광고를 보면 바로 확인할 수 있어요</Paragraph.Text>}
            caption={`${currentOffer.companyName} vs ${targetOffer.companyName}`}
          />
          <Spacing size={24} />
          {adError ? (
            <>
              <Toast
                open
                position="bottom"
                text="광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요."
                onClose={() => setAdError(false)}
              />
              <Button variant="weak" display="block" onClick={handleRetry}>
                다시 시도
              </Button>
            </>
          ) : (
            <TossRewardAd
              key={adRetryKey}
              slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}
              buttonText="광고 보고 결과 보기"
              onRewarded={handleUnlock}
              onError={handleAdError}
            >
              <Button variant="fill" size="large" display="block">
                광고 보고 결과 보기
              </Button>
            </TossRewardAd>
          )}
        </>
      )}
      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />
    </ScreenScaffold>
  );
}
