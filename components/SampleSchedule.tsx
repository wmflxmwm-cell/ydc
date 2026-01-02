import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getTranslations } from '../src/utils/translations';

const SampleSchedule: React.FC = () => {
  const t = getTranslations();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <Calendar className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Sample 일정</h2>
            <p className="text-sm text-slate-500 mt-1">샘플 제작 및 검사 일정 관리</p>
          </div>
        </div>

        {/* 내용 영역 */}
        <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200">
          <div className="flex flex-col items-center justify-center text-center">
            <Clock className="text-slate-400 mb-4" size={48} />
            <p className="text-lg font-bold text-slate-600 mb-2">Sample 일정 기능 준비 중</p>
            <p className="text-sm text-slate-500">곧 추가될 예정입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleSchedule;

