import client from '../client';

// ✅ 타입 경로가 없어서 빌드 깨지는 중이라 임시 로컬 타입 선언
// 서버 응답 구조에 맞게 필드가 추가되더라도 문제 없게 index signature 포함
export type Gate = {
  id: string;
  [key: string]: any;
};

export const gateService = {
  getByProjectId: async (projectId: string): Promise<Gate[]> => {
    // ✅ 서버에 /api/projects 별칭을 추가했으니 이 경로가 가장 안전
    const response = await client.get<Gate[]>(`/api/projects/${projectId}/gates`);
    return response.data;
  },

  update: async (id: string, gate: Partial<Gate>): Promise<Gate> => {
    // ✅ /api/gates 별칭도 추가했으니 통일
    const response = await client.put<Gate>(`/api/gates/${id}`, gate);
    return response.data;
  },
};
