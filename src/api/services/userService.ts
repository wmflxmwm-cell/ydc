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

export const userService = {
    getAll: async (): Promise<User[]> => {
        const response = await client.get<User[]>('/auth/users');
        return response.data;
    },

    register: async (user: RegisterRequest): Promise<void> => {
        await client.post('/auth/register', user);
    }
};
