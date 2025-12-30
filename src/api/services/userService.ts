import client from '../client';

export interface User {
    id: string;
    name: string;
    role: string;
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
        const response = await client.get<UserWithPassword[]>(
            includePassword ? '/auth/users?admin=true' : '/auth/users'
        );
        return response.data;
    },

    register: async (user: RegisterRequest): Promise<void> => {
        await client.post('/auth/register', user);
    },

    delete: async (id: string): Promise<void> => {
        await client.delete(`/auth/users/${id}`);
    }
};
