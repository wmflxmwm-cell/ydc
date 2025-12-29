
import React, { useState } from 'react';
import { Issue, Project, IssueType } from '../types';
import { Search, Plus, Filter, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

interface Props {
  issues: Issue[];
  projects: Project[];
  onToggleResolve: (id: string) => void;
  onAddIssue: (issue: Issue) => void;
}

const IssueTracker: React.FC<Props> = ({ issues, projects, onToggleResolve, onAddIssue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState<Partial<Issue>>({
    projectId: '',
    phase: 1,
    issueType: IssueType.OTHERS,
    description: '',
    actionPlan: '',
    isResolved: false
  });

  const filteredIssues = issues.filter(issue => {
    const project = projects.find(p => p.id === issue.projectId);
    return (
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project?.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project?.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    onAddIssue({
      ...newIssue as Issue,
      id: `issue-${Date.now()}`
    });
    setShowAddForm(false);
    setNewIssue({
      projectId: '',
      phase: 1,
      issueType: IssueType.OTHERS,
      description: '',
      actionPlan: '',
      isResolved: false
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            placeholder="부품명 또는 이슈 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <Filter size={16} /> 필터링
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            <Plus size={16} /> 신규 이슈 등록
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">품질 부적합 이슈 로그 작성</h3>
              <button onClick={() => setShowAddForm(false)} className="opacity-60 hover:opacity-100">✕</button>
            </div>
            <form onSubmit={handleAddIssue} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">대상 프로젝트</label>
                  <select 
                    required
                    className="w-full border p-3 rounded-xl text-sm"
                    value={newIssue.projectId}
                    onChange={(e) => setNewIssue({...newIssue, projectId: e.target.value})}
                  >
                    <option value="" disabled>프로젝트 선택</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.partName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">발생 단계</label>
                  <select 
                    className="w-full border p-3 rounded-xl text-sm"
                    value={newIssue.phase}
                    onChange={(e) => setNewIssue({...newIssue, phase: parseInt(e.target.value)})}
                  >
                    {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{p}단계</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">결함 유형</label>
                  <select 
                    className="w-full border p-3 rounded-xl text-sm"
                    value={newIssue.issueType}
                    onChange={(e) => setNewIssue({...newIssue, issueType: e.target.value as IssueType})}
                  >
                    {Object.values(IssueType).map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">상세 내용</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full border p-3 rounded-xl text-sm"
                    placeholder="결함 내용과 발생 원인을 상세히 기재하세요..."
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">시정 조치 계획</label>
                  <textarea 
                    required
                    rows={2}
                    className="w-full border p-3 rounded-xl text-sm"
                    placeholder="재발 방지를 위한 조치 계획을 기재하세요..."
                    value={newIssue.actionPlan}
                    onChange={(e) => setNewIssue({...newIssue, actionPlan: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg">이슈 등록</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 border rounded-xl font-bold">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">상태</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">부품명 및 단계</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">이슈 상세</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">조치 계획</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredIssues.map((issue) => {
              const project = projects.find(p => p.id === issue.projectId);
              return (
                <tr key={issue.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      {issue.isResolved ? (
                        <CheckCircle2 className="text-green-500 w-5 h-5" />
                      ) : (
                        <AlertCircle className="text-red-500 w-5 h-5 animate-pulse" />
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-wider ${issue.isResolved ? 'text-green-600' : 'text-red-600'}`}>
                        {issue.isResolved ? '조치완료' : '진행중'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-sm font-bold text-slate-800">{project?.partName || '알 수 없는 부품'}</p>
                    <p className="text-[10px] text-indigo-500 font-black uppercase">{issue.phase}단계</p>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">{issue.issueType}</p>
                    <p className="text-sm text-slate-600 line-clamp-2 max-w-xs">{issue.description}</p>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-start gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                      <MessageSquare className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                      <p className="text-xs text-slate-600 line-clamp-2 italic">{issue.actionPlan}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <button 
                      onClick={() => onToggleResolve(issue.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        issue.isResolved 
                          ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95'
                      }`}
                    >
                      {issue.isResolved ? '조치 취소' : '조치 완료 처리'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredIssues.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">검색 결과에 일치하는 품질 이슈가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueTracker;
