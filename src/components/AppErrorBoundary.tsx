import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@toss/tds-mobile';
import { ScreenScaffold } from './ScreenScaffold';
import { EmptyState } from './StateView';

/**
 * 렌더 예외를 잡아 흰 화면 대신 복구 화면을 보여주는 경계.
 * 검수 규칙상 콘솔 에러 로그를 남기지 않는다(에러는 onError로만 흘린다).
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
      <ScreenScaffold>
        <EmptyState
          title="문제가 생겼어요"
          description="잠시 후 다시 시도해주세요"
          action={
            <Button variant="weak" onClick={() => this.setState({ hasError: false })}>
              다시 시도
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }
}
