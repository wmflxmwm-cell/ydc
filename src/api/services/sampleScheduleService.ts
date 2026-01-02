import client from '../client';

export interface ScheduleItem {
  postProcessingId: string;
  plannedDate: string;
  completedDate: string;
  inputQuantity?: number;
  completedQuantity?: number;
  isCompleted: boolean;
  completionDate?: string;
}

export interface SampleSchedule {
  id: string;
  partName: string;
  partNumber: string;
  quantity: number;
  requestDate: string;
  shippingMethod: string;
  productCostType: string;
  schedules: ScheduleItem[];
}

export interface CreateSampleScheduleData {
  partName: string;
  partNumber: string;
  quantity: number;
  requestDate: string;
  shippingMethod: string;
  productCostType: string;
  schedules: ScheduleItem[];
}

export const sampleScheduleService = {
  getAll: async (): Promise<SampleSchedule[]> => {
    const response = await client.get<SampleSchedule[]>('/api/sample-schedules');
    return response.data;
  },

  create: async (data: CreateSampleScheduleData): Promise<SampleSchedule> => {
    const response = await client.post<SampleSchedule>('/api/sample-schedules', data);
    return response.data;
  },

  update: async (id: string, data: CreateSampleScheduleData): Promise<SampleSchedule> => {
    const response = await client.put<SampleSchedule>(`/api/sample-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/sample-schedules/${id}`);
  },
};

