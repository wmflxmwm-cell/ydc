
import React, { useState, useMemo } from 'react';
import { Project, Gate, GateStatus, ProjectType, Issue } from '../types';
import { CheckCircle2, Lock, Unlock, FileText, FlaskConical, Wrench, Search, ChevronRight, Check, ClipboardList, Thermometer, Settings, Info } from 'lucide-react';
import { getTranslations } from '../src/utils/translations';

interface Props {
  projects: Project[];
  gates: Gate[];
  issues: Issue[];
  onUpdateGate: (gate: Gate) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

const PhaseManagement: React.FC<Props> = ({ projects, gates, issues, onUpdateGate, selectedProjectId, setSelectedProjectId }) => {
  const t = getTranslations();
  const [activePhase, setActivePhase] = useState<number>(1);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const projectGates = useMemo(() => 
    gates.filter(g => g.projectId === selectedProjectId).sort((a, b) => a.phaseNumber - b.phaseNumber), [gates, selectedProjectId]);

  const handleApprove = (phaseNum: number) => {
    const currentGate = projectGates.find(g => g.phaseNumber === phaseNum);
    if (!currentGate) return;

    const approvedGate: Gate = {
      ...currentGate,
      status: GateStatus.APPROVED,
      approvalDate: new Date().toISOString().split('T')[0]
    };
    onUpdateGate(approvedGate);

    const nextGate = projectGates.find(g => g.phaseNumber === phaseNum + 1);
    if (nextGate) {
      onUpdateGate({
        ...nextGate,
        status: GateStatus.OPEN
      });
    }
  };

  const getPhaseIcon = (num: number) => {
    switch(num) {
      case 1: return <FileText size={18} />;
      case 2: return <FlaskConical size={18} />;
      case 3: return <Settings size={18} />;
      case 4: return <Wrench size={18} />;
      case 5: return <CheckCircle2 size={18} />;
      default: return null;
    }
  };

  const getPhaseName = (num: number) => {
    switch(num) {
      case 1: return 'PLANNING AND DEFINITION';
      case 2: return 'PRODUCT DESIGN AND DEVELOPMENT';
      case 3: return 'PROCESS DESIGN AND DEVELOPMENT';
      case 4: return 'PRODUCT AND PROCESS VALIDATION';
      case 5: return 'PRODUCT AND PROCESS VERIFICATION';
      default: return '';
    }
  };

  const getPhaseTasks = (num: number, type?: ProjectType) => {
    // Basic tasks common to both
    const baseTasks = [];
    switch(num) {
      case 1: return [
        { label: 'Kick Off', sub: '' },
        { label: 'CFT Organization', sub: '조직도 구성' },
        { label: 'Feasibility Review (Customer & Supplier)', sub: '개발 타당성 검토' },
        { label: 'Milestone and Gate #1 Review', sub: '' },
      ];
      case 2: return [
        { label: 'Engineering change document', sub: '' },
        { label: 'Records of Material', sub: '원재료 요구사항' },
        { label: 'Equipment, Tooling & Facilities Requirement', sub: '장비, 금형 및 설비 요구사항' },
        { label: 'Milestone and Gate #2 Review', sub: '' },
      ];
      case 3: return [
        { label: 'Process Flow Diagram', sub: '' },
        { label: 'Lessons Learned', sub: '과거 문제 개선 이력' },
        { label: 'SC List & Control', sub: '특별특성 List & 관리방안' },
        { label: 'Process FMEA', sub: '' },
        { label: 'Pre-Launch Control Plan', sub: '' },
        { label: 'Production floor layout', sub: '공장 배치 계획' },
        { 
          label: 'Machine development plan (설비 셋업 계획)', 
          items: [
            'Leak test M/C (컨셉미팅/발주/입고/셋업)',
            '3D Scanning M/C + EOL (컨셉미팅/발주/입고/셋업)',
            'Barrel M/C (발주/입고/셋업)',
            'Trimming press M/C (발주/입고/셋업)'
          ] 
        },
        { 
          label: type === ProjectType.INCREMENTAL_MOLD ? 'Mold development plan (증작 금형 개발 계획)' : 'Mold development plan (신규 금형 개발 계획)', 
          items: [
            'Diecasting mold (설계/발주/입고)',
            'Trimming mold (설계/발주/입고)'
          ] 
        },
        { 
          label: 'Jig development plan (지그 개발 계획)', 
          items: [
            'Processing Jig_Proto (발주/입고)',
            'Processing Jig_Mass production (발주/입고/셋업)',
            'Flatness Inspection Jig (컨셉/발주/입고/셋업)'
          ] 
        },
        { label: 'Sub-contracted part development', sub: '외주품 개발 계획/현황' },
        { label: 'Make or buy decision', sub: '생산/구매 결정' },
        { label: 'PSW release', sub: '부품승인' },
        { label: 'Logistic concept', sub: '물류계획서' },
        { label: 'Packaging specification', sub: '포장사양서 (VN/KR/VTK)' },
        { label: 'Measurement system analysis (MSA)', sub: '측정시스템 분석 (VN/KR)' },
        { label: 'Milestone and Gate #3 Review', sub: '' },
      ];
      case 4: return [
        { 
          label: 'Trial 0 ~ 4 (시사출 보고서 및 치수 측정)', 
          items: [
            'Trial 0 (보고서/치수측정/금형수정계획)',
            'Trial 1 (보고서/치수측정/금형수정계획)',
            'Trial 2 (보고서/치수측정/금형수정계획)',
            'Trial 3 (보고서/치수측정/금형수정계획)',
            'Trial 4 (보고서/치수측정/금형수정계획)'
          ] 
        },
        { label: 'Work instruction', sub: '작업표준서 (VN/KR)' },
        { label: 'Inspection Agreement/Standards', sub: '검사협정/검사기준 (VN/KR)' },
        { label: 'Operator training', sub: '작업자 교육 (VN/KR)' },
        { label: 'Reliability Test Report', sub: '신뢰성 시험 (Material/Breaking/Adhesion 등)' },
        { label: 'Milestone and Gate #4 Review', sub: '' },
      ];
      case 5: return [
        { label: 'Safe launch concept', sub: '초기 유동 관리 (VN/KR)' },
        { label: 'Run at Rate', sub: 'VN/KR' },
        { 
          label: 'PPAP (양산부품승인절차)', 
          items: [
            'Process Capability Analysis (공정능력)',
            'Serial Control plan (관리계획서)',
            'PPAP Check sheet',
            'PPAP submission (제출)',
            'PSW release (고객 승인)'
          ] 
        },
        { label: 'Project transfer meeting', sub: '양산이관 / 평가' },
        { label: 'SOP', sub: 'Start of Production' },
        { label: 'Milestone and Gate #5 Review', sub: '' },
        { label: 'SLC REPORT', sub: '초기 유동 관리' },
      ];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{t.phaseManagement.selectProject}</label>
          <select 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 font-bold"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="" disabled>{t.phaseManagement.selectProject}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>[{p.type}] {p.partName} ({p.carModel}) - {p.customerName}</option>
            ))}
          </select>
        </div>
        {selectedProject && (
          <div className="flex gap-4 border-l border-slate-100 pl-6">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">프로젝트 형태</p>
              <p className={`text-sm font-black px-2 py-0.5 rounded-full mt-1 ${
                selectedProject.type === ProjectType.NEW_DEVELOPMENT ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {selectedProject.type}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">고객사</p>
              <p className="text-sm font-bold text-slate-800">{selectedProject.customerName}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">SOP 기한</p>
              <p className="text-sm font-bold text-slate-700">{selectedProject.sopDate}</p>
            </div>
          </div>
        )}
      </div>

      {!selectedProjectId ? (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
          <p className="font-medium">{t.phaseManagement.noProjectSelected}</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          {/* Phase Sidebar */}
          <div className="col-span-3 space-y-2">
            {projectGates.map((gate) => {
              const isLocked = gate.status === GateStatus.LOCKED;
              const isApproved = gate.status === GateStatus.APPROVED;
              const isActive = activePhase === gate.phaseNumber;

              return (
                <button
                  key={gate.id}
                  disabled={isLocked}
                  onClick={() => setActivePhase(gate.phaseNumber)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 text-left ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : isLocked 
                        ? 'bg-slate-50 border-transparent text-slate-300 cursor-not-allowed' 
                        : 'bg-white border-white text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-500' : isApproved ? 'bg-green-100 text-green-600' : 'bg-slate-100'}`}>
                      {getPhaseIcon(gate.phaseNumber)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-60">PHASE {gate.phaseNumber}</p>
                      <p className="text-[11px] font-bold leading-tight uppercase">
                        {gate.phaseNumber === 1 && 'Planning'}
                        {gate.phaseNumber === 2 && 'Product Design'}
                        {gate.phaseNumber === 3 && 'Process Design'}
                        {gate.phaseNumber === 4 && 'Validation'}
                        {gate.phaseNumber === 5 && 'Verification'}
                      </p>
                    </div>
                  </div>
                  {isLocked ? <Lock size={14} /> : isApproved ? <Check size={14} className="text-green-500" /> : <ChevronRight size={14} />}
                </button>
              );
            })}
          </div>

          {/* Task List Content */}
          <div className="col-span-9">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-50">
                <div className="flex items-start gap-4">
                  <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">
                    {activePhase}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      {getPhaseName(activePhase)}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        projectGates.find(g => g.phaseNumber === activePhase)?.status === GateStatus.APPROVED 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {projectGates.find(g => g.phaseNumber === activePhase)?.status}
                      </span>
                      {projectGates.find(g => g.phaseNumber === activePhase)?.approvalDate && (
                        <span className="text-xs text-slate-400 font-medium">승인완료일: {projectGates.find(g => g.phaseNumber === activePhase)?.approvalDate}</span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedProject.type === ProjectType.INCREMENTAL_MOLD && (
                  <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-100">
                    <Info size={16} />
                    <span className="text-xs font-bold">증작 금형: 기존 데이터 기반 신속 대응 필요</span>
                  </div>
                )}
              </div>

              {/* Checklist rendering based on image items */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {getPhaseTasks(activePhase, selectedProject.type).map((task, idx) => (
                    <div key={idx} className="group">
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 group-hover:shadow-sm transition-all">
                        <div className="mt-1">
                          <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-slate-800">{task.label}</p>
                            {task.sub && <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-tighter">{task.sub}</span>}
                          </div>
                          
                          {/* Nested Items for complex plans */}
                          {task.items && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {task.items.map((subItem, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></div>
                                  <span className="text-[11px] font-medium text-slate-600">{subItem}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industry specific results for Phase 2/3 persistence */}
              {activePhase === 2 && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg"><FlaskConical className="text-indigo-600 w-4 h-4" /></div>
                    <span className="text-sm font-bold text-indigo-900">유동해석 시뮬레이션 결과 승인 (Magma/AnyCasting)</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={projectGates.find(g => g.phaseNumber === 2)?.flowAnalysisResult || false}
                    onChange={(e) => {
                      const gate = projectGates.find(g => g.phaseNumber === 2);
                      if (gate) onUpdateGate({...gate, flowAnalysisResult: e.target.checked});
                    }}
                    className="w-5 h-5 rounded text-indigo-600" 
                  />
                </div>
              )}

              {/* Gate Sign-off Footer */}
              <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decision Required</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium italic">이 단계의 모든 체크리스트를 완료해야 Gate 승인이 가능합니다.</p>
                </div>
                <button
                  disabled={projectGates.find(g => g.phaseNumber === activePhase)?.status === GateStatus.APPROVED}
                  onClick={() => handleApprove(activePhase)}
                  className={`px-10 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-3 ${
                    projectGates.find(g => g.phaseNumber === activePhase)?.status === GateStatus.APPROVED
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 active:scale-95'
                  }`}
                >
                  {projectGates.find(g => g.phaseNumber === activePhase)?.status === GateStatus.APPROVED ? (
                    <>
                      <CheckCircle2 size={20} /> MILESTONE APPROVED
                    </>
                  ) : (
                    <>
                      <Unlock size={20} /> APPROVE GATE #{activePhase}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseManagement;
