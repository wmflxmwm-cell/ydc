<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ihn69IIW-gY6rbznCzWey6UkNH8RdDTP

## Run Locally

**Prerequisites:**  Node.js

### 클라이언트 실행

1. Install dependencies:
   ```bash
   npm install
   ```
2. 환경 변수 설정:
   - `.env.local` 파일을 생성하고 `.env.example`을 참고하여 설정
   - `GEMINI_API_KEY`: Gemini API 키 설정
   - `VITE_API_URL`: 개발 환경에서는 `http://localhost:8000` (기본값)
3. Run the app:
   ```bash
   npm run dev
   ```

### 서버 실행

1. 서버 디렉토리로 이동:
   ```bash
   cd server
   npm install
   ```
2. 환경 변수 설정:
   - `.env` 파일 생성
   - `DATABASE_URL`: PostgreSQL 연결 문자열
   - `ALLOWED_ORIGINS`: CORS 허용 origin (선택사항)
3. 서버 실행:
   ```bash
   npm start
   # 또는 개발 모드
   npm run dev
   ```

## 배포 (Render)

### 클라이언트 배포
- 환경 변수: `VITE_API_URL=https://ydc-server.onrender.com` (서버 URL)
- Build Command: `npm run build`
- Publish Directory: `dist`

### 서버 배포
- 환경 변수:
  - `DATABASE_URL`: PostgreSQL 데이터베이스 URL
  - `ALLOWED_ORIGINS`: 클라이언트 URL (선택사항, 자동 감지됨)
- Start Command: `cd server && npm start`

### CORS 설정
서버는 Render 도메인(`.onrender.com`)을 자동으로 허용합니다. 추가 설정이 필요한 경우 `ALLOWED_ORIGINS` 환경 변수를 사용하세요.
