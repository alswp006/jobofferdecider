import { Badge, Button, Chip, ChipItem, ListRow, Paragraph, Spacing, Top } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState } from '@/components/StateView';
import { Amount } from '@/components/Amount';
import { useAppState } from '@/hooks/useAppState';
import { calcMoney } from '@/lib/calc';
import { calcScore } from '@/lib/score';
import { getVerdict } from '@/lib/verdict';
import { formatNumber } from '@/lib/utils';

/** SDK는 WebView 밖에서 throw하므로 가드 필수 */
function fireHaptic(type: 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom) — 무시 */
  }
}

/**
 * 오퍼 비교 (/compare) — 현재 직장 + 최대 3개 오퍼를 한 표로 비교한다.
 */
export default function Compare() {
  const navigate = useNavigate();
  const { state } = useAppState();
  const { current, offers, weights } = state;

  if (!current || offers.length === 0) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>오퍼 비교</Top.TitleParagraph>} />}>
        <EmptyState
          title="비교할 오퍼가 없어요"
          description={
            !current
              ? '현재 직장 정보부터 입력해야 비교할 수 있어요'
              : '오퍼를 추가하면 현재 직장과 나란히 비교할 수 있어요'
          }
          action={
            <Button
              variant="weak"
              display="block"
              onClick={() => navigate(!current ? '/company/current' : '/company/offer/new')}
            >
              {!current ? '현재 직장 입력하기' : '오퍼 추가하기'}
            </Button>
          }
          testId="compare-empty"
        />
      </ScreenScaffold>
    );
  }

  const scores = offers.map((offer) => getVerdict(calcScore(current, offer, weights)!));
  const bestOfferId = scores.reduce((best, s) => (s.offerTotal > best.offerTotal ? s : best), scores[0]).offerId;
  const currentMoney = calcMoney(current);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오퍼 비교</Top.TitleParagraph>} />}>
      <Paragraph.Text typography="st11" color="secondary">
        월 실질가치와 종합 점수를 나란히 봐요
      </Paragraph.Text>
      <Spacing size={16} />

      <div data-testid="compare-row-current">
        <ListRow
          data-testid="compare-row"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`현재 · ${current.name}`}
              bottom={<Amount value={currentMoney.netMonthlyValue} unit="원" typography="t6" />}
            />
          }
          right={
            <Chip kind="action" size="small">
              <ChipItem>{`${scores[0].currentTotal}점`}</ChipItem>
            </Chip>
          }
        />
      </div>

      {offers.map((offer, i) => {
        const score = scores[i];
        const offerMoney = calcMoney(offer);
        const isBest = offer.id === bestOfferId;

        return (
          <div
            key={offer.id}
            data-testid={`compare-row-${offer.id}`}
            onClick={() => {
              fireHaptic('tickWeak');
              navigate(`/result/${offer.id}`);
            }}
          >
            <ListRow
              data-testid="compare-row"
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={offer.name}
                  bottom={<Amount value={offerMoney.netMonthlyValue} unit="원" typography="t6" />}
                />
              }
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {isBest ? (
                    <Badge size="small" variant="fill" color="blue">
                      추천
                    </Badge>
                  ) : null}
                  <Chip kind="action" size="small">
                    <ChipItem>{`${score.offerTotal}점 · ${score.verdictLabel}`}</ChipItem>
                  </Chip>
                </div>
              }
            />
          </div>
        );
      })}

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
