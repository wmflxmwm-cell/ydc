import client from '../client';
import { TabKey } from '../../utils/tabPermissions';

export interface User {
    id: string;
    name: string;
    role: string;
    tabPermissions?: TabKey[] | null;
}

export interface RegisterRequest {
    id: string;
    password: string;
    name: string;
    role: string;
}

export interface UserWithPassword extends User {
    password?: string;
}

export const userService = {
    getAll: async (includePassword: boolean = false): Promise<UserWithPassword[]> => {
        const headers: any = {};
        if (includePassword) {
            headers['x-admin'] = 'true';
        }
        const response = await client.get<UserWithPassword[]>(
            '/auth/users',
            { headers }
        );
        return response.data;
    },

    register: async (user: RegisterRequest): Promise<void> => {
        await client.post('/auth/register', user);
    },

    update: async (id: string, data: { name: string; role: string }): Promise<User> => {
        const headers: any = { 'x-admin': 'true' };
        const response = await client.put<User>(`/auth/users/${id}`, data, { headers });
        return response.data;
    },

    updatePermissions: async (id: string, tabPermissions: TabKey[] | null): Promise<void> => {
        const headers: any = { 'x-admin': 'true' };
        await client.put(`/auth/users/${id}/permissions`, { tabPermissions }, { headers });
    },

    changePassword: async (id: string, password: string): Promise<void> => {
        await client.put(`/auth/users/${id}/password`, { password });
    },

    delete: async (id: string): Promise<void> => {
        await client.delete(`/auth/users/${id}`);
    }
};
