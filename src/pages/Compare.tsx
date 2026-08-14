import { Button, Top } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState } from '@/components/StateView';

/**
 * 오퍼 비교 (/compare).
 * 임시 화면 — 패킷 0015가 이 파일의 최종 버전을 소유한다.
 */
export default function Compare() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오퍼 비교</Top.TitleParagraph>} />}>
      <EmptyState
        title="비교 표를 준비하고 있어요"
        description="현재 직장과 오퍼를 한 화면에서 나란히 비교해요."
        action={
          <Button variant="weak" onClick={() => navigate('/')}>
            홈으로
          </Button>
        }
        testId="compare-placeholder"
      />
    </ScreenScaffold>
  );
}
