import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Button, Paragraph, Spacing, ListRow, AlertDialog, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { EmptyState, LoadingState } from "@/components/StateView";
import { AdSlot } from "@/components/AdSlot";
import { loadOffers, loadMeta, setCalcNoticeAcknowledged } from "@/lib/storage";
import { calcMonthlyNet } from "@/lib/calc";
import { formatNumber } from "@/lib/utils";
import type { Offer, RouteState } from "@/lib/types";

function monthlyNetOf(offer: Offer): number {
  return calcMonthlyNet({
    base: offer.baseSalaryManwon,
    bonus: offer.bonusManwon,
    welfare: offer.welfarePointManwon,
    remote: offer.remoteDaysPerWeek,
    commute: offer.commuteCostPerDayWon,
    lunch: offer.lunchCostPerDayWon,
  });
}

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

// Asset.ContentIcon은 name으로 CDN에서 아이콘을 조회한다 — 검증된 아이콘 키 목록이 없어
// 값을 지어내면 실제 브라우저에서 404/403으로 컴포넌트가 크래시한다(모르면 지어내지 말 것).
// 대신 의존성 없는 이모지 글리프로 빈 상태 아이콘을 대체한다.
function EmptyIcon({ glyph, label }: { glyph: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: "inline-flex",
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        borderRadius: 24,
        backgroundColor: "var(--adaptiveLayeredBackground)",
      }}
    >
      {glyph}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Offer | undefined>(undefined);
  const [targetOffers, setTargetOffers] = useState<Offer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(() => !loadMeta().calcNoticeAcknowledged);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const offers = loadOffers();
        setCurrentOffer(offers.find((o) => o.kind === "current"));
        setTargetOffers(offers.filter((o) => o.kind === "offer"));
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function handleConfirmNotice() {
    try {
      setCalcNoticeAcknowledged(true);
      setDialogOpen(false);
    } catch {
      setToast({ open: true, text: "저장 공간이 부족해요. 오퍼를 삭제 후 다시 시도해주세요." });
    }
  }

  function handleCardClick(targetOfferId: string) {
    fireTickWeak();
    const state: RouteState["/compare"] = { targetOfferId };
    navigate("/compare", { state });
  }

  function handleRetry() {
    setLoadError(false);
    setIsLoading(true);
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>이직 결정</Top.TitleParagraph>}
          right={
            <Button variant="weak" size="small" onClick={() => navigate("/weights")}>
              가중치
            </Button>
          }
        />
      }
    >
      {isLoading ? (
        <LoadingState rows={3} testId="home-skeleton" />
      ) : loadError ? (
        <>
          <Paragraph.Text typography="t5">정보를 불러오지 못했어요. 다시 시도해주세요.</Paragraph.Text>
          <Spacing size={12} />
          <Button variant="weak" onClick={handleRetry}>
            다시 시도
          </Button>
        </>
      ) : !currentOffer ? (
        <EmptyState
          testId="empty-state"
          icon={<EmptyIcon glyph="🏢" label="현재 직장 등록" />}
          title="현재 직장을 먼저 등록해요"
          description="연봉·통근·재택 정보를 넣으면 비교를 시작할 수 있어요"
          action={
            <Button
              variant="weak"
              display="block"
              style={{ height: 48 }}
              onClick={() => navigate("/offer/new", { state: { kind: "current" } })}
            >
              현재 직장 등록하기
            </Button>
          }
        />
      ) : (
        <>
          <SummaryHero
            testId="home-hero"
            label="현재 직장 월 실수령"
            value={<Amount value={monthlyNetOf(currentOffer)} unit="원" typography="t1" />}
            caption="복지포인트·통근·점심값 반영 추정치"
          />

          <Spacing size={24} />
          <Paragraph.Text typography="st13" color="tertiary">
            규칙 기반 계산 결과입니다
          </Paragraph.Text>
          <Spacing size={24} />
          <Paragraph.Text typography="t4">비교할 오퍼</Paragraph.Text>
          <Spacing size={12} />

          {targetOffers.length === 0 ? (
            <EmptyState
              testId="empty-state"
              icon={<EmptyIcon glyph="📭" label="오퍼 없음" />}
              title="아직 받은 오퍼가 없어요"
              description="제안받은 회사 정보를 등록하면 바로 비교할 수 있어요"
              action={
                <Button variant="weak" onClick={() => navigate("/offer/new", { state: { kind: "offer" } })}>
                  제안 직장 추가하기
                </Button>
              }
            />
          ) : (
            targetOffers.map((offer) => {
              const texts = (
                <ListRow.Texts
                  type="2RowTypeA"
                  top={offer.companyName}
                  bottom={`월 실수령 ${formatNumber(monthlyNetOf(offer))}원`}
                />
              );
              return (
                <ListRow
                  key={offer.id}
                  data-testid="offer-card"
                  style={{ minHeight: 64 }}
                  onClick={() => handleCardClick(offer.id)}
                  contents={texts}
                >
                  {texts}
                </ListRow>
              );
            })
          )}

          <Spacing size={16} />
          <AdSlot adGroupId="home-offer-list" />
        </>
      )}

      <AlertDialog
        open={dialogOpen}
        title="계산 방식 안내"
        description="입력값 기반 규칙 계산 결과예요. 세율은 구간 근사치로 추정해요."
        alertButton={<AlertDialog.AlertButton onClick={handleConfirmNotice}>확인</AlertDialog.AlertButton>}
        onClose={() => setDialogOpen(false)}
      />

      <Toast
        open={toast.open}
        text={toast.text}
        position="bottom"
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </ScreenScaffold>
  );
}
