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
    // ✅ 배포 후 업로드 시 콘솔에서 이 로그가 떠야 “내 코드가 적용된 것”
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

    const response = await client.post<ImportResult>('/api/shipments/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Client-Debug': 'shipment-import-v1',
      },
    });

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
