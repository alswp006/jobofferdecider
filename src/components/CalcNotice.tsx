import { Paragraph } from "@toss/tds-mobile";

/** 계산 방식 고지 문구 — 화면마다 다시 쓰지 말고 이 상수를 참조한다. */
export const CALC_NOTICE_TEXT = "규칙 기반 계산 결과입니다";

/**
 * 계산 결과 고지 라벨.
 *
 * 이 앱은 생성형 AI를 쓰지 않고 결정론적 규칙 계산만 하므로
 * "AI가 생성한 결과입니다" 대신 이 고지를 결과 화면에 표시한다.
 */
export function CalcNotice() {
  return (
    <Paragraph.Text typography="st13" color="tertiary">
      {CALC_NOTICE_TEXT}
    </Paragraph.Text>
  );
}
