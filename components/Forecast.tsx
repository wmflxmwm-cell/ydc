import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Save, X, Edit, Trash2, Search } from 'lucide-react';
import { getTranslations } from '../src/utils/translations';

interface ForecastItem {
  id: string;
  partName: string;
  partNumber: string;
  tonnage: string;
  material: string;
  volumes: { [year: number]: number };
}

const Forecast: React.FC = () => {
  const t = getTranslations();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
  
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ForecastItem | null>(null);
  const [formData, setFormData] = useState<Omit<ForecastItem, 'id'>>({
    partName: '',
    partNumber: '',
    tonnage: '',
    material: '',
    volumes: {}
  });

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const saved = localStorage.getItem('forecast_data');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load forecast data:', error);
      }
    }
  }, []);

  // 데이터 저장
  const saveToLocalStorage = (data: ForecastItem[]) => {
    localStorage.setItem('forecast_data', JSON.stringify(data));
  };

  // 검색 필터링
  const filteredItems = items.filter(item =>
    item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tonnage.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      partName: '',
      partNumber: '',
      tonnage: '',
      material: '',
      volumes: {}
    });
    setEditingItem(null);
    setShowForm(false);
  };

  // 등록/수정 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partName || !formData.partNumber) {
      alert('품목과 품번은 필수 입력 항목입니다.');
      return;
    }

    if (editingItem) {
      // 수정
      const updated = items.map(item =>
        item.id === editingItem.id
          ? { ...editingItem, ...formData }
          : item
      );
      setItems(updated);
      saveToLocalStorage(updated);
      alert('Forecast 항목이 수정되었습니다.');
    } else {
      // 신규 등록
      const newItem: ForecastItem = {
        id: `forecast-${Date.now()}`,
        ...formData
      };
      const updated = [newItem, ...items];
      setItems(updated);
      saveToLocalStorage(updated);
      alert('Forecast 항목이 등록되었습니다.');
    }
    
    resetForm();
  };

  // 수정 모드로 전환
  const handleEdit = (item: ForecastItem) => {
    setEditingItem(item);
    setFormData({
      partName: item.partName,
      partNumber: item.partNumber,
      tonnage: item.tonnage,
      material: item.material,
      volumes: { ...item.volumes }
    });
    setShowForm(true);
  };

  // 삭제 처리
  const handleDelete = (id: string) => {
    if (!confirm('이 Forecast 항목을 삭제하시겠습니까?')) {
      return;
    }
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    saveToLocalStorage(updated);
    alert('Forecast 항목이 삭제되었습니다.');
  };

  // 연도별 수량 변경
  const handleVolumeChange = (year: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      volumes: {
        ...prev.volumes,
        [year]: numValue
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Forecast</h2>
              <p className="text-sm text-slate-500 mt-1">품목별 Forecast 등록 및 관리</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            등록
          </button>
        </div>

        {/* 검색 */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="품목, 품번, 톤수, 원재료로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
          />
        </div>

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="mb-6 p-6 bg-slate-50 rounded-2xl border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem ? 'Forecast 수정' : 'Forecast 등록'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    품목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.partName}
                    onChange={(e) => setFormData(prev => ({ ...prev, partName: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    품번 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    톤수
                  </label>
                  <input
                    type="text"
                    value={formData.tonnage}
                    onChange={(e) => setFormData(prev => ({ ...prev, tonnage: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    원재료
                  </label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 연도별 수량 입력 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  연도별 수량
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {years.map(year => (
                    <div key={year}>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {year}년
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.volumes[year] || ''}
                        onChange={(e) => handleVolumeChange(year, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  {editingItem ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 목록 테이블 */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <TrendingUp className="mx-auto mb-3 opacity-20" size={48} />
            <p className="font-bold">등록된 Forecast가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 text-left text-sm font-bold">품목</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">품번</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">톤수</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">원재료</th>
                  {years.map(year => (
                    <th key={year} className="px-4 py-4 text-center text-sm font-bold">
                      {year}년
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-sm font-bold">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.partName}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-700">{item.partNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.tonnage}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.material}</td>
                    {years.map(year => (
                      <td key={year} className="px-4 py-4 text-center text-sm font-bold text-slate-700">
                        {(item.volumes[year] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                          title="수정"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forecast;
