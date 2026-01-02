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
  const [parts, setParts] = useState<Part[]>([]);
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
      setFormData(prev => ({
        ...prev,
        partId: selectedPart.id,
        partName: selectedPart.partName,
        partNumber: selectedPart.partNumber
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        partId: '',
        partName: '',
        partNumber: ''
      }));
    }
  };

  const handleAddScheduleToItem = async (itemId: string, partNumber: string) => {
    // 품목 정보 찾기
    const part = parts.find(p => p.partNumber === partNumber);
    if (!part) {
      alert('품목 정보를 찾을 수 없습니다.');
      return;
    }

    // 해당 품목의 후공정 중 아직 추가되지 않은 후공정 찾기
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const existingPostProcessingIds = item.schedules.map(s => s.postProcessingId);
    const availablePostProcessings = part.postProcessings.filter(ppId => !existingPostProcessingIds.includes(ppId));

    if (availablePostProcessings.length === 0) {
      alert('추가할 수 있는 후공정이 없습니다.');
      return;
    }

    // 첫 번째 사용 가능한 후공정 추가
    const newSchedule: ScheduleItem = {
      postProcessingId: availablePostProcessings[0],
      plannedDate: '',
      completedDate: '',
      inputQuantity: 0,
      completedQuantity: 0,
      isCompleted: false
    };

    const updatedSchedules = [...item.schedules, newSchedule];

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
      console.error('Failed to add schedule:', error);
      alert('후공정 추가에 실패했습니다.');
    }
  };

  const handleRemoveScheduleFromItem = async (itemId: string, scheduleIndex: number) => {
    if (!confirm('이 후공정 일정을 삭제하시겠습니까?')) {
      return;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updatedSchedules = item.schedules.filter((_, i) => i !== scheduleIndex);

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
      console.error('Failed to remove schedule:', error);
      alert('후공정 삭제에 실패했습니다.');
    }
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

    if (confirm('이 후공정을 최종 완료 처리하시겠습니까?')) {
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

    // 품목 정보에서 후공정 목록 가져오기
    const selectedPart = parts.find(p => p.id === formData.partId);
    const autoSchedules: ScheduleItem[] = selectedPart 
      ? selectedPart.postProcessings.map(ppId => ({
          postProcessingId: ppId,
          plannedDate: '',
          completedDate: '',
          isCompleted: false
        }))
      : [];

    try {
      const newItem = await sampleScheduleService.create({
        partName: formData.partName,
        partNumber: formData.partNumber,
        quantity: formData.quantity,
        requestDate: formData.requestDate,
        shippingMethod: formData.shippingMethod,
        productCostType: formData.productCostType,
        schedules: autoSchedules
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
        schedules: [] // 폼에서는 사용하지 않지만 타입 유지를 위해 유지
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
                <th className="px-6 py-4 text-left text-sm font-bold">품목 정보</th>
                <th className="px-6 py-4 text-left text-sm font-bold">후공정 일정</th>
                <th className="px-6 py-4 text-center text-sm font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-bold">등록된 샘플 일정이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-4 text-sm w-fit whitespace-nowrap">
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-bold text-slate-500">품목: </span>
                          <span className="font-bold text-slate-900">{item.partName}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500">품번: </span>
                          <span className="text-slate-700 font-mono">{item.partNumber}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500">수량: </span>
                          <span className="text-slate-700">{item.quantity.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500">납기 요청일: </span>
                          <span className="text-slate-700">{item.requestDate.split('T')[0]}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500">운송 방법: </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.shippingMethod === '해운'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.shippingMethod}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500">제품비: </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.productCostType === '무상'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.productCostType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm w-1/2">
                      {/* 후공정 목록 - 많을 경우 3줄, 적을 경우 2줄 */}
                      {item.schedules.length > 0 && (
                        <div className={`grid gap-2 mb-3 ${item.schedules.length > 6 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {item.schedules.map((schedule, idx) => {
                            const isCompleted = schedule.isCompleted;
                            return (
                              <div
                                key={idx}
                                className={`px-2 py-1.5 rounded text-xs font-bold ${
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
                      )}

                      {/* 계획일정/완료일정 입력 영역 */}
                      {item.schedules.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.schedules.map((schedule, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 w-fit min-w-[200px]">
                              <div className="mb-2">
                                <span className="font-bold text-slate-900 text-xs">{getPostProcessingName(schedule.postProcessingId)}</span>
                                {schedule.isCompleted && (
                                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">완료</span>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">계획일정</label>
                                  <input
                                    type="date"
                                    value={schedule.plannedDate || ''}
                                    onChange={(e) => handleUpdateSchedule(item.id, idx, 'plannedDate', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                    disabled={schedule.isCompleted}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">완료일정</label>
                                  <input
                                    type="date"
                                    value={schedule.completedDate || ''}
                                    onChange={(e) => handleUpdateSchedule(item.id, idx, 'completedDate', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                    disabled={schedule.isCompleted}
                                  />
                                </div>
                              </div>
                              {!schedule.isCompleted && (
                                <button
                                  onClick={() => handleCompleteSchedule(item.id, idx)}
                                  disabled={!schedule.completedDate}
                                  className="w-full mt-2 flex items-center justify-center gap-2 px-2 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckCircle2 size={12} />
                                  완료 처리
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 text-center w-fit">
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
