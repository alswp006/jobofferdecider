import { Button, Top } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState } from '@/components/StateView';

/**
 * 회사 정보 입력 (현재 직장 / 오퍼).
 * 임시 화면 — 패킷 0010이 이 파일의 최종 버전을 소유한다. 라우팅 확인용 골격만 둔다.
 */
export default function CompanyForm() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>회사 정보</Top.TitleParagraph>} />}>
      <EmptyState
        title="입력 화면을 준비하고 있어요"
        description="연봉·상여·통근 조건을 넣는 폼이 여기에 들어와요."
        action={
          <Button variant="weak" onClick={() => navigate('/')}>
            홈으로
          </Button>
        }
        testId="company-form-placeholder"
      />
    </ScreenScaffold>
  );
}
