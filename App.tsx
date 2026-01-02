
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, Settings2, AlertTriangle, ChevronRight, Activity, Database, CheckCircle2, LogOut, User as UserIcon, BookOpen, TrendingUp, Calendar, Package, Languages } from 'lucide-react';
import { Project, Gate, Issue, ProjectStatus, GateStatus } from './types';
import { projectService } from './src/api/services/projectService';
import { gateService } from './src/api/services/gateService';
import { issueService } from './src/api/services/issueService';
import Dashboard from './components/Dashboard';
import ProjectRegistration from './components/ProjectRegistration';
import PhaseManagement from './components/PhaseManagement';
import IssueTracker from './components/IssueTracker';
import UserManagement from './src/components/UserManagement';
import SettingsManagement from './components/SettingsManagement';
import Forecast from './components/Forecast';
import SampleSchedule from './components/SampleSchedule';
import PartRegistration from './components/PartRegistration';
import Login from './components/Login';
import { getLanguage, getTranslations } from './src/utils/translations';

interface UserSession {
  id: string;
  name: string;
  role: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registration' | 'management' | 'issues' | 'users' | 'settings' | 'forecast' | 'sample' | 'part'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ko' | 'vi'>(getLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  const t = getTranslations(language);

  // 로컬 스토리지에서 세션 복구 시도
  useEffect(() => {
    const savedUser = localStorage.getItem('apqp_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    // 언어 설정 감지
    const handleStorageChange = () => {
      setLanguage(getLanguage());
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      const currentLang = getLanguage();
      if (currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 100);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  // 데이터 로딩
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const [projectsData, issuesData] = await Promise.all([
        projectService.getAll(),
        issueService.getAll()
      ]);
      setProjects(projectsData);
      setIssues(issuesData);

      // 모든 프로젝트의 게이트 정보를 병렬로 가져옴
      try {
        const gatesPromises = projectsData.map(project => gateService.getByProjectId(project.id));
        const gatesResults = await Promise.all(gatesPromises);
        const allGates = gatesResults.flat();
        setGates(allGates);
      } catch (gateError) {
        console.error('Failed to fetch gates:', gateError);
        // 게이트 로딩 실패해도 프로젝트와 이슈는 표시
        setGates([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      setLoadingError(errorMessage);
      // 네트워크 오류인 경우 알림
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        alert('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem('apqp_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    if (confirm(t.app.logoutConfirm)) {
      setUser(null);
      localStorage.removeItem('apqp_session');
      setProjects([]);
      setGates([]);
      setIssues([]);
    }
  };

  const handleLanguageChange = (lang: 'ko' | 'vi') => {
    localStorage.setItem('apqp_language', lang);
    setLanguage(lang);
    // 페이지 새로고침하여 모든 컴포넌트에 언어 변경 적용
    window.location.reload();
  };

  const addProject = async (newProject: Project) => {
    try {
      // ID와 createdAt은 서버에서 생성되므로 제외하고 보냄
      const { id, createdAt, ...projectData } = newProject;
      const createdProject = await projectService.create(projectData);
      setProjects(prev => [...prev, createdProject]);

      // 게이트 정보도 다시 불러옴
      const newGates = await gateService.getByProjectId(createdProject.id);
      setGates(prev => [...prev, ...newGates]);
    } catch (error) {
      console.error('Failed to add project:', error);
      alert(t.registration.error);
    }
  };

  const updateGate = async (updatedGate: Gate) => {
    try {
      const result = await gateService.update(updatedGate.id, updatedGate);
      setGates(prev => prev.map(g => g.id === result.id ? result : g));
    } catch (error) {
      console.error('Failed to update gate:', error);
      alert(t.phaseManagement.update + ' 실패');
    }
  };

  const addIssue = async (newIssue: Issue) => {
    try {
      const { id, ...issueData } = newIssue;
      const createdIssue = await issueService.create(issueData);
      setIssues(prev => [...prev, createdIssue]);
    } catch (error) {
      console.error('Failed to add issue:', error);
      alert(t.issueTracker.addIssue + ' 실패');
    }
  };

  const toggleIssueResolution = async (id: string) => {
    try {
      const issue = issues.find(i => i.id === id);
      if (issue) {
        const updatedIssue = await issueService.update(id, { isResolved: !issue.isResolved });
        setIssues(prev => prev.map(i => i.id === id ? updatedIssue : i));
      }
    } catch (error) {
      console.error('Failed to toggle issue resolution:', error);
      alert('상태 변경 실패');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('이 프로젝트를 삭제하시겠습니까? 관련된 모든 게이트와 이슈도 함께 삭제됩니다.')) {
      return;
    }
    try {
      await projectService.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      setGates(prev => prev.filter(g => g.projectId !== id));
      setIssues(prev => prev.filter(i => i.projectId !== id));
      alert('프로젝트가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 로그인되지 않은 경우 로그인 화면 표시
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased animate-in fade-in duration-700">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 shadow-2xl z-50">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight leading-tight">
            {t.app.titleMain}<br /><span className="text-indigo-400 text-sm uppercase">{t.app.titleSub}</span>
          </span>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.dashboard}</span>
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'registration' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.newProject}</span>
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'management' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.gateManagement}</span>
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'issues' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.issueTracker}</span>
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'forecast' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.forecast}</span>
          </button>
          <button
            onClick={() => setActiveTab('sample')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'sample' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.sample}</span>
          </button>
          <button
            onClick={() => setActiveTab('part')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'part' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium text-sm">{t.app.sidebar.part}</span>
          </button>

          {(user.role === 'MANAGER') && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-medium text-sm">{t.app.sidebar.userManagement}</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium text-sm">{t.app.sidebar.settings}</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800 space-y-2">
          <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-inner">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{user.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('ko')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-xs ${
                language === 'ko' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-slate-800/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Languages size={14} />
              한국어
            </button>
            <button
              onClick={() => handleLanguageChange('vi')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-xs ${
                language === 'vi' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-slate-800/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Languages size={14} />
              Tiếng Việt
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/30 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-all font-bold text-xs"
          >
            <LogOut size={14} />
            {t.app.logout}
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 transition-all duration-300">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && t.app.dashboard}
              {activeTab === 'registration' && t.app.registration}
              {activeTab === 'management' && t.app.management}
              {activeTab === 'issues' && t.app.issues}
              {activeTab === 'forecast' && t.app.forecast}
              {activeTab === 'sample' && t.app.sample}
              {activeTab === 'part' && t.app.part}
              {activeTab === 'users' && t.app.users}
              {activeTab === 'settings' && t.app.settings}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              {t.app.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[11px] font-black text-slate-400 bg-white px-4 py-2 rounded-full border shadow-sm flex items-center gap-2 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {t.app.systemOnline}
            </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-blue-700">데이터를 불러오는 중...</p>
            </div>
          )}
          {loadingError && !isLoading && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="text-red-600" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">{loadingError}</p>
                <button
                  onClick={fetchData}
                  className="mt-2 text-xs font-bold text-red-600 hover:text-red-800 underline"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
          {/* 조건부 렌더링 대신 CSS로 숨김 처리하여 컴포넌트 언마운트 방지 - React 19 removeChild 오류 해결 */}
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard projects={projects} gates={gates} issues={issues} user={user} onDeleteProject={deleteProject} />
          </div>
          <div style={{ display: activeTab === 'registration' ? 'block' : 'none' }}>
            <ProjectRegistration 
              activeTab={activeTab}
              onAddProject={addProject} 
              onNavigateToManagement={() => setActiveTab('management')} 
            />
          </div>
          <div style={{ display: activeTab === 'management' ? 'block' : 'none' }}>
            <PhaseManagement
              projects={projects}
              gates={gates}
              issues={issues}
              onUpdateGate={updateGate}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
            />
          </div>
          <div style={{ display: activeTab === 'issues' ? 'block' : 'none' }}>
            <IssueTracker issues={issues} projects={projects} onToggleResolve={toggleIssueResolution} onAddIssue={addIssue} />
          </div>
          <div style={{ display: activeTab === 'forecast' ? 'block' : 'none' }}>
            <Forecast projects={projects} onProjectsUpdate={fetchData} />
          </div>
          <div style={{ display: activeTab === 'sample' ? 'block' : 'none' }}>
            <SampleSchedule user={user} />
          </div>
          <div style={{ display: activeTab === 'part' ? 'block' : 'none' }}>
            <PartRegistration user={user} />
          </div>
          <div style={{ display: activeTab === 'users' ? 'block' : 'none' }}>
            <UserManagement />
          </div>
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
            <SettingsManagement />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
