import React, { useState, useEffect } from 'react';
import { Package, Plus, X, Save, Trash2 } from 'lucide-react';
import { settingsService, Customer, Material, PostProcessing } from '../src/api/services/settingsService';
import { partService, Part } from '../src/api/services/partService';
import { getTranslations } from '../src/utils/translations';


const PartRegistration: React.FC = () => {
  const t = getTranslations();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [postProcessings, setPostProcessings] = useState<PostProcessing[]>([]);
  const [items, setItems] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 등록 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    customerName: string;
    partNumber: string;
    partName: string;
    material: string;
    cavity: string;
    productionTon: string;
    postProcessings: string[];
  }>({
    customerName: '',
    partNumber: '',
    partName: '',
    material: '',
    cavity: '',
    productionTon: '',
    postProcessings: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [customersData, materialsData, postProcessingsData, partsData] = await Promise.all([
        settingsService.getCustomers(),
        settingsService.getMaterials(),
        settingsService.getPostProcessings(),
        partService.getAll()
      ]);
      setCustomers(customersData);
      setMaterials(materialsData);
      setPostProcessings(postProcessingsData);
      setItems(partsData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.partNumber || !formData.partName || !formData.material || !formData.cavity) {
      alert('모든 필드를 입력하세요.');
      return;
    }

    try {
      const newItem = await partService.create({
        customerName: formData.customerName,
        partNumber: formData.partNumber,
        partName: formData.partName,
        material: formData.material,
        cavity: formData.cavity,
        productionTon: formData.productionTon,
        postProcessings: [...formData.postProcessings]
      });

      setItems(prev => [newItem, ...prev]);

      // 폼 초기화
      setFormData({
        customerName: '',
        partNumber: '',
        partName: '',
        material: '',
        cavity: '',
        productionTon: '',
        postProcessings: []
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create part:', error);
      alert(t.partRegistration.registerFailed);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 품목을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await partService.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete part:', error);
      alert('품목 삭제에 실패했습니다.');
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
              <h2 className="text-2xl font-black text-slate-900">{t.partRegistration.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.partRegistration.subtitle}</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
            >
              <Plus size={18} />
              {t.partRegistration.register}
            </button>
          )}
        </div>

        {/* 등록 폼 */}
        {showForm && (
          <div className="mb-6 p-6 bg-slate-50 rounded-2xl border-2 border-indigo-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t.partRegistration.title}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.customer}</label>
                  <select
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">{t.partRegistration.selectPlaceholder}</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.partNumber}</label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.partName}</label>
                  <input
                    type="text"
                    value={formData.partName}
                    onChange={(e) => setFormData(prev => ({ ...prev, partName: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.material}</label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">{t.partRegistration.selectPlaceholder}</option>
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>{material.name} ({material.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.cavity}</label>
                  <input
                    type="text"
                    value={formData.cavity}
                    onChange={(e) => setFormData(prev => ({ ...prev, cavity: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.productionTon}</label>
                  <input
                    type="text"
                    value={formData.productionTon}
                    onChange={(e) => setFormData(prev => ({ ...prev, productionTon: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={t.partRegistration.productionTonPlaceholder}
                  />
                </div>
              </div>

              {/* 후공정 추가 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t.partRegistration.postProcessingAdd}</label>
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
                    <option value="">{t.partRegistration.postProcessingSelect}</option>
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
                      productionTon: '',
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
                <th className="px-6 py-4 text-left text-sm font-bold">{t.partRegistration.customer}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.partRegistration.partNumber}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.partRegistration.partName}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.partRegistration.material}</th>
                <th className="px-6 py-4 text-center text-sm font-bold">{t.partRegistration.cavity}</th>
                <th className="px-6 py-4 text-center text-sm font-bold">{t.partRegistration.productionTon}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.settings.postProcessings}</th>
                <th className="px-6 py-4 text-center text-sm font-bold">{t.partRegistration.management}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-bold">{t.partRegistration.noItems}</p>
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
                    <td className="px-6 py-4 text-sm text-center text-slate-700">{item.productionTon || '-'}</td>
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

