import axios from 'axios';

// 프로덕션 환경에서 자동으로 API URL 감지
const getApiUrl = () => {
  // 환경 변수가 명시적으로 설정된 경우 사용
  const env = (import.meta as any)?.env || {};
  if (env.VITE_API_URL) {
    return env.VITE_API_URL as string;
  }

  // 프로덕션/외부 접속 환경에서 자동 감지
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // onrender 또는 외부 도메인에서 접속 중이면 서버 기본값 사용
    if (hostname.includes('onrender.com') || !isLocalhost) {
      return 'https://ydc-server.onrender.com';
    }
  }

  // 개발 환경 기본값
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 토큰이 있으면 헤더에 추가
client.interceptors.request.use(
  (config) => {
    const savedUser = localStorage.getItem('apqp_session');
    if (savedUser) {
      const user = JSON.parse(savedUser);

      if (user.token) {
        // ✅ Axios v1 타입 안전: headers 객체를 절대 {}로 덮어쓰지 말고 그대로 사용
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${user.token}`;
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
