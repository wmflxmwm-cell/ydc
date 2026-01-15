import client from '../client';

export interface LoginRequest {
    id: string; // or email
    password?: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        name: string;
        role: string;
        tabPermissions?: string[] | null;
    };
}

export const authService = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        // For now, we might just simulate or use a real endpoint if available.
        // Assuming a standard login endpoint.
        const response = await client.post<LoginResponse>('/auth/login', credentials);
        return response.data;
    },

    logout: async (): Promise<void> => {
        // Optional: Call server to invalidate token
        // await client.post('/auth/logout');
    }
};
