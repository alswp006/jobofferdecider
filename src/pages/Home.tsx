import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Button, Chip, ChipItem, ListRow, Paragraph, Spacing, Top } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { EmptyState, LoadingState } from '@/components/StateView';
import { AdSlot } from '@/components/AdSlot';
import { useAppState } from '@/hooks/useAppState';
import { calcMoney } from '@/lib/calc';
import { calcScore } from '@/lib/score';
import { getVerdict } from '@/lib/verdict';
import { MAX_OFFERS } from '@/lib/constants';

/** SDK는 WebView 밖에서 throw하므로 가드 필수 */
function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom) — 무시 */
  }
}

/**
 * 홈 (S1, 탭-루트) — 현재 직장 실질가치 요약 + 오퍼 목록.
 * 하단 탭바는 App.tsx의 TabRootLayout이 렌더한다 — 여기서 또 렌더하지 않는다.
 */
export default function Home() {
  const navigate = useNavigate();
  const { state, loading } = useAppState();
  const { current, offers, weights } = state;
  const [maxDialogOpen, setMaxDialogOpen] = useState(false);

  function handleAddOffer() {
    if (offers.length >= MAX_OFFERS) {
      setMaxDialogOpen(true);
      return;
    }
    fireHaptic('success');
    navigate('/company/offer/new');
  }

  function handleOfferTap(offerId: string) {
    fireHaptic('tickWeak');
    navigate(`/result/${offerId}`);
  }

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>이직 판단기</Top.TitleParagraph>} />}>
        <LoadingState rows={3} testId="home-loading" />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>이직 판단기</Top.TitleParagraph>} />}>
      {current ? (
        <SummaryHero
          label={`현재 직장 · ${current.name}`}
          value={<Amount value={calcMoney(current).netMonthlyValue} unit="원" typography="t1" />}
          caption="세후·통근·식대까지 반영한 월 실질가치예요"
          testId="current-card"
        />
      ) : (
        <EmptyState
          title="현재 직장부터 입력해요"
          description="비교하려면 지금 다니는 회사 정보가 필요해요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate('/company/current')}>
              현재 직장 입력하기
            </Button>
          }
          testId="empty-current"
        />
      )}

      <Spacing size={24} />

      <Paragraph.Text typography="t4">
        받은 오퍼 {offers.length}/{MAX_OFFERS}
      </Paragraph.Text>
      <Spacing size={12} />

      {offers.length === 0 ? (
        <EmptyState
          title="아직 오퍼가 없어요"
          description="제안받은 회사를 추가해 비교해봐요"
          testId="empty-offers"
        />
      ) : (
        <div data-testid="offer-list">
          {offers.map((offer) => {
            const netMonthlyValue = calcMoney(offer).netMonthlyValue;
            const score = current ? calcScore(current, offer, weights) : null;
            const verdictLabel = score ? getVerdict(score).verdictLabel : null;

            return (
              <ListRow
                key={offer.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={offer.name}
                    bottom={<Amount value={netMonthlyValue} unit="원" typography="t6" />}
                  />
                }
                right={
                  verdictLabel ? (
                    <Chip kind="action" size="small">
                      <ChipItem>{verdictLabel}</ChipItem>
                    </Chip>
                  ) : undefined
                }
                onClick={() => handleOfferTap(offer.id)}
              />
            );
          })}
        </div>
      )}

      <Spacing size={16} />
      <AdSlot adGroupId="home-offer-list" />
      <Spacing size={24} />

      <Button variant="fill" size="large" display="block" onClick={handleAddOffer}>
        오퍼 추가하기
      </Button>
      <Spacing size={24} />

      <AlertDialog
        open={maxDialogOpen}
        title="오퍼는 3개까지 담을 수 있어요"
        description="오퍼 하나를 지우고 다시 추가해보세요"
        alertButton={
          <AlertDialog.AlertButton onClick={() => setMaxDialogOpen(false)}>닫기</AlertDialog.AlertButton>
        }
        onClose={() => setMaxDialogOpen(false)}
      />
    </ScreenScaffold>
  );
}
