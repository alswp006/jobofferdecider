import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertDialog,
  Button,
  Chip,
  ChipItem,
  Paragraph,
  Spacing,
  TextField,
  Toast,
  Top,
} from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { MAX_OFFERS, SCORE_LABELS } from '@/lib/constants';
import { emptyDraft, parseWon, validateProfile } from '@/lib/form';
import { loadState, saveState } from '@/lib/storage';
import type { AppState, CompanyProfile, NonMonetaryRatings, ProfileDraft } from '@/lib/types';

/** 비금전 평가 5항목 — 표시 순서는 spec 순서(성장성/워라밸/안정성/조직문화/통근 편의)를 따른다 */
const RATING_FIELDS: { key: keyof NonMonetaryRatings; label: string }[] = [
  { key: 'growth', label: SCORE_LABELS.growth },
  { key: 'workLife', label: SCORE_LABELS.workLife },
  { key: 'stability', label: SCORE_LABELS.stability },
  { key: 'culture', label: SCORE_LABELS.culture },
  { key: 'commuteEase', label: SCORE_LABELS.commuteEase },
];

type NumericFieldKey =
  | 'baseSalary'
  | 'bonusPerYear'
  | 'remoteDaysPerWeek'
  | 'commuteMinutesOneWay'
  | 'commuteCostPerDay'
  | 'lunchCostPerDay'
  | 'mealSupportPerMonth'
  | 'welfarePointsPerYear';

const NUMERIC_FIELDS: { key: NumericFieldKey; label: string; placeholder: string; help: string }[] = [
  { key: 'baseSalary', label: '연봉(세전)', placeholder: '예: 60,000,000', help: '상여를 뺀 금액이에요' },
  { key: 'bonusPerYear', label: '연간 상여·인센티브', placeholder: '예: 6,000,000', help: '세전 금액이에요' },
  { key: 'remoteDaysPerWeek', label: '주당 재택 일수', placeholder: '예: 2', help: '0~5일 사이로 적어주세요' },
  { key: 'commuteMinutesOneWay', label: '편도 통근 시간(분)', placeholder: '예: 40', help: '편도 기준이에요' },
  { key: 'commuteCostPerDay', label: '하루 왕복 교통비', placeholder: '예: 3,000', help: '왕복 기준이에요' },
  { key: 'lunchCostPerDay', label: '하루 점심값', placeholder: '예: 9,000', help: '평균 하루 점심값이에요' },
  { key: 'mealSupportPerMonth', label: '월 식대 지원금', placeholder: '예: 100,000', help: '회사가 지원하는 금액이에요' },
  { key: 'welfarePointsPerYear', label: '연간 복지포인트', placeholder: '예: 1,200,000', help: '연간 지급 총액이에요' },
];

function toDraft(profile: CompanyProfile): ProfileDraft {
  return {
    name: profile.name,
    baseSalary: String(profile.baseSalary),
    bonusPerYear: String(profile.bonusPerYear),
    remoteDaysPerWeek: String(profile.remoteDaysPerWeek),
    commuteMinutesOneWay: String(profile.commuteMinutesOneWay),
    commuteCostPerDay: String(profile.commuteCostPerDay),
    lunchCostPerDay: String(profile.lunchCostPerDay),
    mealSupportPerMonth: String(profile.mealSupportPerMonth),
    welfarePointsPerYear: String(profile.welfarePointsPerYear),
    ratings: profile.ratings,
  };
}

