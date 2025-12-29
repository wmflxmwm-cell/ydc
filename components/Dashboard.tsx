
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Project, Gate, Issue, GateStatus, ProjectType } from '../types';
import { Box, Layers, Target, Clock, AlertCircle, Search, ChevronRight, CheckCircle2, Circle, FileText, X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Props {
  projects: Project[];
  gates: Gate[];
  issues: Issue[];
}

const Dashboard: React.FC<Props> = ({ projects, gates, issues }) => {
  const [filterType, setFilterType] = useState<'ALL' | ProjectType>('ALL');
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedReportProject, setSelectedReportProject] = useState<Project | null>(null);
  const [reportContent, setReportContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartMounted, setChartMounted] = useState(false);
  const [chartSize, setChartSize] = useState({ width: 0, height: 256 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const pieChartContainerRef = useRef<HTMLDivElement>(null);

  // Chart가 마운트된 후에만 렌더링 (로그인 후 컴포넌트 전환 시 안정화)
  // useLayoutEffect를 사용하여 DOM이 완전히 렌더링된 후 Chart를 표시
  useLayoutEffect(() => {
    // DOM이 완전히 렌더링된 후 Chart를 표시
    const timer = setTimeout(() => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth;
        const height = chartContainerRef.current.offsetHeight;
        if (width > 0 && height > 0) {
          setChartSize({ width, height });
          setChartMounted(true);
        }
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Chart 크기 재계산을 위한 resize 이벤트 리스너
  useEffect(() => {
    if (!chartMounted) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth;
        const height = chartContainerRef.current.offsetHeight;
        if (width > 0 && height > 0) {
          setChartSize({ width, height });
        }
      }
    };

    // 초기 크기 계산
    handleResize();
    
    // window resize 이벤트 리스너 추가
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartMounted]);

  // 필터링된 데이터 계산
  const filteredProjects = useMemo(() => {
    let result = projects;
    if (filterType !== 'ALL') {
      result = result.filter(p => p.type === filterType);
    }
    if (projectSearch) {
      result = result.filter(p => 
        p.partName.toLowerCase().includes(projectSearch.toLowerCase()) || 
        p.partNumber.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.customerName.toLowerCase().includes(projectSearch.toLowerCase())
      );
    }
    return result;
  }, [projects, filterType, projectSearch]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);

  const filteredGates = useMemo(() => {
    return gates.filter(g => filteredProjectIds.has(g.projectId));
  }, [gates, filteredProjectIds]);

  const filteredIssues = useMemo(() => {
    return issues.filter(i => filteredProjectIds.has(i.projectId));
  }, [issues, filteredProjectIds]);

  // AI 리포트 생성 함수
  const generateExecutiveReport = async (project: Project) => {
    setIsGenerating(true);
    setSelectedReportProject(project);
    
    const projectGates = gates.filter(g => g.projectId === project.id);
    const projectIssues = issues.filter(i => i.projectId === project.id);
    const currentPhase = Math.max(...projectGates.filter(g => g.status !== GateStatus.LOCKED).map(g => g.phaseNumber), 1);
    
    const prompt = `
      당신은 15년 차 자동차 산업 PM입니다. 다음 데이터를 바탕으로 경영진 보고용 'APQP 진행 현황 보고서'를 4개 슬라이드 구성으로 작성하세요.
      
      [데이터]
      - 차종: ${project.carModel}
      - 품명: ${project.partName}
      - 고객사: ${project.customerName}
      - SOP: ${project.sopDate}
      - 현재 단계: ${currentPhase}단계
      - 이슈 사항: ${projectIssues.map(i => i.description).join(', ')}
      
      [보고서 구성 요구사항]
      1. Slide 1: Executive Summary - 신호등(Green/Yellow/Red) 표시와 이유 요약.
      2. Slide 2: Master Schedule - 현재 단계 위치 및 주요 이벤트 계획 vs 실적.
      3. Slide 3: Key Issues & Risk Management - 문제점, 원인, 대책 표 형식.
      4. Slide 4: Detailed Phase Status - 필수 산출물 리스트 및 완료율.
      
      말투는 전문적이고 간결한 개조식(~임, ~완료)으로 작성하고 Markdown 형식을 사용하세요.
    `;

    try {
      // Vite 환경 변수 사용 (VITE_ 접두사 필요)
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        setReportContent('Gemini API 키가 설정되지 않았습니다. 환경 변수 VITE_GEMINI_API_KEY를 확인하세요.');
        setIsGenerating(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setReportContent(response.text || '리포트를 생성할 수 없습니다.');
    } catch (error) {
      console.error('AI 리포트 생성 오류:', error);
      setReportContent('리포트 생성 중 오류가 발생했습니다. API 키 설정을 확인하세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 통계 데이터 계산
  const stats = [
    { label: '대상 프로젝트', value: filteredProjects.length, icon: Box, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: '활성 품질 이슈', value: filteredIssues.filter(i => !i.isResolved).length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { 
      label: '평균 달성률', 
      value: filteredProjects.length > 0 ? `${Math.round((filteredGates.filter(g => g.status === GateStatus.APPROVED).length / (filteredProjects.length * 5)) * 100)}%` : '0%', 
      icon: Target, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100' 
    },
    { 
      label: 'SOP 임박 (30일)', 
      value: filteredProjects.filter(p => {
        const sopDate = new Date(p.sopDate);
        const today = new Date();
        const diffTime = sopDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      }).length, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100' 
    },
  ];

  const phaseData = [1, 2, 3, 4, 5].map(phase => ({
    name: `${phase}단계`,
    approved: filteredGates.filter(g => g.phaseNumber === phase && g.status === GateStatus.APPROVED).length,
    open: filteredGates.filter(g => g.phaseNumber === phase && g.status === GateStatus.OPEN).length,
    locked: filteredGates.filter(g => g.phaseNumber === phase && g.status === GateStatus.LOCKED).length,
  }));

  const issueData = [
    { name: '기공', value: filteredIssues.filter(i => i.issueType.includes('기공')).length },
    { name: '치수', value: filteredIssues.filter(i => i.issueType.includes('치수')).length },
    { name: '미성형', value: filteredIssues.filter(i => i.issueType.includes('미성형')).length },
    { name: '표면', value: filteredIssues.filter(i => i.issueType.includes('표면')).length },
    { name: '기타', value: filteredIssues.filter(i => i.issueType === '기타').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getProjectProgress = (projectId: string) => {
    const projectGates = gates.filter(g => g.projectId === projectId);
    const approvedCount = projectGates.filter(g => g.status === GateStatus.APPROVED).length;
    return Math.round((approvedCount / 5) * 100);
  };

  const getGateStatusIcon = (projectId: string, phase: number) => {
    const gate = gates.find(g => g.projectId === projectId && g.phaseNumber === phase);
    if (!gate) return <Circle className="text-slate-200" size={14} />;
    
    if (gate.status === GateStatus.APPROVED) return <CheckCircle2 className="text-emerald-500" size={16} fill="currentColor" fillOpacity={0.1} />;
    if (gate.status === GateStatus.OPEN) return <ActivityIcon className="text-indigo-500 animate-pulse" size={16} />;
    return <Circle className="text-slate-200" size={14} />;
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm inline-flex items-center gap-1">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
              filterType === 'ALL' 
              ? 'bg-slate-900 text-white shadow-lg' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            전체 현황
          </button>
          <button
            onClick={() => setFilterType(ProjectType.NEW_DEVELOPMENT)}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
              filterType === ProjectType.NEW_DEVELOPMENT 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            신규 개발
          </button>
          <button
            onClick={() => setFilterType(ProjectType.INCREMENTAL_MOLD)}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
              filterType === ProjectType.INCREMENTAL_MOLD 
              ? 'bg-amber-600 text-white shadow-lg' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            증작 개발
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="품목명/번호 검색..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl transition-transform group-hover:scale-110`}>
                <stat.icon size={22} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Progress Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                {filterType === 'ALL' ? '전체' : filterType} 누적 단계별 현황
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">APQP 게이트별 승인/진행/대기 수량 분석</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Layers size={20} /></div>
          </div>
          <div 
            ref={chartContainerRef}
            className="h-64 w-full" 
            style={{ minHeight: '256px', minWidth: '100%', position: 'relative', width: '100%', height: '256px', overflow: 'hidden' }}
          >
            {chartMounted && phaseData.length > 0 && chartSize.width > 0 ? (
              <ResponsiveContainer 
                width={chartSize.width} 
                height={chartSize.height}
              >
                <BarChart data={phaseData} barGap={0} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} width={chartSize.width} height={chartSize.height}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="approved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="승인완료" barSize={40} />
                <Bar dataKey="open" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} name="진행중" barSize={40} />
                <Bar dataKey="locked" stackId="a" fill="#f1f5f9" radius={[6, 6, 0, 0]} name="대기" barSize={40} />
              </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <p className="text-sm">데이터 로딩 중...</p>
              </div>
            )}
          </div>
        </div>

        {/* Issue Type Chart */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">품질 리스크 분포</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">유형별 부적합 이슈 통계</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-500"><AlertCircle size={20} /></div>
          </div>
          {issueData.length > 0 ? (
            <div 
              ref={pieChartContainerRef}
              className="h-64 w-full flex flex-col items-center" 
              style={{ minHeight: '256px', minWidth: '100%', position: 'relative', width: '100%', height: '256px', overflow: 'hidden' }}
            >
              {chartMounted && pieChartContainerRef.current && (
                <ResponsiveContainer 
                  width={pieChartContainerRef.current.offsetWidth || '100%'} 
                  height={Math.floor((pieChartContainerRef.current.offsetHeight || 256) * 0.8)}
                >
                  <PieChart width={pieChartContainerRef.current.offsetWidth || 400} height={Math.floor((pieChartContainerRef.current.offsetHeight || 256) * 0.8)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <Pie
                    data={issueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {issueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                {issueData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="text-[10px] font-bold text-slate-500">{item.name} {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <AlertCircle size={32} className="mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">리스크 데이터 없음</p>
            </div>
          )}
        </div>
      </div>

      {/* Individual Project Progress Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <Target size={20} className="text-indigo-600" />
              품목별 세부 진행 현황
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">현재 필터링된 {filteredProjects.length}개 품목의 실시간 Phase 상태</p>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-4">
            <div className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> 승인완료</div>
            <div className="flex items-center gap-1.5"><ActivityIcon size={12} className="text-indigo-500" /> 진행중</div>
            <div className="flex items-center gap-1.5"><Circle size={10} className="text-slate-300" /> 대기</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">품목 정보</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">전체 진행률</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">P1</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">P2</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">P3</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">P4</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">P5</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">경영 보고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProjects.map((project) => {
                const progress = getProjectProgress(project.id);
                return (
                  <tr key={project.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${project.type === ProjectType.NEW_DEVELOPMENT ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{project.partName}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">{project.partNumber} · {project.customerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-black text-slate-700">{progress}%</span>
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5].map(phase => (
                      <td key={phase} className="px-4 py-5 text-center">
                        <div className="inline-flex items-center justify-center p-2 rounded-lg bg-white border border-slate-100 shadow-sm group-hover:border-indigo-100 transition-colors">
                          {getGateStatusIcon(project.id, phase)}
                        </div>
                      </td>
                    ))}
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => generateExecutiveReport(project)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 ml-auto shadow-sm border border-indigo-200 transition-all active:scale-95"
                      >
                        <Sparkles size={14} />
                        리포트 생성
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Report Modal - React Portal 사용하여 body에 직접 렌더링 */}
      {selectedReportProject && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              setSelectedReportProject(null);
              setReportContent('');
            }
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2.5 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight uppercase">APQP 경영진 보고서 (Draft)</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedReportProject.partName} · AI-ASSISTED</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedReportProject(null);
                  setReportContent('');
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-800">베테랑 PM이 보고서를 작성 중입니다...</p>
                    <p className="text-sm text-slate-500 font-medium">현재 단계, 품질 이슈, SOP 일정을 종합 분석하고 있습니다.</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-indigo-600 prose-table:border-collapse prose-th:bg-slate-100 prose-th:p-3 prose-td:p-3 prose-td:border prose-td:border-slate-200">
                  <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 min-h-[500px] whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {reportContent || '리포트 내용이 없습니다.'}
                  </div>
                  
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center gap-4">
                      <Target className="text-indigo-600" />
                      <div>
                        <p className="text-xs font-black text-indigo-800 uppercase">전략적 제언</p>
                        <p className="text-xs text-indigo-600 font-medium mt-1">상기 내용은 현재의 품질 지표를 바탕으로 AI가 생성한 초안입니다. 실제 보고 시 검토가 필요합니다.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.print()}
                      className="bg-slate-900 text-white font-black py-4 px-8 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                    >
                      보고서 PDF 출력
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ActivityIcon = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export default Dashboard;
