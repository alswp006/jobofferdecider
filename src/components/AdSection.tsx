import { Spacing } from "@toss/tds-mobile";
import { AdSlot } from "@/components/AdSlot";

/**
 * 배너 광고 섹션 — 홈·순위·비교 하단 공통 배치용 래퍼.
 *
 * 상하 Spacing 24를 강제해 배너가 카드/CTA와 붙거나 겹치지 않게 한다.
 * position fixed/absolute를 쓰지 않으므로 항상 문서 흐름 안에 놓인다
 * (콘텐츠 위에 떠서 가리는 배치 금지 — SPEC 광고 배치 규칙).
 */
export function AdSection() {
  return (
    <>
      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />
      <Spacing size={24} />
    </>
  );
}
