# Sprint Contract: 광고 배치 컴포넌트 + 계산 고지 최종 폴리시

## 만들 항목
1. **src/components/AdSection.tsx** — 광고 섹션 래퍼. TDS Spacing으로 상하 여백(size="xxxl") 강제. 자식 콘텐츠만 렌더.
2. **src/components/CalcNotice.tsx** — '규칙 기반 계산 결과입니다' 고지. Paragraph.Text(typography="st13", color="secondary"). 문구 일원화 상수.
3. **src/hooks/useRewardGate.ts** — 리워드 광고 상태 훅. `{ isOpen, show(), close(), isLoading }` 반환. SDK `loadFullScreenAd`/`showFullScreenAd` 래핑(try/catch 필수).

## 사용 타입 (types.ts에서 import)
- 현재 types.ts 타입 그대로 사용. 새 타입 추가 불필요.

## 검증 방법
1. `pnpm typecheck` — zero errors
2. `pnpm test` — 관련 테스트 통과 (있으면)
3. Offers/Rank/Compare 페이지 각각에서 AdSection + CalcNotice 렌더링 수동 확인
4. useRewardGate hook 호출 시 SDK 예외 처리 확인 (try/catch 적용)

## 금지사항
- App.tsx, main.tsx, _app.tsx 수정 금지
- CalcNotice 문구 하드코딩 금지 (상수로 일원화)
- AdSection 내 margin/padding 직접 추가 금지 (TDS Spacing만 사용)
- useRewardGate에서 SDK 호출 시 가드 없이 throw 허용 금지
