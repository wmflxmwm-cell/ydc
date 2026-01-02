import client from '../client';

export interface Part {
  id: string;
  customerName: string;
  partNumber: string;
  partName: string;
  material: string;
  cavity: string;
  productionTon: string;
  postProcessings: string[];
}

export interface CreatePartData {
  customerName: string;
  partNumber: string;
  partName: string;
  material: string;
  cavity: string;
  productionTon: string;
  postProcessings: string[];
}

export const partService = {
  getAll: async (): Promise<Part[]> => {
    const response = await client.get<Part[]>('/api/parts');
    return response.data;
  },

  create: async (data: CreatePartData): Promise<Part> => {
    const response = await client.post<Part>('/api/parts', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/parts/${id}`);
  },
};

