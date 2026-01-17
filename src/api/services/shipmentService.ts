// shipmentService.ts 에서 importExcel 함수만 아래로 교체하세요.

importExcel: async (file: File, year?: number, skipDuplicate?: boolean): Promise<ImportResult> => {
  console.log('[IMPORT DEBUG] shipmentService.importExcel called', {
    fileName: file.name,
    fileSize: file.size,
    year,
    skipDuplicate,
  });

  const formData = new FormData();
  formData.append('file', file);
  if (year) formData.append('year', year.toString());
  if (skipDuplicate) formData.append('skipDuplicate', 'true');

  // ✅ 서버 로그에서 이 요청이 뭔지 바로 식별 가능
  const response = await client.post<ImportResult>('/api/shipments/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Client-Debug': 'shipment-import-v1',
    },
  });

  console.log('[IMPORT DEBUG] response', response.data);
  return response.data;
},
