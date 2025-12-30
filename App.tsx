
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, Settings2, AlertTriangle, ChevronRight, Activity, Database, CheckCircle2, LogOut, User as UserIcon, BookOpen } from 'lucide-react';
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
import Login from './components/Login';

interface UserSession {
  id: string;
  name: string;
  role: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registration' | 'management' | 'issues' | 'users' | 'settings'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // 로컬 스토리지에서 세션 복구 시도
  useEffect(() => {
    const savedUser = localStorage.getItem('apqp_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 데이터 로딩
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [projectsData, issuesData] = await Promise.all([
        projectService.getAll(),
        issueService.getAll()
      ]);
      setProjects(projectsData);
      setIssues(issuesData);

      // 모든 프로젝트의 게이트 정보를 가져옴 (실제로는 필요할 때 가져오는 것이 좋지만 기존 구조 유지를 위해)
      const allGates: Gate[] = [];
      for (const project of projectsData) {
        const projectGates = await gateService.getByProjectId(project.id);
        allGates.push(...projectGates);
      }
      setGates(allGates);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleLogin = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem('apqp_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      setUser(null);
      localStorage.removeItem('apqp_session');
      setProjects([]);
      setGates([]);
      setIssues([]);
    }
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
      alert('프로젝트 등록에 실패했습니다.');
    }
  };

  const updateGate = async (updatedGate: Gate) => {
    try {
      const result = await gateService.update(updatedGate.id, updatedGate);
      setGates(prev => prev.map(g => g.id === result.id ? result : g));
    } catch (error) {
      console.error('Failed to update gate:', error);
      alert('게이트 업데이트에 실패했습니다.');
    }
  };

  const addIssue = async (newIssue: Issue) => {
    try {
      const { id, ...issueData } = newIssue;
      const createdIssue = await issueService.create(issueData);
      setIssues(prev => [...prev, createdIssue]);
    } catch (error) {
      console.error('Failed to add issue:', error);
      alert('이슈 등록에 실패했습니다.');
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
      alert('상태 변경에 실패했습니다.');
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
            다이캐스팅<br /><span className="text-indigo-400 text-sm uppercase">APQP 관리 시스템</span>
          </span>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">종합 대시보드</span>
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'registration' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium text-sm">프로젝트 등록</span>
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'management' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium text-sm">단계별 상세 관리</span>
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'issues' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium text-sm">품질 이슈 트래커</span>
          </button>

          {(user.role.includes('총괄') || user.role === 'MANAGER') && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-medium text-sm">사용자 관리</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium text-sm">기본 내용</span>
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
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/30 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-all font-bold text-xs"
          >
            <LogOut size={14} />
            시스템 로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 transition-all duration-300">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && '경영 종합 대시보드'}
              {activeTab === 'registration' && '신규 프로젝트 등록'}
              {activeTab === 'management' && 'APQP 단계별 게이트 관리'}
              {activeTab === 'issues' && '품질 결함 이슈 관리'}
              {activeTab === 'users' && '시스템 사용자 관리'}
              {activeTab === 'settings' && '기본 내용 관리'}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              자동차 다이케스팅 부품 사전 제품 품질 계획 시스템
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[11px] font-black text-slate-400 bg-white px-4 py-2 rounded-full border shadow-sm flex items-center gap-2 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> SYSTEM ONLINE
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* 조건부 렌더링 대신 CSS로 숨김 처리하여 컴포넌트 언마운트 방지 - React 19 removeChild 오류 해결 */}
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard projects={projects} gates={gates} issues={issues} />
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
