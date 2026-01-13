import React, { useState, useEffect, useMemo } from 'react';
import { Wrench, TrendingUp, Package, AlertTriangle, Plus } from 'lucide-react';
import { projectService } from '../src/api/services/projectService';
import { ProjectType, ProjectStatus, Project } from '../types';

interface Props {
  user?: { id: string; name: string; role: string };
  projects?: Project[]; // Projects passed from App.tsx
  onProjectsUpdate?: () => void; // Callback to refresh projects
}

type MoldProjectData = {
  customer: string;
  project: string;
  구분: string; // 증작 금형 구분
  요청일: string;
  forecast: number; // 총 Forecast 수량
  재고: number; // 베트남 재고 수량
  타당성_계획: string;
  타당성_실적: string;
  금형발주_계획: string;
  금형발주_실적: string;
  금형입고_계획: string;
  금형입고_실적: string;
  이슈내용: string;
  status: ProjectStatus;
  projectId: string;
};

const MoldManagement: React.FC<Props> = ({ user, projects: propsProjects, onProjectsUpdate }) => {
  // State declarations
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [selectedCustomer, setSelectedCustomer] = useState<string>('전체');
  const [selectedProject, setSelectedProject] = useState<string>('전체');
  const [selectedStatus, setSelectedStatus] = useState<string>('전체');

  // Register mode state (인라인 편집)
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [editingRow, setEditingRow] = useState<Partial<MoldProjectData>>({
    customer: '',
    project: '',
    구분: '',
    요청일: new Date().toISOString().split('T')[0],
    forecast: 0,
    재고: 0,
    타당성_계획: '',
    타당성_실적: '',
    금형발주_계획: '',
    금형발주_실적: '',
    금형입고_계획: '',
    금형입고_실적: '',
    istrSubmissionPlan: '',
    istrSubmissionActual: '',
    ydcVnPpapPlan: '',
    ydcVnPpapActual: '',
    이슈내용: '',
    status: ProjectStatus.IN_PROGRESS
  });

  // Load projects
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      if (propsProjects && propsProjects.length > 0) {
        setProjects(propsProjects);
      } else {
        const projectsData = await projectService.getAll();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('❌ MoldManagement: Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [propsProjects]);

  // Handle register mode toggle
  const handleStartRegister = () => {
    setIsRegisterMode(true);
    // Reset editing row to defaults
    setEditingRow({
      customer: '',
      project: '',
      구분: '',
      요청일: new Date().toISOString().split('T')[0],
      forecast: 0,
      재고: 0,
      타당성_계획: '',
      타당성_실적: '',
      금형발주_계획: '',
      금형발주_실적: '',
      금형입고_계획: '',
      금형입고_실적: '',
      istrSubmissionPlan: '',
      istrSubmissionActual: '',
      ydcVnPpapPlan: '',
      ydcVnPpapActual: '',
      이슈내용: '',
      status: ProjectStatus.IN_PROGRESS
    });
  };

  // Handle cancel register
  const handleCancelRegister = () => {
    setIsRegisterMode(false);
    setEditingRow({
      customer: '',
      project: '',
      구분: '',
      요청일: new Date().toISOString().split('T')[0],
      forecast: 0,
      재고: 0,
      타당성_계획: '',
      타당성_실적: '',
      금형발주_계획: '',
      금형발주_실적: '',
      금형입고_계획: '',
      금형입고_실적: '',
      istrSubmissionPlan: '',
      istrSubmissionActual: '',
      ydcVnPpapPlan: '',
      ydcVnPpapActual: '',
      이슈내용: '',
      status: ProjectStatus.IN_PROGRESS
    });
  };

  // Handle save register
  const handleSaveRegister = async () => {
    // Validate required fields
    if (!editingRow.customer || !editingRow.project) {
      alert('고객사와 프로젝트는 필수 입력 항목입니다.');
      return;
    }

    try {
      // Create new project
      const newProject: Partial<Project> = {
        customerName: editingRow.customer,
        partName: editingRow.project,
        partNumber: '', // Will be set from part selection if needed
        carModel: '',
        moldCavity: 2,
        sopDate: '',
        material: 'ALDC12',
        status: editingRow.status || ProjectStatus.IN_PROGRESS,
        type: ProjectType.INCREMENTAL_MOLD,
        developmentPhase: editingRow.구분 || '',
        createdAt: editingRow.요청일 || new Date().toISOString().split('T')[0],
        feasibilityReviewPlan: editingRow.타당성_계획 || '',
        feasibilityReviewActual: editingRow.타당성_실적 || '',
        moldOrderPlan: editingRow.금형발주_계획 || '',
        moldOrderActual: editingRow.금형발주_실적 || '',
        moldDeliveryPlan: editingRow.금형입고_계획 || '',
        moldDeliveryActual: editingRow.금형입고_실적 || '',
        istrSubmissionPlan: editingRow.istrSubmissionPlan || '',
        istrSubmissionActual: editingRow.istrSubmissionActual || '',
        ydcVnPpapPlan: editingRow.ydcVnPpapPlan || '',
        ydcVnPpapActual: editingRow.ydcVnPpapActual || '',
        volume2026: editingRow.forecast > 0 ? editingRow.forecast : undefined,
      };

      await projectService.create(newProject as any);
      
      // Refresh projects
      await loadProjects();
      if (onProjectsUpdate) {
        onProjectsUpdate();
      }

      // Exit register mode
      setIsRegisterMode(false);
      alert('증작금형 프로젝트가 등록되었습니다.');
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('프로젝트 등록에 실패했습니다.');
    }
  };

  // Filter projects to only INCREMENTAL_MOLD type
  const moldProjects = useMemo(() => {
    return projects.filter(p => p.type === ProjectType.INCREMENTAL_MOLD);
  }, [projects]);

  // Transform projects to MoldProjectData format
  const moldData = useMemo((): MoldProjectData[] => {
    return moldProjects.map(project => {
      // Calculate total forecast (sum of all years)
      const forecast = [
        project.volume2026 ?? 0,
        project.volume2027 ?? 0,
        project.volume2028 ?? 0,
        project.volume2029 ?? 0,
        project.volume2030 ?? 0,
        project.volume2031 ?? 0,
        project.volume2032 ?? 0
      ].reduce((sum, vol) => sum + vol, 0);

      // 재고는 임시로 0으로 설정 (실제 데이터가 있으면 연결)
      const 재고 = 0;

      return {
        customer: project.customerName,
        project: project.partName,
        구분: project.developmentPhase ?? '',
        요청일: project.createdAt,
        forecast,
        재고,
        타당성_계획: project.feasibilityReviewPlan ?? '',
        타당성_실적: project.feasibilityReviewActual ?? '',
        금형발주_계획: project.moldOrderPlan ?? '',
        금형발주_실적: project.moldOrderActual ?? '',
        금형입고_계획: project.moldDeliveryPlan ?? '',
        금형입고_실적: project.moldDeliveryActual ?? '',
        이슈내용: '', // 이슈는 별도로 연결 필요
        status: project.status,
        projectId: project.id
      };
    });
  }, [moldProjects]);

  // Apply filters
  const filteredData = useMemo(() => {
    let filtered = moldData;
    
    if (selectedCustomer !== '전체') {
      filtered = filtered.filter(d => d.customer === selectedCustomer);
    }
    
    if (selectedProject !== '전체') {
      filtered = filtered.filter(d => d.project === selectedProject);
    }
    
    if (selectedStatus !== '전체') {
      filtered = filtered.filter(d => d.status === selectedStatus);
    }
    
    return filtered;
  }, [moldData, selectedCustomer, selectedProject, selectedStatus]);

  // KPI Calculations - Grouped by part name (품목별)
  const kpisByPart = useMemo(() => {
    const partGroups = new Map<string, { forecast: number; 재고: number; count: number }>();
    
    filteredData.forEach(d => {
      const existing = partGroups.get(d.project) || { forecast: 0, 재고: 0, count: 0 };
      partGroups.set(d.project, {
        forecast: existing.forecast + d.forecast,
        재고: existing.재고 + d.재고,
        count: existing.count + 1
      });
    });
    
    return Array.from(partGroups.entries()).map(([partName, data]) => ({
      partName,
      forecast: data.forecast,
      재고: data.재고,
      count: data.count
    })).sort((a, b) => a.partName.localeCompare(b.partName));
  }, [filteredData]);

  // Overall KPI Calculations
  const kpis = useMemo(() => {
    const totalForecast = filteredData.reduce((sum, d) => sum + d.forecast, 0);
    const total재고 = filteredData.reduce((sum, d) => sum + d.재고, 0);
    const inProgressCount = filteredData.filter(d => d.status === ProjectStatus.IN_PROGRESS).length;
    
    return {
      totalForecast,
      total재고,
      inProgressCount
    };
  }, [filteredData]);

  // Get unique customers and projects for filters
  const uniqueCustomers = useMemo(() => {
    return Array.from(new Set(moldData.map(d => d.customer))).sort();
  }, [moldData]);

  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(moldData.map(d => d.project))).sort();
  }, [moldData]);

  // Calculate delay status
  const getDelayStatus = (plan: string, actual: string): '정상' | '지연' => {
    if (!plan || !actual) return '정상';
    const planDate = new Date(plan);
    const actualDate = new Date(actual);
    return actualDate > planDate ? '지연' : '정상';
  };

  // Get heatmap color for 재고
  const get재고Color = (재고: number, max재고: number): string => {
    if (max재고 === 0) return '#e5e7eb'; // gray if no data
    const ratio = 재고 / max재고;
    if (ratio < 0.3) return '#ef4444'; // red (low)
    if (ratio < 0.6) return '#f59e0b'; // orange (medium)
    return '#10b981'; // green (high)
  };

  // Get max 재고 for normalization
  const max재고 = useMemo(() => {
    return Math.max(...filteredData.map(d => d.재고), 1);
  }, [filteredData]);

  // Get max forecast for bar chart
  const maxForecast = useMemo(() => {
    return Math.max(...filteredData.map(d => d.forecast), 1);
  }, [filteredData]);

  return (
    <div style={{ 
      padding: '20px', 
      background: '#F5F6F7', // Looker Studio style background
      minHeight: '100vh',
      fontFamily: 'Noto Sans KR, Roboto, sans-serif'
    }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">증작금형 관리 대시보드</h1>
              <p className="text-slate-600 text-sm">Looker Studio 스타일 대시보드</p>
            </div>
          </div>
          {!isRegisterMode ? (
            <button
              onClick={handleStartRegister}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
              type="button"
            >
              <Plus size={18} />
              증작금형 등록
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRegister}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
                type="button"
              >
                저장
              </button>
              <button
                onClick={handleCancelRegister}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-slate-600 text-white hover:bg-slate-700 shadow-lg"
                type="button"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>

      {/* A. 상단: 컨트롤(Filter) 및 핵심 지표 (KPI) */}
      <div className="mb-6">
        {/* Filters */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Customer</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="전체">전체</option>
              {uniqueCustomers.map(customer => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Project</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="전체">전체</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">진행상태</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="전체">전체</option>
              <option value={ProjectStatus.IN_PROGRESS}>진행중</option>
              <option value={ProjectStatus.COMPLETED}>완료</option>
            </select>
          </div>
        </div>

        {/* KPI Scorecards - 품목별 */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 mb-3">품목별 지표</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpisByPart.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg p-6 shadow-sm border border-slate-200 text-center text-slate-500">
                <p>품목별 데이터가 없습니다.</p>
              </div>
            ) : (
              kpisByPart.map((kpi, index) => (
                <div key={kpi.partName} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-900">{kpi.partName}</span>
                    <span className="text-xs text-slate-500">({kpi.count}건)</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-slate-600">잔여 Forecast</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{kpi.forecast.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-slate-600">현재 재고</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{kpi.재고.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overall KPI Scorecards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">전체 총 잔여 Forecast</span>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.totalForecast.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">전체 물량 합계</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">전체 현재 총 재고</span>
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.total재고.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">베트남 재고 합계</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">진행 중 프로젝트 수</span>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.inProgressCount}</p>
            <p className="text-xs text-slate-500 mt-1">카운트(Project)</p>
          </div>
        </div>
      </div>

      {/* B. 중단: 일정 현황 테이블 (메인) */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-[#2C3E50] text-white px-6 py-4">
            <h2 className="text-lg font-bold">일정 현황 테이블</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">구분</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">요청일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 border-b">재고</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 border-b">잔여 Forecast</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">타당성_계획</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">타당성_실적</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">금형발주_계획</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">금형발주_실적</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 border-b">이슈내용</th>
                </tr>
              </thead>
              <tbody>
                {/* Editable row (register mode) - 맨 위에 표시 */}
                {isRegisterMode && (
                  <tr className="border-b bg-blue-50 hover:bg-blue-100">
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="text"
                        value={editingRow.project || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, project: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="프로젝트"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="text"
                        value={editingRow.구분 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 구분: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="구분"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="date"
                        value={editingRow.요청일 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 요청일: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      <input
                        type="number"
                        value={editingRow.재고 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 재고: Number(e.target.value) || 0 }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right border-b">
                      <input
                        type="number"
                        value={editingRow.forecast || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, forecast: Number(e.target.value) || 0 }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="date"
                        value={editingRow.타당성_계획 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 타당성_계획: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="date"
                        value={editingRow.타당성_실적 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 타당성_실적: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="date"
                        value={editingRow.금형발주_계획 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 금형발주_계획: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <input
                        type="date"
                        value={editingRow.금형발주_실적 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 금형발주_실적: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <textarea
                        value={editingRow.이슈내용 || ''}
                        onChange={(e) => setEditingRow(prev => ({ ...prev, 이슈내용: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={2}
                        placeholder="이슈내용"
                      />
                    </td>
                  </tr>
                )}
                {filteredData.length === 0 && !isRegisterMode ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                      <p className="font-bold">등록된 증작금형 프로젝트가 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, index) => {
                  const 재고Color = get재고Color(row.재고, max재고);
                  const forecastBarWidth = (row.forecast / maxForecast) * 100;
                  const 타당성지연 = getDelayStatus(row.타당성_계획, row.타당성_실적);
                  const 금형발주지연 = getDelayStatus(row.금형발주_계획, row.금형발주_실적);
                  
                  return (
                    <tr 
                      key={row.projectId}
                      className={`border-b hover:bg-slate-50 ${
                        타당성지연 === '지연' || 금형발주지연 === '지연' 
                          ? 'bg-red-50' 
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-900">{row.project}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.구분}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.요청일}</td>
                      <td className="px-4 py-3 text-right">
                        <div 
                          className="inline-block px-3 py-1 rounded text-sm font-semibold text-white"
                          style={{ backgroundColor: 재고Color }}
                        >
                          {row.재고.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex-1 max-w-[200px]">
                            <div className="h-6 bg-slate-200 rounded overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 flex items-center justify-end pr-2"
                                style={{ width: `${forecastBarWidth}%` }}
                              >
                                <span className="text-xs font-semibold text-white">
                                  {row.forecast.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.타당성_계획 || '-'}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${
                        타당성지연 === '지연' ? 'text-red-600' : 'text-slate-700'
                      }`}>
                        {row.타당성_실적 || '-'}
                        {타당성지연 === '지연' && <span className="ml-2 text-xs">⚠️ 지연</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.금형발주_계획 || '-'}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${
                        금형발주지연 === '지연' ? 'text-red-600' : 'text-slate-700'
                      }`}>
                        {row.금형발주_실적 || '-'}
                        {금형발주지연 === '지연' && <span className="ml-2 text-xs">⚠️ 지연</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.이슈내용 || '-'}</td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* C. 하단: 일정 지연 경고 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-[#2C3E50] text-white px-6 py-4">
          <h2 className="text-lg font-bold">일정 지연 경고</h2>
        </div>
        <div className="p-6">
          {filteredData.filter(row => {
            const 타당성지연 = getDelayStatus(row.타당성_계획, row.타당성_실적);
            const 금형발주지연 = getDelayStatus(row.금형발주_계획, row.금형발주_실적);
            return 타당성지연 === '지연' || 금형발주지연 === '지연';
          }).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-lg font-semibold">지연된 일정이 없습니다.</p>
              <p className="text-sm mt-2">모든 프로젝트가 계획대로 진행 중입니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map(row => {
                const 타당성지연 = getDelayStatus(row.타당성_계획, row.타당성_실적);
                const 금형발주지연 = getDelayStatus(row.금형발주_계획, row.금형발주_실적);
                
                if (타당성지연 === '정상' && 금형발주지연 === '정상') return null;
                
                return (
                  <div 
                    key={row.projectId}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-900">{row.project}</p>
                        <p className="text-sm text-red-700 mt-1">
                          {타당성지연 === '지연' && `타당성 검토 지연 (계획: ${row.타당성_계획}, 실적: ${row.타당성_실적})`}
                          {타당성지연 === '지연' && 금형발주지연 === '지연' && ' / '}
                          {금형발주지연 === '지연' && `금형발주 지연 (계획: ${row.금형발주_계획}, 실적: ${row.금형발주_실적})`}
                        </p>
                      </div>
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-slate-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default MoldManagement;
