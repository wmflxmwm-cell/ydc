import client from '../client';

export interface Customer {
    id: string;
    name: string;
    created_at?: string;
}

export interface Material {
    id: string;
    name: string;
    code: string;
    created_at?: string;
}

export interface PostProcessing {
    id: string;
    name: string;
    description?: string;
    created_at?: string;
}

export const settingsService = {
    // 고객사 목록 조회
    getCustomers: async (): Promise<Customer[]> => {
        const response = await client.get<Customer[]>('/settings/customers');
        return response.data;
    },

    // 고객사 추가
    addCustomer: async (name: string): Promise<Customer> => {
        const response = await client.post<Customer>('/settings/customers', { name });
        return response.data;
    },

    // 고객사 삭제
    deleteCustomer: async (id: string): Promise<void> => {
        await client.delete(`/settings/customers/${id}`);
    },

    // 재질 목록 조회
    getMaterials: async (): Promise<Material[]> => {
        const response = await client.get<Material[]>('/settings/materials');
        return response.data;
    },

    // 재질 추가
    addMaterial: async (name: string, code: string): Promise<Material> => {
        const response = await client.post<Material>('/settings/materials', { name, code });
        return response.data;
    },

    // 재질 삭제
    deleteMaterial: async (id: string): Promise<void> => {
        await client.delete(`/settings/materials/${id}`);
    },

    // 후공정 목록 조회
    getPostProcessings: async (): Promise<PostProcessing[]> => {
        const response = await client.get<PostProcessing[]>('/settings/postprocessings');
        return response.data;
    },

    // 후공정 추가
    addPostProcessing: async (name: string, description?: string): Promise<PostProcessing> => {
        const response = await client.post<PostProcessing>('/settings/postprocessings', { name, description });
        return response.data;
    },

    // 후공정 삭제
    deletePostProcessing: async (id: string): Promise<void> => {
        await client.delete(`/settings/postprocessings/${id}`);
    }
};

