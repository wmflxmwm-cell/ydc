import client from '../client';

export interface Shipment {
  id: string;
  shipmentDate: string;
  customerName: string;
  partNumber: string;
  partName: string;
  quantity: string;
  shippingMethod: string;
  remarks: string;
  createdAt: string;
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

export const shipmentService = {
  getAll: async (): Promise<Shipment[]> => {
    const response = await client.get<Shipment[]>('/api/shipments');
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

