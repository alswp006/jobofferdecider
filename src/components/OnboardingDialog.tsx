import { useEffect, useState } from 'react';
import { AlertDialog } from '@toss/tds-mobile';
import { ONBOARDED_KEY } from '@/lib/constants';

/**
 * 최초 1회만 뜨는 안내 다이얼로그.
 * props 없이 쓰면 스스로 노출 여부를 판단하고(localStorage), isOpen을 주면 그 값을 따른다.
 *
 * 임시 구현 — 패킷 0017이 이 파일의 최종 버전을 소유한다.
 */
export function OnboardingDialog({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isOpen !== undefined) return;
    try {
      if (window.localStorage.getItem(ONBOARDED_KEY) !== '1') setOpen(true);
    } catch {
      /* 스토리지 접근 불가(프라이빗 모드 등) — 안내를 건너뛴다 */
    }
  }, [isOpen]);

  const visible = isOpen ?? open;

  const close = () => {
    try {
      window.localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      /* 저장 실패해도 화면은 닫는다 */
    }
    setOpen(false);
    onClose?.();
  };

  return (
    <AlertDialog
      open={visible}
      title="입력한 조건은 이 기기에만 남아요"
      description="현재 직장과 오퍼를 넣으면 월 실질가치와 점수를 비교해 보여줘요. 서버로 전송하지 않아요."
      alertButton={<AlertDialog.AlertButton onClick={close}>닫기</AlertDialog.AlertButton>}
      onClose={close}
    />
  );
}
