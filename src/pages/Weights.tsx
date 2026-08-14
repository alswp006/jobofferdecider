import { useMemo } from 'react';
import { Top, Paragraph, Spacing, Button, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { WeightSlider } from '@/components/WeightSlider';
import { useAppState } from '@/hooks/useAppState';
import { SCORE_LABELS } from '@/lib/constants';
import { DEFAULT_WEIGHTS } from '@/lib/types';
import type { Weights as WeightsType } from '@/lib/types';

const CATEGORIES: Array<keyof WeightsType> = [
  'money',
  'growth',
  'workLife',
  'stability',
  'culture',
  'commuteEase',
];

/**
 * 중요도(가중치) 설정 — 탭-루트.
 * ⚠️ 하단 탭바는 App.tsx가 렌더한다 — 이 페이지에서 FloatingTabBar를 또 렌더하지 마라(탭 중복).
 */
export default function Weights() {
  const { state, saveWeights, saveError, clearSaveError } = useAppState();
  const weights = state.weights;

  const isZeroSum = useMemo(() => CATEGORIES.every((key) => weights[key] === 0), [weights]);

  function handleChange(key: keyof WeightsType, value: number) {
    saveWeights({ ...weights, [key]: value });
  }

  function handleReset() {
    try {
      generateHapticFeedback({ type: 'success' });
    } catch {
      // SDK 브릿지 없는 환경(로컬/검수) — 무시
    }
    saveWeights(DEFAULT_WEIGHTS);
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>무엇이 더 중요한가요?</Top.TitleParagraph>} />}>
      <Paragraph.Text typography="st11" color="secondary">
        중요할수록 점수에 더 크게 반영돼요
      </Paragraph.Text>
      <Spacing size={24} />

      {CATEGORIES.map((key, idx) => (
        <div key={key}>
          <WeightSlider
            label={SCORE_LABELS[key]}
            value={weights[key]}
            onChange={(value) => handleChange(key, value)}
          />
          {idx < CATEGORIES.length - 1 && <Spacing size={16} />}
        </div>
      ))}

      <Spacing size={24} />

      {isZeroSum && (
        <>
          <Paragraph.Text typography="st11" color="secondary">
            하나 이상은 0보다 커야 정확해요
          </Paragraph.Text>
          <Spacing size={16} />
        </>
      )}

      <Button variant="weak" size="large" display="block" onClick={handleReset}>
        기본값으로 되돌리기
      </Button>
      <Spacing size={24} />

      <Toast
        open={saveError}
        position="bottom"
        text="저장하지 못했어요. 잠시 후 다시 시도해주세요"
        onClose={clearSaveError}
      />
    </ScreenScaffold>
  );
}
