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
    // Render 도메인인 경우 서버 URL 추론
    if (hostname.includes('onrender.com')) {
      // 클라이언트가 ydc-408r.onrender.com이면 서버는 ydc-server.onrender.com
      if (hostname.includes('ydc-408r')) {
        return 'https://ydc-server.onrender.com';
      }
      // 다른 패턴의 경우 기본 서버 URL 사용
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
      // 실제 토큰이 있다면 user.token 등을 사용. 현재는 mock 기반이라 id 등을 사용할 수도 있음.
      // 여기서는 예시로 Bearer 토큰 형식을 맞춤.
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 에러 처리 등
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Network error: 서버에 연결할 수 없습니다. API URL을 확인하세요:', API_URL);
    } else if (error.response) {
      if (error.response.status === 401) {
        // 로그아웃 처리 또는 리다이렉트
        console.error('Unauthorized, logging out...');
        localStorage.removeItem('apqp_session');
        window.location.href = '/';
      } else if (error.response.status === 0) {
        // CORS 오류
        console.error('CORS error: 서버의 CORS 설정을 확인하세요.');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
