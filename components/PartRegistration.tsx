import React, { useState, useEffect } from 'react';
import { Package, Plus, X, Save, Trash2 } from 'lucide-react';
import { settingsService, Customer, Material, PostProcessing } from '../src/api/services/settingsService';
import { getTranslations } from '../src/utils/translations';

interface PartItem {
  id: string;
  customerName: string;
  partNumber: string;
  partName: string;
  material: string;
  cavity: string;
  postProcessings: string[]; // 후공정 ID 배열
}

const PartRegistration: React.FC = () => {
  const t = getTranslations();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [items, setItems] = useState<PartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 등록 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    customerName: string;
    partNumber: string;
    partName: string;
    material: string;
    cavity: string;
    postProcessings: string[];
  }>({
    customerName: '',
    partNumber: '',
    partName: '',
    material: '',
    cavity: '',
    postProcessings: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [customersData, materialsData, postProcessingsData] = await Promise.all([
        settingsService.getCustomers(),
        settingsService.getMaterials(),
        settingsService.getPostProcessings()
      ]);
      setCustomers(customersData);
      setMaterials(materialsData);
      setPostProcessings(postProcessingsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPostProcessing = (postProcessingId: string) => {
    if (formData.postProcessings.includes(postProcessingId)) {
      return; // 이미 추가된 경우 무시
    }
    setFormData(prev => ({
      ...prev,
      postProcessings: [...prev.postProcessings, postProcessingId]
    }));
  };

  const handleRemovePostProcessing = (postProcessingId: string) => {
    setFormData(prev => ({
      ...prev,
      postProcessings: prev.postProcessings.filter(id => id !== postProcessingId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.partNumber || !formData.partName || !formData.material || !formData.cavity) {
      alert('모든 필드를 입력하세요.');
      return;
    }

    const newItem: PartItem = {
      id: `part-${Date.now()}`,
      customerName: formData.customerName,
      partNumber: formData.partNumber,
      partName: formData.partName,
      material: formData.material,
      cavity: formData.cavity,
      postProcessings: [...formData.postProcessings]
    };

    setItems(prev => [...prev, newItem]);

    // 폼 초기화
    setFormData({
      customerName: '',
      partNumber: '',
      partName: '',
      material: '',
      cavity: '',
      postProcessings: []
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 품목을 삭제하시겠습니까?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const getPostProcessingName = (id: string) => {
    return postProcessings.find(p => p.id === id)?.name || '';
  };

  const getMaterialName = (id: string) => {
    return materials.find(m => m.id === id)?.name || id;
  };

  const getCustomerName = (id: string) => {
    return customers.find(c => c.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Package className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">품목 등록</h2>
              <p className="text-sm text-slate-500 mt-1">품목 정보 등록 및 관리</p>
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
            <h3 className="text-lg font-bold text-slate-900 mb-4">품목 등록</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">고객사</label>
                  <select
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">선택하세요</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">재질</label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">선택하세요</option>
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>{material.name} ({material.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cav</label>
                  <input
                    type="text"
                    value={formData.cavity}
                    onChange={(e) => setFormData(prev => ({ ...prev, cavity: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* 후공정 추가 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">후공정 추가</label>
                <div className="flex gap-2 flex-wrap">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPostProcessing(e.target.value);
                        e.target.value = ''; // 선택 후 초기화
                      }
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">후공정 선택...</option>
                    {postProcessings
                      .filter(pp => !formData.postProcessings.includes(pp.id))
                      .map(pp => (
                        <option key={pp.id} value={pp.id}>{pp.name}</option>
                      ))}
                  </select>
                </div>
                {formData.postProcessings.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.postProcessings.map(postProcessingId => (
                      <div
                        key={postProcessingId}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg"
                      >
                        <span className="text-sm font-bold">{getPostProcessingName(postProcessingId)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePostProcessing(postProcessingId)}
                          className="p-0.5 hover:bg-indigo-200 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      customerName: '',
                      partNumber: '',
                      partName: '',
                      material: '',
                      cavity: '',
                      postProcessings: []
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
                  저장
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
                <th className="px-6 py-4 text-left text-sm font-bold">고객사</th>
                <th className="px-6 py-4 text-left text-sm font-bold">품번</th>
                <th className="px-6 py-4 text-left text-sm font-bold">품목</th>
                <th className="px-6 py-4 text-left text-sm font-bold">재질</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Cav</th>
                <th className="px-6 py-4 text-left text-sm font-bold">후공정</th>
                <th className="px-6 py-4 text-center text-sm font-bold">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-bold">등록된 품목이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{getCustomerName(item.customerName)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{item.partNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.partName}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{getMaterialName(item.material)}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-700">{item.cavity}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {item.postProcessings.map(ppId => (
                          <span
                            key={ppId}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold"
                          >
                            {getPostProcessingName(ppId)}
                          </span>
                        ))}
                        {item.postProcessings.length === 0 && (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
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

export default PartRegistration;

