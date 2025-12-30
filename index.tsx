
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// React 19의 removeChild 오류를 방지하기 위한 에러 핸들러
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('removeChild')) {
    // removeChild 오류는 무시 (React 19 호환성 문제)
    return;
  }
  originalError.apply(console, args);
};

root.render(<App />);
