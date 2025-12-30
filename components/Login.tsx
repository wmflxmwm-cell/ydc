
import React, { useState, useEffect } from 'react';
import { Lock, User, Settings2, ShieldCheck, AlertCircle, Globe } from 'lucide-react';
import { authService } from '../src/api/services/authService';

type Language = 'ko' | 'vi';

interface Translations {
  title: string;
  subtitle: string;
  idLabel: string;
  idPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginButton: string;
  errorMessage: string;
  accountInquiry: string;
  contactInfo: string;
}

const translations: Record<Language, Translations> = {
  ko: {
    title: '다이캐스팅 APQP 시스템',
    subtitle: '관리자가 발급한 계정으로 로그인해 주세요.',
    idLabel: '사번 또는 아이디',
    idPlaceholder: '아이디를 입력하세요',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '••••••••',
    loginButton: '시스템 접속하기',
    errorMessage: '아이디 또는 비밀번호가 일치하지 않습니다. 관리자에게 문의하세요.',
    accountInquiry: '계정 발급 및 초기화 문의',
    contactInfo: 'IT 전략팀 (내선 1024)'
  },
  vi: {
    title: 'Hệ thống APQP Đúc áp lực',
    subtitle: 'Vui lòng đăng nhập bằng tài khoản do quản trị viên cấp.',
    idLabel: 'Mã nhân viên hoặc ID',
    idPlaceholder: 'Nhập ID của bạn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: '••••••••',
    loginButton: 'Truy cập hệ thống',
    errorMessage: 'ID hoặc mật khẩu không khớp. Vui lòng liên hệ quản trị viên.',
    accountInquiry: 'Yêu cầu cấp tài khoản và đặt lại',
    contactInfo: 'Đội IT Chiến lược (Số nội bộ 1024)'
  }
};

interface Props {
  onLogin: (userData: { id: string; name: string; role: string }) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('apqp_language');
    return (saved === 'vi' || saved === 'ko') ? saved : 'ko';
  });
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('apqp_language', language);
  }, [language]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 입력값 정리
    const cleanId = (id || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanId || !cleanPassword) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      setIsLoading(false);
      return;
    }

    console.log('Login attempt:', { 
      id: cleanId, 
      passwordLength: cleanPassword.length,
      passwordPreview: cleanPassword.substring(0, 3) + '...',
      rawPasswordLength: password?.length,
      rawPasswordValue: password
    });

    try {
      const response = await authService.login({ 
        id: cleanId, 
        password: cleanPassword 
      });

      console.log('Login response:', response);

      if (response && response.user) {
        onLogin({ 
          id: response.user.id, 
          name: response.user.name, 
          role: response.user.role 
        });
      } else {
        setError(t.errorMessage);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // 에러 메시지 추출
      let errorMessage = t.errorMessage;
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-md p-4 animate-in fade-in zoom-in duration-500">
        {/* 언어 선택 드롭다운 */}
        <div className="mb-4 flex justify-end">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="pl-10 pr-4 py-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ko">한국어</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-sm">
          <div className="p-10">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-200 mb-6">
                <Settings2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{t.title}</h1>
              <p className="text-slate-500 text-sm font-medium">{t.subtitle}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t.idLabel}</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input 
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-medium"
                    placeholder={t.idPlaceholder}
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t.passwordLabel}</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input 
                    type="password"
                    required
                    autoComplete="new-password"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    value={password}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log('Password input changed:', { length: newValue.length, preview: newValue.substring(0, 3) + '...' });
                      setPassword(newValue);
                    }}
                    onBlur={(e) => {
                      console.log('Password field blurred:', { length: e.target.value.length, preview: e.target.value.substring(0, 3) + '...' });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-sm font-medium"
                    placeholder={t.passwordPlaceholder}
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
                    {t.loginButton}
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-medium">{t.accountInquiry}</p>
              <p className="text-xs font-bold text-slate-600 mt-1">{t.contactInfo}</p>
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