function generateOfferId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offer-${Math.random().toString(16).slice(2)}`;
}

/**
 * 회사 정보 입력 (현재 직장 / 오퍼 신규 / 오퍼 편집).
 * 데이터 전달은 URL param + localStorage로만 한다(location.state 미사용).
 */
export default function CompanyForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();

  // eslint-disable-next-line no-console
  console.log('DEBUG pathname:', JSON.stringify(location.pathname), 'params:', JSON.stringify(params));
  const isCurrent = location.pathname === '/company/current';
  const offerId = isCurrent ? undefined : params.id;

  const [appState] = useState<AppState>(() => loadState());

  const existingProfile = useMemo(() => {
    if (isCurrent) return appState.current;
    if (offerId) return appState.offers.find((o) => o.id === offerId) ?? null;
    return null;
  }, [appState, isCurrent, offerId]);

  const [draft, setDraft] = useState<ProfileDraft>(() =>
    existingProfile ? toDraft(existingProfile) : emptyDraft(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const offerExists = !isCurrent && Boolean(offerId) && existingProfile !== null;

  function setField(key: keyof Omit<ProfileDraft, 'ratings'>, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setRating(key: keyof NonMonetaryRatings, value: 1 | 2 | 3 | 4 | 5) {
    setDraft((prev) => ({ ...prev, ratings: { ...prev.ratings, [key]: value } }));
  }

  function handleSave() {
    const validationErrors = validateProfile(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const profile: CompanyProfile = {
      id: isCurrent ? 'current' : (offerId ?? generateOfferId()),
      name: draft.name,
      baseSalary: parseWon(draft.baseSalary),
      bonusPerYear: parseWon(draft.bonusPerYear),
      remoteDaysPerWeek: parseWon(draft.remoteDaysPerWeek),
      commuteMinutesOneWay: parseWon(draft.commuteMinutesOneWay),
      commuteCostPerDay: parseWon(draft.commuteCostPerDay),
      lunchCostPerDay: parseWon(draft.lunchCostPerDay),
      mealSupportPerMonth: parseWon(draft.mealSupportPerMonth),
      welfarePointsPerYear: parseWon(draft.welfarePointsPerYear),
      ratings: draft.ratings,
      updatedAt: new Date().toISOString(),
    };

    const latest = loadState();
    let next: AppState;

    if (isCurrent) {
      next = { ...latest, current: profile };
    } else {
      const isEditing = latest.offers.some((o) => o.id === profile.id);
      if (!isEditing && latest.offers.length >= MAX_OFFERS) {
        setToastOpen(true);
        return;
      }
      next = {
        ...latest,
        offers: isEditing
          ? latest.offers.map((o) => (o.id === profile.id ? profile : o))
          : [...latest.offers, profile],
      };
    }

    if (!saveState(next)) {
      setToastOpen(true);
      return;
    }

    navigate('/');
  }

  function handleDeleteConfirm() {
    if (!offerId) return;
    const latest = loadState();
    const next: AppState = {
      ...latest,
      offers: latest.offers.filter((o) => o.id !== offerId),
      unlockedOfferIds: latest.unlockedOfferIds.filter((id) => id !== offerId),
    };
    saveState(next);
    setDeleteOpen(false);
    navigate('/');
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>{isCurrent ? '현재 직장' : '제안받은 회사'}</Top.TitleParagraph>}
          right={
            offerExists ? (
              <Button variant="weak" size="small" color="danger" onClick={() => setDeleteOpen(true)}>
                삭제
              </Button>
            ) : undefined
          }
        />
      }
      bottom={<SubmitFooter label="저장하기" onClick={handleSave} />}
    >
      <TextField
        variant="box"
        label="회사명"
        placeholder="예: 토스"
        value={draft.name}
        onChange={(e) => setField('name', e.target.value)}
        help="1~20자로 적어주세요"
        hasError={Boolean(errors.name)}
      />
      <Spacing size={12} />

      {NUMERIC_FIELDS.slice(0, 2).map((field) => (
        <div key={field.key}>
          <TextField
            variant="box"
            label={field.label}
            placeholder={field.placeholder}
            inputMode="numeric"
            type="text"
            value={draft[field.key]}
            onChange={(e) => setField(field.key, e.target.value)}
            help={errors[field.key] ?? field.help}
            hasError={Boolean(errors[field.key])}
          />
          <Spacing size={12} />
        </div>
      ))}

      <Spacing size={12} />
      <Paragraph.Text typography="t4">근무·통근</Paragraph.Text>
      <Spacing size={12} />

      {NUMERIC_FIELDS.slice(2, 5).map((field) => (
        <div key={field.key}>
          <TextField
            variant="box"
            label={field.label}
            placeholder={field.placeholder}
            inputMode="numeric"
            type="text"
            value={draft[field.key]}
            onChange={(e) => setField(field.key, e.target.value)}
            help={errors[field.key] ?? field.help}
            hasError={Boolean(errors[field.key])}
          />
          <Spacing size={12} />
        </div>
      ))}

      <Spacing size={12} />
      <Paragraph.Text typography="t4">식대·복지</Paragraph.Text>
      <Spacing size={12} />

      {NUMERIC_FIELDS.slice(5, 8).map((field) => (
        <div key={field.key}>
          <TextField
            variant="box"
            label={field.label}
            placeholder={field.placeholder}
            inputMode="numeric"
            type="text"
            value={draft[field.key]}
            onChange={(e) => setField(field.key, e.target.value)}
            help={errors[field.key] ?? field.help}
            hasError={Boolean(errors[field.key])}
          />
          <Spacing size={12} />
        </div>
      ))}

      <Spacing size={12} />
      <Paragraph.Text typography="t4">비금전 평가</Paragraph.Text>
      <Paragraph.Text typography="st11" color="secondary">
        1점(낮음) ~ 5점(높음)
      </Paragraph.Text>
      <Spacing size={12} />

      {RATING_FIELDS.map((field) => (
        <div key={field.key}>
          <Paragraph.Text typography="t5">{field.label}</Paragraph.Text>
          <Spacing size={8} />
          <Chip size="small">
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <ChipItem
                key={value}
                selected={draft.ratings[field.key] === value}
                onClick={() => setRating(field.key, value)}
              >
                {value}
              </ChipItem>
            ))}
          </Chip>
          <Spacing size={16} />
        </div>
      ))}

      <Spacing size={80} />

      <AlertDialog
        open={deleteOpen}
        title="오퍼를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        alertButton={<AlertDialog.AlertButton onClick={handleDeleteConfirm}>삭제</AlertDialog.AlertButton>}
        onClose={() => setDeleteOpen(false)}
      />

      <Toast
        open={toastOpen}
        position="bottom"
        text="저장 공간이 부족해요. 오퍼를 하나 삭제해주세요"
        onClose={() => setToastOpen(false)}
      />
    </ScreenScaffold>
  );
}
