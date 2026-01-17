import client from '../client';
import { Gate } from '../../types';

export const gateService = {
  getByProjectId: async (projectId: string): Promise<Gate[]> => {
    const response = await client.get<Gate[]>(`/api/projects/${projectId}/gates`);
    return response.data;
  },

  update: async (id: string, gate: Partial<Gate>): Promise<Gate> => {
    const response = await client.put<Gate>(`/api/gates/${id}`, gate);
    return response.data;
  },
};
