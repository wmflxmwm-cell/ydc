import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save } from 'lucide-react';
import { settingsService, PostProcessing } from '../src/api/services/settingsService';
import { getTranslations } from '../src/utils/translations';

interface ScheduleItem {
  postProcessingId: string;
  plannedDate: string;
  completedDate: string;
}

interface SampleScheduleItem {
  id: string;
  partName: string;
  partNumber: string;
  quantity: number;
  requestDate: string;
  shippingByAir: boolean; // 해운(true) / 해상(false)
  productCostFree: boolean; // 무상(true) / 유상(false)
  schedules: ScheduleItem[];
}

const SampleSchedule: React.FC = () => {
  const t = getTranslations();
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [items, setItems] = useState<SampleScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 등록 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    partName: string;
    partNumber: string;
    quantity: number;
    requestDate: string;
    shippingByAir: boolean;
    productCostFree: boolean;
    schedules: ScheduleItem[];
  }>({
    partName: '',
    partNumber: '',
    quantity: 0,
    requestDate: '',
    shippingByAir: false,
    productCostFree: false,
    schedules: []
  });

  useEffect(() => {
    fetchPostProcessings();
  }, []);

  const fetchPostProcessings = async () => {
    try {
      const data = await settingsService.getPostProcessings();
      setPostProcessings(data);
    } catch (error) {
      console.error('Failed to fetch post processings:', error);
      alert('후공정 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleAddSchedule = () => {
    setFormData(prev => ({
      ...prev,
      schedules: [...prev.schedules, { postProcessingId: '', plannedDate: '', completedDate: '' }]
    }));
  };

  const handleRemoveSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }));
  };

  const handleScheduleChange = (index: number, field: keyof ScheduleItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => 
        i === index ? { ...schedule, [field]: value } : schedule
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partName.trim() || !formData.partNumber.trim() || formData.quantity <= 0 || !formData.requestDate) {
      alert('품목, 품번, 수량, 납기 요청일을 모두 입력하세요.');
      return;
    }

    if (formData.schedules.length === 0) {
      alert('최소 하나의 후공정 일정을 추가하세요.');
      return;
    }

    // 모든 일정에 후공정이 선택되었는지 확인
    const hasEmptyPostProcessing = formData.schedules.some(s => !s.postProcessingId);
    if (hasEmptyPostProcessing) {
      alert('모든 후공정을 선택하세요.');
      return;
    }

    const newItem: SampleScheduleItem = {
      id: `sample-${Date.now()}`,
      ...formData,
      schedules: formData.schedules.map(s => ({ ...s }))
    };

    setItems(prev => [...prev, newItem]);
    
    // 폼 초기화
    setFormData({
      partName: '',
      partNumber: '',
      quantity: 0,
      requestDate: '',
      shippingByAir: false,
      productCostFree: false,
      schedules: []
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const getPostProcessingName = (id: string) => {
    return postProcessings.find(p => p.id === id)?.name || '';
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Calendar className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Sample 일정</h2>
              <p className="text-sm text-slate-500 mt-1">샘플 제작 및 검사 일정 관리</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
            >
              <Plus size={18} />
              등록
            </button>
          )}
        </div>

        {/* 등록 폼 */}
        {showForm && (
          <div className="mb-6 p-6 bg-slate-50 rounded-2xl border-2 border-indigo-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">샘플 일정 등록</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">품목</label>
                  <input
                    type="text"
                    value={formData.partName}
                    onChange={(e) => setFormData(prev => ({ ...prev, partName: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">품번</label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">납기 요청일</label>
                  <input
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* 운송 방법 및 제품비 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shippingByAir}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingByAir: e.target.checked }))}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">해운</span>
                  </label>
                  <span className="text-sm text-slate-500">(체크 해제 시 해상)</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.productCostFree}
                      onChange={(e) => setFormData(prev => ({ ...prev, productCostFree: e.target.checked }))}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">제품비 무상</span>
                  </label>
                  <span className="text-sm text-slate-500">(체크 해제 시 유상)</span>
                </div>
              </div>

              {/* 후공정 일정 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-slate-700">후공정 일정</label>
                  <button
                    type="button"
                    onClick={handleAddSchedule}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-bold"
                  >
                    <Plus size={16} />
                    후공정 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.schedules.map((schedule, index) => (
                    <div key={index} className="flex gap-3 items-start p-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">후공정</label>
                          <select
                            value={schedule.postProcessingId}
                            onChange={(e) => handleScheduleChange(index, 'postProcessingId', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            required
                          >
                            <option value="">선택하세요</option>
                            {postProcessings.map(pp => (
                              <option key={pp.id} value={pp.id}>{pp.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">계획일정</label>
                          <input
                            type="date"
                            value={schedule.plannedDate}
                            onChange={(e) => handleScheduleChange(index, 'plannedDate', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">완료일정</label>
                          <input
                            type="date"
                            value={schedule.completedDate}
                            onChange={(e) => handleScheduleChange(index, 'completedDate', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSchedule(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {formData.schedules.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">후공정 일정을 추가하세요.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      partName: '',
                      partNumber: '',
                      quantity: 0,
                      requestDate: '',
                      shippingByAir: false,
                      productCostFree: false,
                      schedules: []
                    });
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  <Save size={18} />
                  등록
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 목록 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold">품목</th>
                <th className="px-6 py-4 text-left text-sm font-bold">품번</th>
                <th className="px-6 py-4 text-center text-sm font-bold">수량</th>
                <th className="px-6 py-4 text-center text-sm font-bold">납기 요청일</th>
                <th className="px-6 py-4 text-center text-sm font-bold">운송 방법</th>
                <th className="px-6 py-4 text-center text-sm font-bold">제품비</th>
                <th className="px-6 py-4 text-left text-sm font-bold">후공정 일정</th>
                <th className="px-6 py-4 text-center text-sm font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-bold">등록된 샘플 일정이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.partName}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{item.partNumber}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-700">{item.quantity.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-700">{item.requestDate}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.shippingByAir 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.shippingByAir ? '해운' : '해상'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.productCostFree 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.productCostFree ? '무상' : '유상'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="space-y-2">
                        {item.schedules.map((schedule, idx) => (
                          <div key={idx} className="flex gap-4 text-xs">
                            <span className="font-bold text-slate-700 min-w-[100px]">{getPostProcessingName(schedule.postProcessingId)}</span>
                            <span className="text-slate-600">계획: {schedule.plannedDate || '-'}</span>
                            <span className="text-slate-600">완료: {schedule.completedDate || '-'}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SampleSchedule;
