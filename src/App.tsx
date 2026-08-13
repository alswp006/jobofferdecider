import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FloatingTabBar, type TabItem } from "@/components/FloatingTabBar";
import Home from "@/pages/Home";
import Offers from "@/pages/Offers";
import OfferForm from "@/pages/OfferForm";
import Weights from "@/pages/Weights";
import Compare from "@/pages/Compare";
import Rank from "@/pages/Rank";

const TABS: TabItem[] = [
  { label: "홈", path: "/" },
  { label: "오퍼", path: "/offers" },
  { label: "가중치", path: "/weights" },
];

// @AI:NOTE 입력 폼(/offer/new, /offer/:id/edit)과 비교 결과(/compare)는 하단 CTA를 쓰는
// 몰입 화면이라 탭바를 숨긴다 — 겹치면 1차 CTA를 가린다.
function shouldShowTabBar(pathname: string): boolean {
  return !(pathname === "/compare" || pathname.startsWith("/offer/"));
}

export default function App() {
  const { pathname } = useLocation();
  const showTabBar = shouldShowTabBar(pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/offer/new" element={<OfferForm />} />
        <Route path="/offer/:id/edit" element={<OfferForm />} />
        <Route path="/weights" element={<Weights />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/rank" element={<Rank />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showTabBar ? (
        <>
          {/* 고정 탭바에 본문 마지막 줄이 가리지 않도록 확보하는 여백 */}
          <div aria-hidden style={{ height: "calc(64px + env(safe-area-inset-bottom))" }} />
          <FloatingTabBar items={TABS} />
        </>
      ) : null}
    </>
  );
}
