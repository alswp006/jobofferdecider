import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { FloatingTabBar, type TabItem } from '@/components/FloatingTabBar';
import Home from '@/pages/Home';
import CompanyForm from '@/pages/CompanyForm';
import Weights from '@/pages/Weights';
import Result from '@/pages/Result';
import Compare from '@/pages/Compare';

/**
 * 앱 라우팅 소유 파일. BrowserRouter는 main.tsx(@AI:ANCHOR)에 이미 있으므로 여기서는 Routes만 그린다.
 *
 * 규칙:
 * - 화면 간 데이터 전달은 URL param + localStorage만 쓴다. location.state 사용 금지
 *   (직접 URL 진입·새로고침 시 state가 사라져 빈 화면이 된다).
 * - 하단 탭바는 이 파일의 탭-루트 레이아웃만 렌더한다. 페이지에서 또 렌더하면 탭이 겹친다.
 */

/** 탭-루트 2개 — 이 경로에서만 하단 탭바가 보인다. */
const TABS: TabItem[] = [
  { label: '홈', path: '/' },
  { label: '중요도', path: '/weights' },
];

/** 탭-루트 레이아웃 — 본문 + 고정 탭바. 탭바 높이만큼 하단 여백을 줘 본문 끝이 가리지 않게 한다. */
function TabRootLayout() {
  return (
    <>
      <div style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </div>
      <FloatingTabBar items={TABS} />
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route element={<TabRootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/weights" element={<Weights />} />
        </Route>

        <Route path="/company/current" element={<CompanyForm />} />
        <Route path="/company/offer/new" element={<CompanyForm />} />
        <Route path="/company/offer/:id" element={<CompanyForm />} />
        <Route path="/result/:offerId" element={<Result />} />
        <Route path="/compare" element={<Compare />} />

        {/* 알 수 없는 경로 — 404 흰 화면 대신 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <OnboardingDialog />
    </AppErrorBoundary>
  );
}
