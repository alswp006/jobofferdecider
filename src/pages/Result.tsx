import { Button, Top } from '@toss/tds-mobile';
import { useNavigate, useParams } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState } from '@/components/StateView';

/**
 * 오퍼 판정 결과 (/result/:offerId).
 * 임시 화면 — 패킷 0013/0014가 이 파일의 최종 버전을 소유한다.
 * offerId는 URL param으로만 받는다(location.state 금지 — 직접 진입 시 사라짐).
 */
export default function Result() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>판정 결과</Top.TitleParagraph>} />}>
      <EmptyState
        title="결과 화면을 준비하고 있어요"
        description={`오퍼 ${offerId ?? ''}의 점수 비교와 협상 포인트가 여기에 들어와요.`}
        action={
          <Button variant="weak" onClick={() => navigate('/')}>
            홈으로
          </Button>
        }
        testId="result-placeholder"
      />
    </ScreenScaffold>
  );
}
