
import React, { useState } from 'react';
import { Project, ProjectStatus, ProjectType } from '../types';
import { Save, RefreshCw, ClipboardCheck } from 'lucide-react';

interface Props {
  onAddProject: (project: Project) => void;
  onNavigateToManagement: () => void;
}

const ProjectRegistration: React.FC<Props> = ({ onAddProject, onNavigateToManagement }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    customerName: '',
    carModel: '',
    partName: '',
    partNumber: '',
    moldCavity: 2,
    sopDate: '',
    material: 'ALDC12',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.NEW_DEVELOPMENT
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      const newProject: Project = {
        ...formData as Project,
        id: `proj-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      onAddProject(newProject);
      setIsSubmitting(false);
      alert('신규 프로젝트가 성공적으로 등록되었습니다.');
      onNavigateToManagement();
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight">프로젝트 기술 사양서 입력</h2>
          </div>
          <p className="text-xs text-slate-400 font-mono">양식: APQP-F01-KO</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">프로젝트 형태</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: ProjectType.NEW_DEVELOPMENT})}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.type === ProjectType.NEW_DEVELOPMENT 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  신규 개발 프로젝트
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: ProjectType.INCREMENTAL_MOLD})}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.type === ProjectType.INCREMENTAL_MOLD 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  증작 금형 프로젝트
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">고객사명</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) 현대자동차, 기아, 테슬라 등"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">차종</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) EV9, 아이오닉 6..."
                value={formData.carModel}
                onChange={(e) => setFormData({...formData, carModel: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">부품명 (Die-casting)</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) 실린더 블록, 하우징 케이스..."
                value={formData.partName}
                onChange={(e) => setFormData({...formData, partName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">부품 번호 (P/N)</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) 24001-XXXX-00"
                value={formData.partNumber}
                onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">금형 캐비티 수 (Cavity)</label>
              <input 
                required
                type="number"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                value={formData.moldCavity}
                onChange={(e) => setFormData({...formData, moldCavity: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">재질 선정</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                value={formData.material}
                onChange={(e) => setFormData({...formData, material: e.target.value})}
              >
                <option value="ALDC12">ALDC 12 (일반 주조용)</option>
                <option value="ALDC10">ALDC 10 (내식성 우수)</option>
                <option value="ALSi10MnMg">High-Vac용 특수 합금</option>
                <option value="MG-AZ91D">마그네슘 합금 AZ91D</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">SOP (양산 개시일)</label>
              <input 
                required
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                value={formData.sopDate}
                onChange={(e) => setFormData({...formData, sopDate: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
              {isSubmitting ? '저장 중...' : '프로젝트 등록 완료'}
            </button>
            <button 
              type="reset" 
              className="px-8 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              onClick={() => setFormData({})}
            >
              내용 초기화
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectRegistration;
