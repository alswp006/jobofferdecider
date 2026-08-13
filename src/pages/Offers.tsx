import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Tab, Spacing, Paragraph, ListRow, IconButton, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { EmptyState, LoadingState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { loadOffers } from "@/lib/storage";
import type { Offer, OfferKind } from "@/lib/types";

const MAX_OFFERS = 3;

/** SDK는 WebView 밖에서 throw하므로 가드 필수 — 탭 전환/추가 버튼은 tickWeak. */
function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

type LoadStatus = "loading" | "error" | "ready";

export default function Offers() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const load = useCallback(() => {
    try {
      const next = loadOffers();
      setOffers(next);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTabChange = (nextIdx: number) => {
    fireTickWeak();
    setIdx(nextIdx);
  };

  const current = offers.find((o) => o.kind === "current");
  const offerList = offers.filter((o) => o.kind === "offer");
  const offerCount = offerList.length;
  const rows = idx === 0 ? (current ? [current] : []) : offerList;
  const atMax = idx === 1 && offerCount >= MAX_OFFERS;

  const handleAdd = () => {
    fireTickWeak();
    const kind: OfferKind = idx === 0 ? "current" : "offer";
    navigate("/offer/new", { state: { kind } });
  };

  const handleEdit = (id: string) => {
    navigate(`/offer/${id}/edit`);
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>내 직장·오퍼</Top.TitleParagraph>} />}
      bottom={
        <FloatingTabBar
          items={[
            { label: "홈", path: "/" },
            { label: "오퍼", path: "/offers" },
          ]}
        />
      }
    >
      <Tab onChange={handleTabChange}>
        <Tab.Item selected={idx === 0} onClick={() => handleTabChange(0)}>
          현재 직장
        </Tab.Item>
        <Tab.Item selected={idx === 1} onClick={() => handleTabChange(1)}>
          받은 오퍼 {offerCount}/3
        </Tab.Item>
      </Tab>

      <Spacing size={16} />

      {status === "loading" && <LoadingState rows={2} testId="offers-skeleton" />}

      {status === "error" && (
        <Card testId="offers-error">
          <Paragraph.Text typography="t5">
            목록을 불러오지 못했어요. 다시 시도해주세요.
          </Paragraph.Text>
          <Spacing size={12} />
          <Button variant="weak" display="block" onClick={load}>
            다시 시도
          </Button>
        </Card>
      )}

      {status === "ready" && rows.length === 0 && (
        <EmptyState
          testId="offers-empty"
          title={idx === 0 ? "등록한 현재 직장이 없어요" : "등록한 오퍼가 없어요"}
          description={
            idx === 0
              ? "현재 직장을 등록하면 오퍼와 바로 비교할 수 있어요"
              : "오퍼를 추가하면 현재 직장과 바로 비교할 수 있어요"
          }
        />
      )}

      {status === "ready" && rows.length > 0 && (
        <Card testId="offers-list">
          {rows.map((o) => (
            <ListRow
              key={o.id}
              onClick={() => handleEdit(o.id)}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={o.companyName}
                  bottom={`연봉 ${o.baseSalaryManwon}만원 · 통근 편도 ${o.commuteMinutesOneWay}분`}
                />
              }
              right={
                <IconButton
                  aria-label="수정"
                  name="iconEditRegular"
                  onClick={() => handleEdit(o.id)}
                />
              }
            />
          ))}
        </Card>
      )}

      <Spacing size={24} />

      <Button variant="fill" display="block" disabled={atMax} onClick={handleAdd}>
        {idx === 0 ? "현재 직장 등록하기" : "오퍼 추가하기"}
      </Button>

      {atMax && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
            오퍼는 최대 3개까지 담을 수 있어요
          </Paragraph.Text>
        </>
      )}

      <Spacing size={32} />
    </ScreenScaffold>
  );
}
