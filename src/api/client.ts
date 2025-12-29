import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    if (error.response && error.response.status === 401) {
      // 로그아웃 처리 또는 리다이렉트
      console.error('Unauthorized, logging out...');
      localStorage.removeItem('apqp_session');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default client;
