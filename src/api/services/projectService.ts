import client from '../client';
import { Project } from '../../types';

export const projectService = {
    getAll: async (): Promise<Project[]> => {
        const response = await client.get<Project[]>('/projects');
        return response.data;
    },

    getById: async (id: string): Promise<Project> => {
        const response = await client.get<Project>(`/projects/${id}`);
        return response.data;
    },

    create: async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
        const response = await client.post<Project>('/projects', project);
        return response.data;
    },

    update: async (id: string, project: Partial<Project>): Promise<Project> => {
        const response = await client.put<Project>(`/projects/${id}`, project);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await client.delete(`/projects/${id}`);
    }
};
