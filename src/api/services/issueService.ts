import client from '../client';
import { Issue } from '../../types';

export const issueService = {
    getAll: async (): Promise<Issue[]> => {
        const response = await client.get<Issue[]>('/issues');
        return response.data;
    },

    getByProjectId: async (projectId: string): Promise<Issue[]> => {
        const response = await client.get<Issue[]>(`/projects/${projectId}/issues`);
        return response.data;
    },

    create: async (issue: Omit<Issue, 'id'>): Promise<Issue> => {
        const response = await client.post<Issue>('/issues', issue);
        return response.data;
    },

    update: async (id: string, issue: Partial<Issue>): Promise<Issue> => {
        const response = await client.put<Issue>(`/issues/${id}`, issue);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await client.delete(`/issues/${id}`);
    }
};
