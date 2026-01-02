import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { settingsService, PostProcessing } from '../src/api/services/settingsService';
import { partService, Part } from '../src/api/services/partService';
import { sampleScheduleService, SampleSchedule, ScheduleItem } from '../src/api/services/sampleScheduleService';
import { getTranslations, getLanguage } from '../src/utils/translations';
import { translatePostProcessingName } from '../src/utils/postProcessingTranslations';

interface Props {
  user: { id: string; name: string; role: string };
}

const SampleSchedule: React.FC<Props> = ({ user }) => {
  const t = getTranslations();
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [items, setItems] = useState<SampleSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 등록 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    partName: string;
    partNumber: string;
    quantity: number;
    requestDate: string;
    shippingMethod: string;
    productCostType: string;
    schedules: ScheduleItem[];
  }>({
    partName: '',
    partNumber: '',
    quantity: 0,
    requestDate: '',
    shippingMethod: '해운',
    productCostType: '유상',
    schedules: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [postProcessingsData, schedulesData, partsData] = await Promise.all([
        settingsService.getPostProcessings(),
        sampleScheduleService.getAll(),
        partService.getAll()
      ]);
      setPostProcessings(postProcessingsData);
      setItems(schedulesData);
      setParts(partsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartChange = (partId: string) => {
    const selectedPart = parts.find(p => p.id === partId);
    if (selectedPart) {
      // 품목 선택 시 품번 자동 입력
      // 후공정들을 자동으로 추가
      const autoSchedules: ScheduleItem[] = selectedPart.postProcessings.map(ppId => ({
        postProcessingId: ppId,
        plannedDate: '',
        completedDate: '',
        inputQuantity: 0,
        completedQuantity: 0,
        isCompleted: false
      }));

      setFormData(prev => ({
        ...prev,
        partId: selectedPart.id,
        partName: selectedPart.partName,
        partNumber: selectedPart.partNumber,
        schedules: autoSchedules
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        partId: '',
        partName: '',
        partNumber: '',
        schedules: []
      }));
    }
  };

  const handleAddSchedule = () => {
    setFormData(prev => ({
      ...prev,
      schedules: [...prev.schedules, { 
        postProcessingId: '', 
        plannedDate: '', 
        completedDate: '',
        inputQuantity: 0,
        completedQuantity: 0,
        isCompleted: false
      }]
    }));
  };

  const handleRemoveSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }));
  };

  const handleScheduleChange = (index: number, field: keyof ScheduleItem, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => 
        i === index ? { ...schedule, [field]: value } : schedule
      )
    }));
  };

  const handleUpdateSchedule = async (itemId: string, scheduleIndex: number, field: keyof ScheduleItem, value: string | number | boolean) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updatedSchedules = item.schedules.map((schedule, i) => 
      i === scheduleIndex ? { ...schedule, [field]: value } : schedule
    );

    try {
      await sampleScheduleService.update(itemId, {
        partName: item.partName,
        partNumber: item.partNumber,
        quantity: item.quantity,
        requestDate: item.requestDate,
        shippingMethod: item.shippingMethod,
        productCostType: item.productCostType,
        schedules: updatedSchedules
      });
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, schedules: updatedSchedules } : i
      ));
    } catch (error) {
      console.error('Failed to update schedule:', error);
      alert('일정 업데이트에 실패했습니다.');
    }
  };

  const handleCompleteSchedule = async (itemId: string, scheduleIndex: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const schedule = item.schedules[scheduleIndex];
    if (!schedule.completedDate) {
      alert('완료 일자를 먼저 입력하세요.');
      return;
    }

    if (confirm('이 후공정을 완료 처리하시겠습니까?')) {
      const updatedSchedules = item.schedules.map((s, i) => 
        i === scheduleIndex ? { ...s, isCompleted: true } : s
      );

      try {
        await sampleScheduleService.update(itemId, {
          partName: item.partName,
          partNumber: item.partNumber,
          quantity: item.quantity,
          requestDate: item.requestDate,
          shippingMethod: item.shippingMethod,
          productCostType: item.productCostType,
          schedules: updatedSchedules
        });
        setItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, schedules: updatedSchedules } : i
        ));
      } catch (error) {
        console.error('Failed to complete schedule:', error);
        alert('완료 처리에 실패했습니다.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partId || !formData.partName.trim() || !formData.partNumber.trim() || formData.quantity <= 0 || !formData.requestDate) {
      alert('품목, 수량, 납기 요청일을 모두 입력하세요.');
      return;
    }

    if (formData.schedules.length === 0) {
      alert('품목을 선택하면 후공정이 자동으로 추가됩니다.');
      return;
    }

    // 모든 일정에 후공정이 선택되었는지 확인
    const hasEmptyPostProcessing = formData.schedules.some(s => !s.postProcessingId);
    if (hasEmptyPostProcessing) {
      alert('모든 후공정을 선택하세요.');
      return;
    }

    try {
      const newItem = await sampleScheduleService.create({
        partName: formData.partName,
        partNumber: formData.partNumber,
        quantity: formData.quantity,
        requestDate: formData.requestDate,
        shippingMethod: formData.shippingMethod,
        productCostType: formData.productCostType,
        schedules: formData.schedules.map(s => ({ ...s }))
      });

      setItems(prev => [newItem, ...prev]);
      
      // 폼 초기화
      setFormData({
        partId: '',
        partName: '',
        partNumber: '',
        quantity: 0,
        requestDate: '',
        shippingMethod: '해운',
        productCostType: '유상',
        schedules: []
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create sample schedule:', error);
      alert('샘플 일정 등록에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await sampleScheduleService.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete sample schedule:', error);
      alert('샘플 일정 삭제에 실패했습니다.');
    }
  };

  const getPostProcessingName = (id: string) => {
    const postProcessing = postProcessings.find(p => p.id === id);
    if (!postProcessing) return '';
    const currentLanguage = getLanguage();
    return translatePostProcessingName(postProcessing.name, currentLanguage);
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
                  <select
                    value={formData.partId}
                    onChange={(e) => handlePartChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">품목을 선택하세요</option>
                    {parts.map(part => (
                      <option key={part.id} value={part.id}>{part.partName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">품번</label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
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
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">운송 방법</label>
                  <select
                    value={formData.shippingMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, shippingMethod: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="해운">해운</option>
                    <option value="항공">항공</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">제품비</label>
                  <select
                    value={formData.productCostType}
                    onChange={(e) => setFormData(prev => ({ ...prev, productCostType: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="무상">무상</option>
                    <option value="유상">유상</option>
                  </select>
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
                            {postProcessings.map(pp => {
                              const currentLanguage = getLanguage();
                              const translatedName = translatePostProcessingName(pp.name, currentLanguage);
                              return (
                                <option key={pp.id} value={pp.id}>{translatedName}</option>
                              );
                            })}
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
                      partId: '',
                      partName: '',
                      partNumber: '',
                      quantity: 0,
                      requestDate: '',
                      shippingMethod: '해운',
                      productCostType: '유상',
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
                        item.shippingMethod === '해운'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.shippingMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.productCostType === '무상'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.productCostType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {/* 후공정 목록 가로 나열 */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.schedules.map((schedule, idx) => {
                          const isCompleted = schedule.isCompleted;
                          return (
                            <div
                              key={idx}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                                isCompleted
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {getPostProcessingName(schedule.postProcessingId)}
                            </div>
                          );
                        })}
                      </div>

                      {/* 계획일정/완료일정 입력 영역 */}
                      <div className="space-y-2">
                        {item.schedules.map((schedule, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-900 text-sm">{getPostProcessingName(schedule.postProcessingId)}</span>
                              {schedule.isCompleted && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">완료</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">투입 수량</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={schedule.inputQuantity || ''}
                                  onChange={(e) => handleUpdateSchedule(item.id, idx, 'inputQuantity', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                  disabled={schedule.isCompleted}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">완료 수량</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={schedule.completedQuantity || ''}
                                  onChange={(e) => handleUpdateSchedule(item.id, idx, 'completedQuantity', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                  disabled={schedule.isCompleted}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">계획일정</label>
                                <input
                                  type="date"
                                  value={schedule.plannedDate || ''}
                                  onChange={(e) => handleUpdateSchedule(item.id, idx, 'plannedDate', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                  disabled={schedule.isCompleted}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">완료일정</label>
                                <input
                                  type="date"
                                  value={schedule.completedDate || ''}
                                  onChange={(e) => handleUpdateSchedule(item.id, idx, 'completedDate', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                  disabled={schedule.isCompleted}
                                />
                              </div>
                            </div>
                            {!schedule.isCompleted && (
                              <button
                                onClick={() => handleCompleteSchedule(item.id, idx)}
                                disabled={!schedule.completedDate}
                                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle2 size={14} />
                                완료 처리
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.role === 'MANAGER' && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
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
