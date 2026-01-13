import client from '../client';

export interface ForecastRow {
  id?: string;
  partName: string;
  partNumber: string;
  customerName: string;
  material: string;
  forecast: Record<number, number>;
  createdAt?: string;
}

export const forecastService = {
  getAll: async (): Promise<ForecastRow[]> => {
    const response = await client.get<ForecastRow[]>('/api/forecasts');
    // Transform API response to match ForecastRow format
    return response.data.map(item => ({
      id: item.id,
      partName: item.partName,
      partNumber: item.partNumber || '',
      customerName: item.customerName || '',
      material: item.material || '',
      forecast: {
        2026: item.forecast?.[2026] ?? (item as any).volume2026 ?? 0,
        2027: item.forecast?.[2027] ?? (item as any).volume2027 ?? 0,
        2028: item.forecast?.[2028] ?? (item as any).volume2028 ?? 0,
        2029: item.forecast?.[2029] ?? (item as any).volume2029 ?? 0,
        2030: item.forecast?.[2030] ?? (item as any).volume2030 ?? 0,
        2031: item.forecast?.[2031] ?? (item as any).volume2031 ?? 0,
        2032: item.forecast?.[2032] ?? (item as any).volume2032 ?? 0,
      },
      createdAt: item.createdAt
    }));
  },

  save: async (row: ForecastRow, userId?: string): Promise<ForecastRow> => {
    try {
      const response = await client.post<ForecastRow>('/api/forecasts', {
        partName: row.partName,
        partNumber: row.partNumber,
        customerName: row.customerName,
        material: row.material,
        forecast: row.forecast,
        userId: userId
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Forecast save error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/forecasts/${id}`);
  }
};

