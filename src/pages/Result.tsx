import { Badge, Button, Paragraph, Spacing, Top } from '@toss/tds-mobile';
import { useNavigate, useParams } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { EmptyState } from '@/components/StateView';
import { AdSlot } from '@/components/AdSlot';
import { useAppState } from '@/hooks/useAppState';
import { calcScore } from '@/lib/score';
import { getVerdict } from '@/lib/verdict';
import type { VerdictLevel } from '@/lib/types';

const AD_GROUP_ID = (import.meta.env.VITE_TOSS_AD_GROUP_ID as string) ?? '';

const VERDICT_BADGE_COLOR: Record<VerdictLevel, 'blue' | 'teal' | 'elephant' | 'red'> = {
  MOVE: 'blue',
  CONDITIONAL: 'teal',
  HOLD: 'elephant',
  STAY: 'red',
};

/**
 * 오퍼 판정 결과 공개 영역 (/result/:offerId).
 * offerId는 URL param으로만 받는다(location.state 금지 — 직접 진입 시 사라짐).
 * 리워드 게이트로 잠기는 영역(협상 포인트 등)은 0014가 채운다.
 */
export default function Result() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { state } = useAppState();

  const offer = state.offers.find((o) => o.id === offerId) ?? null;

  if (!offer) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>판정 결과</Top.TitleParagraph>} />}>
        <EmptyState
          title="오퍼를 찾을 수 없어요"
          description="삭제됐거나 잘못된 링크예요."
          action={
            <Button variant="weak" onClick={() => navigate('/', { replace: true })}>
              홈으로
            </Button>
          }
          testId="not-found"
        />
      </ScreenScaffold>
    );
  }

  if (!state.current) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{offer.name} 비교 결과</Top.TitleParagraph>} />}>
        <EmptyState
          title="현재 직장을 먼저 입력해주세요"
          description="현재 직장 정보가 있어야 오퍼와 비교할 수 있어요."
          action={
            <Button variant="weak" onClick={() => navigate('/company/current')}>
              현재 직장 입력하기
            </Button>
          }
          testId="current-missing"
        />
      </ScreenScaffold>
    );
  }

  const score = getVerdict(calcScore(state.current, offer, state.weights)!);
  const diffMoney = score.offerMoney.netMonthlyValue - score.currentMoney.netMonthlyValue;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>{offer.name} 비교 결과</Top.TitleParagraph>} />}>
      <SummaryHero
        label={
          <Badge size="medium" variant="fill" color={VERDICT_BADGE_COLOR[score.verdict]}>
            {score.verdictLabel}
          </Badge>
        }
        value={<Amount value={diffMoney} unit="원" typography="t1" testId="net-diff" />}
        caption="현재 대비 월 실질가치 차이예요"
        testId="result-hero"
      />
      <Spacing size={24} />
      <Card testId="score-card">
        <Paragraph.Text typography="st11">종합 점수</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t5">
          {`현재 ${score.currentTotal}점 · 오퍼 ${score.offerTotal}점`}
        </Paragraph.Text>
      </Card>
      <Spacing size={16} />
      {/* 리워드 게이트 슬롯 — 0014가 협상 포인트 등을 채운다 */}
      <Spacing size={16} />
      <Paragraph.Text typography="st11" color="tertiary">
        세율은 구간별 근사치예요. 규칙 기반 계산 결과이며 재무·커리어 자문이 아니에요
      </Paragraph.Text>
      <Spacing size={16} />
      <AdSlot adGroupId={AD_GROUP_ID} />
      <Spacing size={24} />
    </ScreenScaffold>
  );
}
