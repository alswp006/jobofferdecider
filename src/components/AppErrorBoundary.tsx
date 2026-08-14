import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Paragraph, Spacing, Top } from '@toss/tds-mobile';
import { ScreenScaffold } from './ScreenScaffold';

/**
 * 렌더 예외를 잡아 흰 화면 대신 복구 화면을 보여주는 경계.
 * 검수 규칙상 console.error를 호출하지 않는다(에러는 onError로만 흘린다).
 *
 * 임시 구현 — 패킷 0017이 이 파일의 최종 버전을 소유한다.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode; onError?: (e: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>문제가 생겼어요</Top.TitleParagraph>} />}>
        <Paragraph.Text typography="t6">
          화면을 그리는 중에 멈췄어요. 다시 시도하면 대부분 해결돼요.
        </Paragraph.Text>
        <Spacing size={24} />
        <Button variant="fill" display="block" onClick={() => this.setState({ hasError: false })}>
          다시 시도
        </Button>
      </ScreenScaffold>
    );
  }
}
