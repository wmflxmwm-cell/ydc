import axios from 'axios';

// 프로덕션 환경에서 자동으로 API URL 감지
const getApiUrl = () => {
  // 환경 변수가 명시적으로 설정된 경우 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 프로덕션 환경에서 자동 감지
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com')) {
      if (hostname.includes('ydc-408r')) {
        return 'https://ydc-server.onrender.com';
      }
      return 'https://ydc-server.onrender.com';
    }
  }

  // 개발 환경 기본값
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const client = axios.create({
  baseURL: API_URL,
  // ⚠️ 전역 Content-Type 강제 지정하지 않음
  // - JSON 요청은 axios가 자동으로 application/json 설정
  // - FormData는 axios가 multipart/form-data + boundary 자동 설정
});

// 요청 인터셉터: 토큰이 있으면 헤더에 추가 + CORS 이슈 헤더 제거 + FormData 시 Content-Type 제거
client.interceptors.request.use(
  (config) => {
    // 1) Authorization 토큰 처리
    const savedUser = localStorage.getItem('apqp_session');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${user.token}`;
      }
    }

    // 2) ✅ 원인 불명으로 붙는 X-Client-Debug 강제 제거 (CORS preflight 방지)
    const h: any = config.headers;
    if (h?.delete) {
      h.delete('X-Client-Debug');
      h.delete('x-client-debug');
    } else if (h) {
      delete h['X-Client-Debug'];
      delete h['x-client-debug'];
    }

    // 3) ✅ FormData 업로드면 Content-Type을 삭제해서 boundary를 axios가 자동 설정하게 함
    // (전역/기본으로 application/json이 남아있으면 업로드가 깨질 수 있음)
    const data: any = config.data;
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    if (isFormData) {
      if (h?.delete) {
        h.delete('Content-Type');
        h.delete('content-type');
      } else if (h) {
        delete h['Content-Type'];
        delete h['content-type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 처리 등
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Network error: 서버에 연결할 수 없습니다. API URL을 확인하세요:', API_URL);
    } else if (error.response) {
      if (error.response.status === 401) {
        console.error('Unauthorized, logging out...');
        localStorage.removeItem('apqp_session');
        window.location.href = '/';
      } else if (error.response.status === 0) {
        console.error('CORS error: 서버의 CORS 설정을 확인하세요.');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
