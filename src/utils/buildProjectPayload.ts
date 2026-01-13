// src/utils/buildProjectPayload.ts
export function buildProjectPayload(form: any) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    customerName: form.customerName?.trim() || '미지정',
    partName: form.partName?.trim() || '미지정',
    carModel: form.carModel?.trim() || '미지정',
    partNumber: form.partNumber?.trim() || '미지정',
    moldCavity: Number(form.moldCavity) || 2,
    sopDate: form.sopDate || today,
    material: form.materialId ?? form.material,
    status: form.status,
    type: form.type,
    developmentPhase: String(form.developmentPhase ?? '1'),
  };
}

