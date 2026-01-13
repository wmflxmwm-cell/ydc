import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save, CheckCircle2, Edit2 } from 'lucide-react';
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
  
  // EXPLICIT STATE DECLARATIONS - All state variables listed at top
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [items, setItems] = useState<SampleSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 등록 폼 상태
  const [showForm, setShowForm] = useState(false);
  
  // CRITICAL FIX: Explicitly declare editingItem state
  // This prevents ReferenceError: editingItem is not defined
  const [editingItem, setEditingItem] = useState<SampleSchedule | null>(null);
  
  const [formData, setFormData] = useState<{
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    requestDate: string;
    shippingMethod: string;
    productCostType: string;
    moldSequence: string;
    lot: string;
    remarks: string;
    schedules: ScheduleItem[];
  }>({
    partId: '',
    partName: '',
    partNumber: '',
    quantity: 0,
    requestDate: '',
    shippingMethod: '해운',
    productCostType: '유상',
    moldSequence: '',
    lot: '미적용',
    remarks: '',
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

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against invalid input
  const handleAddScheduleToItem = async (itemId: string, partNumber: string) => {
    console.log('[handleAddScheduleToItem] called', { itemId, partNumber });
    
    // Guard: Validate parameters
    if (!itemId || !partNumber) {
      console.warn('[handleAddScheduleToItem] Missing required parameters', { itemId, partNumber });
      alert('필수 파라미터가 없습니다.');
      return;
    }
    
    // 품목 정보 찾기
    const part = parts.find(p => p.partNumber === partNumber);
    if (!part) {
      console.warn('[handleAddScheduleToItem] Part not found', { partNumber });
      alert('품목 정보를 찾을 수 없습니다.');
      return;
    }

    // 해당 품목의 후공정 중 아직 추가되지 않은 후공정 찾기
    const item = items.find(i => i.id === itemId);
    if (!item) {
      console.warn('[handleAddScheduleToItem] Item not found', { itemId });
      alert('항목을 찾을 수 없습니다.');
      return;
    }

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
      isCompleted: false,
      isPlanCompleted: false
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
        moldSequence: item.moldSequence || '',
        lot: item.lot || '미적용',
        remarks: item.remarks || '',
        isPlanApproved: item.isPlanApproved || false,
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
        moldSequence: item.moldSequence || '',
        lot: item.lot || '미적용',
        remarks: item.remarks || '',
        isPlanApproved: item.isPlanApproved || false,
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

    // 계획일정 validation: 이전 카드의 계획일정보다 빠른 날짜는 선택 불가
    if (field === 'plannedDate' && typeof value === 'string' && value) {
      if (scheduleIndex > 0) {
        const prevSchedule = item.schedules[scheduleIndex - 1];
        if (prevSchedule.plannedDate && value < prevSchedule.plannedDate) {
          alert('이전 일정보다 빠른 날짜를 선택할 수 없습니다.');
          return;
        }
      }
    }

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
        moldSequence: item.moldSequence || '',
        lot: item.lot || '미적용',
        remarks: item.remarks || '',
        isPlanApproved: item.isPlanApproved || false,
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

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against invalid input
  const handleCompleteSchedule = async (itemId: string, scheduleIndex: number) => {
    console.log('[handleCompleteSchedule] called', { itemId, scheduleIndex });
    
    // Guard: Validate parameters
    if (!itemId || scheduleIndex === undefined || scheduleIndex < 0) {
      console.warn('[handleCompleteSchedule] Invalid parameters', { itemId, scheduleIndex });
      alert('필수 파라미터가 올바르지 않습니다.');
      return;
    }
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
      console.warn('[handleCompleteSchedule] Item not found', { itemId });
      alert('항목을 찾을 수 없습니다.');
      return;
    }
    
    // Guard: Validate scheduleIndex is within bounds
    if (scheduleIndex >= item.schedules.length) {
      console.warn('[handleCompleteSchedule] scheduleIndex out of bounds', { scheduleIndex, schedulesLength: item.schedules.length });
      alert('일정 인덱스가 올바르지 않습니다.');
      return;
    }

    const schedule = item.schedules[scheduleIndex];
    if (!schedule) {
      console.warn('[handleCompleteSchedule] Schedule not found', { scheduleIndex });
      alert('일정을 찾을 수 없습니다.');
      return;
    }
    
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
          moldSequence: item.moldSequence || '',
          lot: item.lot || '',
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

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against undefined state
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('[handleSubmit] called');
    e.preventDefault();
    
    // Guard: Validate formData exists
    if (!formData) {
      console.warn('[handleSubmit] formData is missing');
      alert('폼 데이터가 없습니다.');
      return;
    }
    
    if (!formData.partId || !formData.partName.trim() || !formData.partNumber.trim() || formData.quantity <= 0 || !formData.requestDate) {
      alert('품목, 수량, 납기 요청일을 모두 입력하세요.');
      return;
    }

    // 수정 모드인 경우 - Guard: Check editingItem exists
    if (editingItem) {
      console.log('[handleSubmit] Editing mode, calling handleUpdateItem');
      await handleUpdateItem(e);
      return;
    }
    
    console.log('[handleSubmit] Create mode');

    // 품목 정보에서 후공정 목록 가져오기
    const selectedPart = parts.find(p => p.id === formData.partId);
    const autoSchedules: ScheduleItem[] = selectedPart 
      ? [
          // 금형 일정 카드를 맨 앞에 추가
          {
            postProcessingId: 'MOLD',
            plannedDate: '',
            completedDate: '',
            isCompleted: false,
            isPlanCompleted: false
          },
          ...selectedPart.postProcessings.map(ppId => ({
            postProcessingId: ppId,
            plannedDate: '',
            completedDate: '',
            isCompleted: false,
            isPlanCompleted: false
          })),
          // 로딩, ETD, ETA 항목 추가
          {
            postProcessingId: 'LOADING',
            plannedDate: '',
            completedDate: '',
            isCompleted: false,
            isPlanCompleted: false
          },
          {
            postProcessingId: 'ETD',
            plannedDate: '',
            completedDate: '',
            isCompleted: false,
            isPlanCompleted: false
          },
          {
            postProcessingId: 'ETA',
            plannedDate: '',
            completedDate: '',
            isCompleted: false,
            isPlanCompleted: false
          }
        ]
      : [];

    try {
      const newItem = await sampleScheduleService.create({
        partName: formData.partName,
        partNumber: formData.partNumber,
        quantity: formData.quantity,
        requestDate: formData.requestDate,
        shippingMethod: formData.shippingMethod,
        productCostType: formData.productCostType,
        moldSequence: formData.moldSequence,
        lot: formData.lot,
        remarks: formData.remarks,
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
        moldSequence: '',
        lot: '미적용',
        remarks: '',
        schedules: [] // 폼에서는 사용하지 않지만 타입 유지를 위해 유지
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create sample schedule:', error);
      alert('샘플 일정 등록에 실패했습니다.');
    }
  };

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against invalid input
  const handleDelete = async (id: string) => {
    console.log('[handleDelete] called', { id });
    
    // Guard: Validate id exists
    if (!id) {
      console.warn('[handleDelete] id is missing');
      alert('삭제할 항목 ID가 없습니다.');
      return;
    }
    
    if (!confirm('이 항목을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await sampleScheduleService.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
      console.log('[handleDelete] Successfully deleted item:', id);
    } catch (error) {
      console.error('[handleDelete] Failed to delete sample schedule:', error);
      alert('샘플 일정 삭제에 실패했습니다.');
    }
  };

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against invalid input
  const handleEditItem = (item: SampleSchedule) => {
    console.log('[handleEditItem] called', { itemId: item?.id });
    
    // Guard: Validate item exists
    if (!item) {
      console.warn('[handleEditItem] item is missing');
      alert('편집할 항목이 없습니다.');
      return;
    }
    
    // Guard: Validate item has required fields
    if (!item.id || !item.partNumber) {
      console.warn('[handleEditItem] item missing required fields', item);
      alert('항목 정보가 올바르지 않습니다.');
      return;
    }
    
    setEditingItem(item);
    setFormData({
      partId: parts.find(p => p.partNumber === item.partNumber)?.id || '',
      partName: item.partName,
      partNumber: item.partNumber,
      quantity: item.quantity,
      requestDate: item.requestDate.split('T')[0],
      shippingMethod: item.shippingMethod,
      productCostType: item.productCostType,
      moldSequence: item.moldSequence || '',
      lot: item.lot || '미적용',
      remarks: item.remarks || '',
      schedules: []
    });
    setShowForm(true);
    console.log('[handleEditItem] Form loaded for editing');
  };

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against undefined state
  const handleUpdateItem = async (e: React.FormEvent) => {
    console.log('[handleUpdateItem] called');
    e.preventDefault();
    
    // Guard: Validate editingItem exists
    if (!editingItem) {
      console.warn('[handleUpdateItem] editingItem is missing');
      alert('편집할 항목이 선택되지 않았습니다.');
      return;
    }
    
    // Guard: Validate editingItem has id
    if (!editingItem.id) {
      console.warn('[handleUpdateItem] editingItem.id is missing');
      alert('항목 ID가 없습니다.');
      return;
    }
    
    // Guard: Validate formData exists
    if (!formData) {
      console.warn('[handleUpdateItem] formData is missing');
      alert('폼 데이터가 없습니다.');
      return;
    }

    if (!formData.partId || !formData.partName.trim() || !formData.partNumber.trim() || formData.quantity <= 0 || !formData.requestDate) {
      alert('품목, 수량, 납기 요청일을 모두 입력하세요.');
      return;
    }

    try {
      await sampleScheduleService.update(editingItem.id, {
        partName: formData.partName,
        partNumber: formData.partNumber,
        quantity: formData.quantity,
        requestDate: formData.requestDate,
        shippingMethod: formData.shippingMethod,
        productCostType: formData.productCostType,
        moldSequence: formData.moldSequence || '',
        lot: formData.lot || '미적용',
        remarks: formData.remarks || '',
        isPlanApproved: editingItem.isPlanApproved || false,
        schedules: editingItem.schedules
      });
      
      console.log('[handleUpdateItem] Successfully updated item:', editingItem.id);
      await fetchData();
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        partId: '',
        partName: '',
        partNumber: '',
        quantity: 0,
        requestDate: '',
        shippingMethod: '해운',
        productCostType: '유상',
        moldSequence: '',
        lot: '미적용',
        remarks: '',
        schedules: []
      });
      alert('항목이 수정되었습니다.');
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('수정에 실패했습니다.');
    }
  };

  const getPostProcessingName = (id: string) => {
    // 특수 항목 처리
    if (id === 'MOLD') return '금형';
    if (id === 'LOADING') return '로딩';
    if (id === 'ETD') return 'ETD';
    if (id === 'ETA') return 'ETA';
    
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
                   <div className="mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-indigo-200">
                     <h3 className="text-lg font-bold text-slate-900 mb-4">샘플 일정 등록</h3>
                     <form onSubmit={handleSubmit} className="space-y-3">
                       <div className="grid grid-cols-8 gap-2">
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">품목</label>
                           <select
                             value={formData.partId}
                             onChange={(e) => handlePartChange(e.target.value)}
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             required
                           >
                             <option value="">선택</option>
                             {parts.map(part => (
                               <option key={part.id} value={part.id}>{part.partName}</option>
                             ))}
                           </select>
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">품번</label>
                           <input
                             type="text"
                             value={formData.partNumber}
                             readOnly
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">수량</label>
                           <input
                             type="number"
                             min="1"
                             value={formData.quantity || ''}
                             onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             required
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">납기 요청일</label>
                           <input
                             type="date"
                             value={formData.requestDate}
                             onChange={(e) => setFormData(prev => ({ ...prev, requestDate: e.target.value }))}
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             required
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">운송 방법</label>
                           <select
                             value={formData.shippingMethod}
                             onChange={(e) => setFormData(prev => ({ ...prev, shippingMethod: e.target.value }))}
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             required
                           >
                             <option value="해운">해운</option>
                             <option value="항공">항공</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">제품비</label>
                           <select
                             value={formData.productCostType}
                             onChange={(e) => setFormData(prev => ({ ...prev, productCostType: e.target.value }))}
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             required
                           >
                             <option value="무상">무상</option>
                             <option value="유상">유상</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 mb-1">금형차수</label>
                           <input
                             type="text"
                             value={formData.moldSequence}
                             onChange={(e) => setFormData(prev => ({ ...prev, moldSequence: e.target.value }))}
                             className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                         </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">로트</label>
                          <select
                            value={formData.lot}
                            onChange={(e) => setFormData(prev => ({ ...prev, lot: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="적용">적용</option>
                            <option value="미적용">미적용</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">비고 특이사항</label>
                        <textarea
                          value={formData.remarks}
                          onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          placeholder="비고 및 특이사항을 입력하세요"
                        />
                      </div>

                       <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
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
                               moldSequence: '',
                               lot: '미적용',
                               remarks: '',
                               schedules: []
                             });
                           }}
                           className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                         >
                           취소
                         </button>
                         <button
                           type="submit"
                           className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                         >
                           <Save size={16} />
                           등록
                         </button>
                       </div>
            </form>
          </div>
        )}

        {/* 목록 */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-2 py-4 text-left text-sm font-bold" style={{ width: '10%' }}>품목 정보</th>
                <th className="px-6 py-4 text-left text-sm font-bold">후공정 일정</th>
                <th className="px-2 py-4 text-center text-sm font-bold" style={{ width: '80px' }}>관리</th>
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
                    <td className="px-2 py-4 text-sm" style={{ width: '10%' }}>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">품목:</span>
                          <span className="font-bold text-slate-900 text-xs">{item.partName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">품번:</span>
                          <span className="text-slate-700 font-mono text-xs">{item.partNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">수량:</span>
                          <span className="text-slate-700 text-xs">{item.quantity.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">납기:</span>
                          <span className="text-slate-700 text-xs">{item.requestDate.split('T')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">운송:</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                            item.shippingMethod === '해운'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.shippingMethod}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">제품비:</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                            item.productCostType === '무상'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.productCostType}
                          </span>
                        </div>
                        {/* 모든 계획일정이 완료되었고 DV_MASTER_PM 역할 또는 관리자인 경우 계획 승인 버튼 표시 */}
                        {(user.role === 'DV_MASTER_PM' || user.role === 'MANAGER') && item.schedules.length > 0 && 
                         item.schedules.every(s => s.isPlanCompleted) && !item.isPlanApproved && (
                          <div className="mt-2">
                            <button
                              onClick={async () => {
                                if (confirm('일정을 승인 완료 처리하시겠습니까?')) {
                                  try {
                                    await sampleScheduleService.update(item.id, {
                                      partName: item.partName,
                                      partNumber: item.partNumber,
                                      quantity: item.quantity,
                                      requestDate: item.requestDate,
                                      shippingMethod: item.shippingMethod,
                                      productCostType: item.productCostType,
                                      moldSequence: item.moldSequence || '',
                                      lot: item.lot || '미적용',
                                      remarks: item.remarks || '',
                                      isPlanApproved: true,
                                      schedules: item.schedules
                                    });
                                    setItems(prev => prev.map(i =>
                                      i.id === item.id ? { ...i, isPlanApproved: true } : i
                                    ));
                                  } catch (error) {
                                    console.error('Failed to approve plan:', error);
                                    alert('계획 승인에 실패했습니다.');
                                  }
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700"
                            >
                              계획 승인
                            </button>
                          </div>
                        )}
                        {item.isPlanApproved && (
                          <div className="mt-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                              일정 승인 완료
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">차수:</span>
                          <span className="text-xs text-slate-700">{item.moldSequence || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-500">로트:</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                            item.lot === '적용'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.lot || '미적용'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {/* 계획일정/완료일정 입력 영역 */}
                      {item.schedules.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {item.schedules.map((schedule, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 w-fit min-w-[75px]">
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
                                    disabled={schedule.isCompleted || schedule.isPlanCompleted}
                                  />
                                  {!schedule.isCompleted && (
                                    <button
                                      onClick={async () => {
                                        if (!schedule.plannedDate) {
                                          alert('계획일정을 먼저 입력하세요.');
                                          return;
                                        }
                                        // 계획완료 상태로 설정
                                        await handleUpdateSchedule(item.id, idx, 'isPlanCompleted', true);
                                      }}
                                      disabled={!schedule.plannedDate || schedule.isPlanCompleted}
                                      className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <CheckCircle2 size={12} />
                                      계획완료
                                    </button>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">완료일</label>
                                  <input
                                    type="date"
                                    value={schedule.completedDate || ''}
                                    onChange={(e) => handleUpdateSchedule(item.id, idx, 'completedDate', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                    disabled={schedule.isCompleted}
                                  />
                                  {!schedule.isCompleted && (
                                    <button
                                      onClick={() => handleCompleteSchedule(item.id, idx)}
                                      disabled={!schedule.completedDate}
                                      className="w-full mt-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <CheckCircle2 size={12} />
                                      일정완료
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            ))}
                          </div>
                          {item.remarks && (
                            <div className="mt-2 p-2 bg-slate-100 rounded border border-slate-200">
                              <div className="text-xs font-bold text-slate-700 mb-1">비고 특이사항:</div>
                              <div className="text-xs text-slate-600 whitespace-pre-wrap">{item.remarks}</div>
                            </div>
                          )}
                        </div>
                      )}
                      {item.remarks && item.schedules.length === 0 && (
                        <div className="p-2 bg-slate-100 rounded border border-slate-200">
                          <div className="text-xs font-bold text-slate-700 mb-1">비고 특이사항:</div>
                          <div className="text-xs text-slate-600 whitespace-pre-wrap">{item.remarks}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 text-center" style={{ width: '80px' }}>
                      <div className="flex flex-col items-center gap-2">
                        {(user.role === '개발팀' || user.role === 'MANAGER') && !item.isPlanApproved && (
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {(user.role === '개발팀' || user.role === 'MANAGER') && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
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
