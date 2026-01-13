/**
 * Builds a sanitized project payload for API submission
 * Ensures all required fields are present and properly formatted
 */
export function buildProjectPayload(form: any): Partial<any> {
  const payload: any = {};

  // Required string fields - ensure non-empty values
  payload.customerName = (form.customerName?.trim() || '미지정');
  payload.partName = (form.partName?.trim() || '');
  payload.carModel = (form.carModel?.trim() || '');
  payload.partNumber = (form.partNumber?.trim() || '');

  // Required numeric fields with defaults
  payload.moldCavity = Number(form.moldCavity) || 2;
  
  // developmentPhase should be string, not number (증작 금형 구분)
  payload.developmentPhase = form.developmentPhase?.toString().trim() || '';

  // Required enum fields
  payload.status = form.status || '진행중';
  payload.type = form.type || '증작 금형';
  
  // material: accept both ID and string, server will handle
  payload.material = form.materialId || form.material || 'ALDC12';
  
  // sopDate: required, default to today if missing
  if (form.sopDate?.trim()) {
    payload.sopDate = form.sopDate.trim();
  } else {
    payload.sopDate = new Date().toISOString().split('T')[0];
  }

  // Optional date fields - only include if present
  const optionalDateFields = [
    'fotDate', 'faiDate', 'p1Date', 'p2Date', 
    'runAtRateDate', 'ppapDate', 'customerSopDate',
    'feasibilityReviewPlan', 'feasibilityReviewActual',
    'moldOrderPlan', 'moldOrderActual',
    'moldDeliveryPlan', 'moldDeliveryActual',
    'istrSubmissionPlan', 'istrSubmissionActual',
    'ydcVnPpapPlan', 'ydcVnPpapActual',
    'ppapKrSubmissionPlan', 'ppapKrSubmissionActual',
    'ppapCustomerApprovalPlan', 'ppapCustomerApprovalActual',
    'ydcVnSopPlan', 'ydcVnSopActual',
    'customerSopPlan', 'customerSopActual',
    'deliverySchedulePlan', 'deliveryScheduleActual'
  ];

  optionalDateFields.forEach(field => {
    if (form[field]?.trim()) {
      payload[field] = form[field].trim();
    }
  });

  // Optional volume fields - only include if numeric
  const volumeFields = ['volume2026', 'volume2027', 'volume2028', 'volume2029', 'volume2030', 'volume2031', 'volume2032'];
  volumeFields.forEach(field => {
    const value = Number(form[field]);
    if (!isNaN(value) && value > 0) {
      payload[field] = value;
    }
  });

  return payload;
}

