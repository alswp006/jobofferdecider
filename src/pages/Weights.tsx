import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState } from '@/components/StateView';

/**
 * 중요도(가중치) 설정 — 탭-루트.
 * 임시 화면 — 패킷 0011이 이 파일의 최종 버전을 소유한다.
 * ⚠️ 하단 탭바는 App.tsx가 렌더한다 — 이 페이지에서 FloatingTabBar를 또 렌더하지 마라(탭 중복).
 */
export default function Weights() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>중요도</Top.TitleParagraph>} />}>
      <EmptyState
        title="중요도 슬라이더를 준비하고 있어요"
        description="연봉·성장성·워라밸·안정성·조직문화·통근 편의 6개를 여기서 조절해요."
        testId="weights-placeholder"
      />
    </ScreenScaffold>
  );
}
