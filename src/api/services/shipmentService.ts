import client from '../client';

export interface Shipment {
  id: string;
  year?: number;
  shipmentDate?: string;
  customerName?: string;
  itemName?: string;
  partNo?: string;
  changeSeq?: string;
  shipmentQty?: number;
  invoiceNo?: string;
  invoiceSeq?: string;
  invoiceDate?: string;
  sourceFileId?: string;
  createdAt?: string;
  updatedAt?: string;

  // 하위 호환성
  partNumber?: string;
  partName?: string;
  quantity?: string;
  shippingMethod?: string;
  remarks?: string;
}

export interface CreateShipmentData {
  shipmentDate: string;
  customerName: string;
  partNumber: string;
  partName: string;
  quantity: string;
  shippingMethod: string;
  remarks: string;
}

export interface ImportResult {
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorRows: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  importId?: string;
  year?: number;
  message?: string;
  headerRow?: number;
  headerMatchScore?: number;
  headerMatchedFields?: string[];
  debugInfo?: any;
}

export const shipmentService = {
  getAll: async (params?: { year?: number; partNo?: string; sortBy?: string; sortOrder?: string }): Promise<Shipment[]> => {
    const response = await client.get<Shipment[]>('/api/shipments', { params });
    return response.data;
  },

  importExcel: async (file: File, year?: number, skipDuplicate?: boolean): Promise<ImportResult> => {
    console.log('[IMPORT DEBUG] shipmentService.importExcel called', {
      fileName: file.name,
      fileSize: file.size,
      year,
      skipDuplicate,
    });

    const formData = new FormData();
    formData.append('file', file);
    if (typeof year === 'number') formData.append('year', String(year));
    if (skipDuplicate) formData.append('skipDuplicate', 'true');

    // ✅ CORS 문제 원인인 커스텀 헤더 제거
    // ✅ multipart/form-data Content-Type은 axios가 boundary 포함해 자동 설정하므로 headers를 주지 않는 것이 안전
    const response = await client.post<ImportResult>('/api/shipments/import', formData);

    console.log('[IMPORT DEBUG] response', response.data);
    return response.data;
  },

  create: async (data: CreateShipmentData): Promise<Shipment> => {
    const response = await client.post<Shipment>('/api/shipments', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/shipments/${id}`);
  },
};
