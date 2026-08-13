# JobOfferDecider

앱인토스 (Vite + React + TDS) 이직 제안을 받았을 때 연봉·복지·성장성을 점수화해 현재 직장과 수치로 비교하고, 최종 의사결정 분석표는 리워드 광고 후 공개 이직 제안을 받은 직장인이 '감으로만' 결정하거나, 연봉 계산만 하고 복지·통근·성장성 등 비금전적 요소를 체계적으로 비교하지 못해 후회하는 경우가 많음

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Compare` | Compare |
| `/Home` | Home |
| `/OfferForm` | OfferForm |
| `/Offers` | Offers |
| `/Rank` | Rank |
| `/Weights` | Weights |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-13
