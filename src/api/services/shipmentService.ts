import client from '../client';

export interface Shipment {
  id: string;
  year?: number;
  shipmentDate?: string; // 출하일자 (YYYY-MM-DD)
  customerName?: string; // 고객사
  itemName?: string; // 품명
  partNo?: string; // 품번
  changeSeq?: string; // 명칭 변경 차수 (LOT/No)
  shipmentQty?: number; // 출하수량
  invoiceNo?: string; // Invoice No (선택)
  invoiceSeq?: string; // Invoice Seq (선택)
  invoiceDate?: string; // Invoice Date (선택)
  sourceFileId?: string;
  createdAt?: string;
  updatedAt?: string;
  // 하위 호환성 필드
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
  debugInfo?: {
    importType: string;
    sheetName: string;
    headerRowIndex: number;
    headersOriginal: string[];
    headersNormalized: string[];
    mappingResult: {
      dateCol: number | null;
      customerCol: number | null;
      partNoCol: number | null;
      itemNameCol: number | null;
      qtyCol: number | null;
    };
    missingFields: string[];
  };
}

export const shipmentService = {
  getAll: async (params?: { year?: number; partNo?: string; sortBy?: string; sortOrder?: string }): Promise<Shipment[]> => {
    const response = await client.get<Shipment[]>('/api/shipments', { params });
    return response.data;
  },

  importExcel: async (file: File, year?: number, skipDuplicate?: boolean): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (year) formData.append('year', year.toString());
    if (skipDuplicate) formData.append('skipDuplicate', 'true');
    
    const response = await client.post<ImportResult>('/api/shipments/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

