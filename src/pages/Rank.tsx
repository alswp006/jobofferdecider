import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, Badge, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { EmptyState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { AdSlot } from "@/components/AdSlot";
import { getCurrentOffer, loadOffers, loadWeights } from "@/lib/storage";
import { buildScoreResult } from "@/lib/score";
import { DEFAULT_WEIGHTS, VERDICT_LABELS, type OfferKind, type Verdict } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const VERDICT_BADGE_COLOR: Record<Verdict, "blue" | "red" | "elephant"> = {
  strong_move: "blue",
  lean_move: "blue",
  neutral: "elephant",
  lean_stay: "red",
  strong_stay: "red",
};

interface RankRow {
  id: string;
  kind: OfferKind;
  companyName: string;
  total: number;
  monthlyNet: number;
  verdict?: Verdict;
  createdAt: number;
}

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Rank() {
  const navigate = useNavigate();

  const current = getCurrentOffer();
  const targetOffers = loadOffers().filter((o) => o.kind === "offer");

  function handleRowClick(targetOfferId: string) {
    fireTickWeak();
    navigate("/compare", { state: { targetOfferId } });
  }

  const body =
    !current || targetOffers.length === 0 ? (
      <EmptyState
        testId="empty-state"
        title="비교할 오퍼가 없어요"
        description="제안받은 회사 정보를 등록하면 순위를 확인할 수 있어요"
        action={
          <Button variant="weak" onClick={() => navigate("/offer/new", { state: { kind: "offer" } })}>
            오퍼 추가하기
          </Button>
        }
      />
    ) : (
      (() => {
        const weights = loadWeights() ?? DEFAULT_WEIGHTS;
        const results = targetOffers.map((offer) => buildScoreResult(current, offer, weights));

        const rows: RankRow[] = [
          {
            id: current.id,
            kind: "current",
            companyName: current.companyName,
            total: results[0]?.totalCurrent ?? 0,
            monthlyNet: results[0]?.money.currentMonthlyNetWon ?? 0,
            createdAt: current.createdAt,
          },
          ...targetOffers.map((offer, i) => ({
            id: offer.id,
            kind: "offer" as const,
            companyName: offer.companyName,
            total: results[i].totalTarget,
            monthlyNet: results[i].money.targetMonthlyNetWon,
            verdict: results[i].verdict,
            createdAt: offer.createdAt,
          })),
        ];

        const sortedRows = [...rows].sort((a, b) => b.total - a.total || a.createdAt - b.createdAt);

        return sortedRows.map((row, idx) => (
          <ListRow
            key={row.id}
            data-testid="rank-row"
            style={{ minHeight: 64 }}
            onClick={row.kind === "offer" ? () => handleRowClick(row.id) : undefined}
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={`${idx + 1}위 · ${row.companyName}`}
                bottom={`총점 ${row.total.toFixed(1)} · 월 실수령 ${formatNumber(row.monthlyNet)}원`}
              />
            }
            right={
              row.verdict ? (
                <Badge size="small" variant="weak" color={VERDICT_BADGE_COLOR[row.verdict]}>
                  {VERDICT_LABELS[row.verdict]}
                </Badge>
              ) : undefined
            }
          />
        ));
      })()
    );

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>오퍼 순위</Top.TitleParagraph>} />}
      bottom={
        <FloatingTabBar
          items={[
            { label: "홈", path: "/" },
            { label: "오퍼", path: "/offers" },
            { label: "순위", path: "/rank" },
          ]}
        />
      }
    >
      <Paragraph.Text typography="st13" color="tertiary">
        내 중요도 기준 총점 순이에요
      </Paragraph.Text>
      <Spacing size={16} />
      {body}
      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />
    </ScreenScaffold>
  );
}
