// src/utils/buildProjectPayload.ts

type BuildProjectPayloadInput = Record<string, any>;

export function buildProjectPayload(form: BuildProjectPayloadInput) {
  const today = new Date().toISOString().slice(0, 10);

  const payload: Record<string, any> = {
    // ✅ 필수 필드: 빈 문자열 절대 금지
    customerName: form.customerName?.trim() || '미지정',
    partName: form.partName?.trim() || '미지정',
    carModel: form.carModel?.trim() || '미지정',
    partNumber: form.partNumber?.trim() || '미지정',

    // ✅ 기본값
    moldCavity: Number(form.moldCavity) || 2,
    sopDate: form.sopDate || today,

    status: form.status,
    type: form.type,

    // ✅ 서버가 String 요구 시
    developmentPhase: String(
      form.developmentPhase ?? '1'
    ),
  };

  // ✅ material 처리 (ID 우선)
  if (form.materialId) {
    payload.material = form.materialId;
  } else if (form.material) {
    payload.material = form.material;
  }
  // ❌ 기본값으로 'ALDC12' 강제하지 않음

  // ✅ 선택 날짜 필드
  const dateFields = [
    'feasibilityReviewPlan',
    'feasibilityReviewActual',
    'moldOrderPlan',
    'moldOrderActual',
    'moldDeliveryPlan',
    'moldDeliveryActual',
    'istrSubmissionPlan',
    'istrSubmissionActual',
    'ydcVnPpapPlan',
    'ydcVnPpapActual',
  ];

  dateFields.forEach((key) => {
    if (form[key]) payload[key] = form[key];
  });

  // ✅ volume 조건
  if (Number(form.volume2026) > 0) {
    payload.volume2026 = Number(form.volume2026);
  }

  return payload;
}

