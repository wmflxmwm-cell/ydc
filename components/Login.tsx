
import React, { useState } from 'react';
import { Lock, User, Settings2, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (userData: { id: string; name: string; role: string }) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 시뮬레이션된 계정 데이터 (관리자가 발급한 형태)
  const MOCK_USERS = [
    { id: 'admin', password: 'admin123', name: '관리자', role: 'MANAGER' },
    { id: 'quality', password: 'q123', name: '김품질 팀장', role: '품질팀' },
    { id: 'production', password: 'p123', name: '이생산 과장', role: '생산관리' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 실제 환경에서는 API 통신이 일어나는 부분
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.id === id && u.password === password);
      
      if (user) {
        onLogin({ id: user.id, name: user.name, role: user.role });
      } else {
        setError('아이디 또는 비밀번호가 일치하지 않습니다. 관리자에게 문의하세요.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-md p-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-sm">
          <div className="p-10">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-200 mb-6">
                <Settings2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">다이캐스팅 APQP 시스템</h1>
              <p className="text-slate-500 text-sm font-medium">관리자가 발급한 계정으로 로그인해 주세요.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">사번 또는 아이디</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input 
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-medium"
                    placeholder="아이디를 입력하세요"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input 
                    type="password"
                    required
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    시스템 접속하기
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-medium">계정 발급 및 초기화 문의</p>
              <p className="text-xs font-bold text-slate-600 mt-1">IT 전략팀 (내선 1024)</p>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
          &copy; 2024 DIE-CASTING APQP MANAGEMENT SYSTEM. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
};

export default Login;
