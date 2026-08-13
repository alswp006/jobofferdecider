import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Top, TextField, Spacing, Button, AlertDialog, Toast, Skeleton } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { useOffers } from "@/hooks/useOffers";
import { validateOffer } from "@/lib/calc";
import type { Offer, OfferKind, RouteState } from "@/lib/types";

function toInt(str: string): number {
  return Number(str === "" ? "0" : str);
}

/**
 * 직장·오퍼 입력/수정 폼 — /offer/new, /offer/:id/edit.
 * state 없이 /offer/new에 직접 진입해도 kind='offer' 기본값으로 렌더한다(크래시 방지).
 */
export default function OfferForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { isLoading, offers, save, remove } = useOffers();
  const existing = isEdit ? offers.find((o) => o.id === id) : undefined;

  const routeState = (location.state as RouteState["/offer/new"] | null) ?? null;

  const [kind, setKind] = useState<OfferKind>(routeState?.kind ?? "offer");
  const [companyName, setCompanyName] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [welfare, setWelfare] = useState("");
  const [remoteDays, setRemoteDays] = useState("");
  const [commuteMinutes, setCommuteMinutes] = useState("");
  const [commuteCost, setCommuteCost] = useState("");
  const [lunchCost, setLunchCost] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const prefilledRef = useRef(false);
  useEffect(() => {
    if (existing && !prefilledRef.current) {
      prefilledRef.current = true;
      setKind(existing.kind);
      setCompanyName(existing.companyName);
      setBaseSalary(String(existing.baseSalaryManwon));
      setBonus(String(existing.bonusManwon));
      setWelfare(String(existing.welfarePointManwon));
      setRemoteDays(String(existing.remoteDaysPerWeek));
      setCommuteMinutes(String(existing.commuteMinutesOneWay));
      setCommuteCost(String(existing.commuteCostPerDayWon));
      setLunchCost(String(existing.lunchCostPerDayWon));
    }
  }, [existing]);

  const candidate: Offer = {
    id: existing?.id ?? "",
    kind,
    companyName,
    baseSalaryManwon: toInt(baseSalary),
    bonusManwon: toInt(bonus),
    welfarePointManwon: toInt(welfare),
    remoteDaysPerWeek: toInt(remoteDays),
    commuteMinutesOneWay: toInt(commuteMinutes),
    commuteCostPerDayWon: toInt(commuteCost),
    lunchCostPerDayWon: toInt(lunchCost),
    growthScore: existing?.growthScore ?? 3,
    cultureScore: existing?.cultureScore ?? 3,
    stabilityScore: existing?.stabilityScore ?? 3,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };

  const companyError =
    companyName.length === 0 || companyName.length > 20 ? "1~20자로 입력할 수 있어요" : undefined;
  const offerErrors = validateOffer(candidate).filter((e) => e.field !== "companyName");
  const extraIntegerFields: Array<keyof Offer> = ["remoteDaysPerWeek", "commuteMinutesOneWay"];
  const hasNonIntegerExtra = extraIntegerFields.some((f) => !Number.isInteger(candidate[f] as number));
  const valid = !companyError && offerErrors.length === 0 && !hasNonIntegerExtra;

  function fieldError(field: keyof Offer, rawValue: string): string | undefined {
    if (rawValue === "") return undefined;
    return offerErrors.find((e) => e.field === field)?.message;
  }

  function handleSave() {
    if (!valid) return;
    const result = save(candidate);
    if (result.ok) {
      navigate("/offers");
    } else {
      setSaveError(result.error);
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
    if (existing) {
      remove(existing.id);
      navigate("/offers");
    }
  }

  const isCurrent = kind === "current";
  const title = isCurrent ? "현재 직장" : "받은 오퍼";

  const numericFields: Array<{
    key: keyof Offer;
    label: string;
    placeholder: string;
    value: string;
    setValue: (v: string) => void;
  }> = [
    { key: "baseSalaryManwon", label: "연봉(만원)", placeholder: "예: 5000", value: baseSalary, setValue: setBaseSalary },
    { key: "bonusManwon", label: "상여(만원)", placeholder: "예: 800", value: bonus, setValue: setBonus },
    { key: "welfarePointManwon", label: "복지포인트(만원)", placeholder: "예: 200", value: welfare, setValue: setWelfare },
    { key: "remoteDaysPerWeek", label: "재택 주 n일", placeholder: "예: 2", value: remoteDays, setValue: setRemoteDays },
    { key: "commuteMinutesOneWay", label: "통근 편도(분)", placeholder: "예: 30", value: commuteMinutes, setValue: setCommuteMinutes },
    { key: "commuteCostPerDayWon", label: "1일 교통비(원)", placeholder: "예: 2800", value: commuteCost, setValue: setCommuteCost },
    { key: "lunchCostPerDayWon", label: "1일 점심값(원)", placeholder: "예: 8000", value: lunchCost, setValue: setLunchCost },
  ];

  const top = (
    <Top
      title={<Top.TitleParagraph>{title}</Top.TitleParagraph>}
      right={
        isEdit ? (
          <Button variant="weak" size="small" color="danger" onClick={() => setDeleteOpen(true)}>
            삭제
          </Button>
        ) : undefined
      }
    />
  );

  if (isEdit && isLoading) {
    return (
      <ScreenScaffold top={top}>
        <Skeleton />
        <Spacing size={16} />
        <Skeleton />
        <Spacing size={16} />
        <Skeleton />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={top} bottom={<SubmitFooter label="저장하기" onClick={handleSave} disabled={!valid} />}>
      <TextField
        variant="box"
        label="회사 이름"
        name="companyName"
        placeholder="예: 토스"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        hasError={!!companyError}
        help={companyError}
      />
      <Spacing size={16} />
      {numericFields.map((f, idx) => (
        <Fragment key={f.key}>
          <TextField
            variant="box"
            label={f.label}
            name={f.key}
            inputMode="numeric"
            placeholder={f.placeholder}
            value={f.value}
            onChange={(e) => f.setValue(e.target.value)}
            hasError={!!fieldError(f.key, f.value)}
            help={fieldError(f.key, f.value)}
          />
          {idx < numericFields.length - 1 && <Spacing size={16} />}
        </Fragment>
      ))}
      <Spacing size={32} />

      {isEdit && (
        <AlertDialog
          open={deleteOpen}
          title="오퍼를 삭제할까요?"
          description="삭제하면 되돌릴 수 없어요"
          onClose={() => setDeleteOpen(false)}
          alertButton={<AlertDialog.AlertButton onClick={handleDelete}>삭제</AlertDialog.AlertButton>}
        />
      )}

      <Toast open={!!saveError} text={saveError ?? ""} position="bottom" />
    </ScreenScaffold>
  );
}
