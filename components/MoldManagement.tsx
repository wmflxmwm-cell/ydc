import React, { useState, useEffect, useRef } from 'react';
import { Wrench } from 'lucide-react';
import { partService, Part } from '../src/api/services/partService';
import { settingsService, Customer, Material } from '../src/api/services/settingsService';

type MoldRow = {
  partName: string;
  partNumber: string;
  customerName: string;
  material: string;
  forecast: Record<number, number>;
};

interface Props {
  user?: { id: string; name: string; role: string };
}

const MoldManagement: React.FC<Props> = ({ user }) => {
  // State declarations
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

  // CRITICAL: Use refs to access latest customers/materials without blocking UI updates
  const customersRef = useRef<Customer[]>([]);
  const materialsRef = useRef<Material[]>([]);

  // Separate state for input and saved rows
  const [currentInputRow, setCurrentInputRow] = useState<MoldRow>({
    partName: '',
    partNumber: '',
    customerName: '',
    material: '',
    forecast: {}
  });

  const [savedRows, setSavedRows] = useState<MoldRow[]>([]);

  // Load parts, customers, and materials on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load parts FIRST - this is required for UI to work
        const partsData = await partService.getAll();
        console.log('✅ MoldManagement: Loaded parts:', partsData.length);
        setParts(partsData);

        // Load customers and materials in background - optional for name conversion
        try {
          const [customersData, materialsData] = await Promise.all([
            settingsService.getCustomers(),
            settingsService.getMaterials()
          ]);
          console.log('✅ MoldManagement: Loaded customers:', customersData.length);
          console.log('✅ MoldManagement: Loaded materials:', materialsData.length);
          setCustomers(customersData);
          setMaterials(materialsData);
          customersRef.current = customersData;
          materialsRef.current = materialsData;
        } catch (settingsError) {
          console.warn('⚠️ MoldManagement: Failed to load customers/materials (UI will still work):', settingsError);
        }
      } catch (error) {
        console.error('❌ MoldManagement: Failed to load parts:', error);
      }
    };
    loadData();
  }, []);

  // FRONTEND-FIRST: Handle part selection - UI updates IMMEDIATELY
  const handlePartSelect = (partName: string) => {
    console.log('[MoldManagement handlePartSelect] FIRED - UI update starting immediately:', partName);
    
    const foundPart = parts.find(p => p.partName === partName);
    
    if (!foundPart) {
      console.warn('[MoldManagement handlePartSelect] Part not found in local state:', partName);
      setCurrentInputRow(prev => ({
        partName: partName,
        partNumber: '',
        customerName: '',
        material: '',
        forecast: prev.forecast
      }));
      return;
    }

    const customerId = foundPart.customerName;
    const materialId = foundPart.material;
    
    const customer = customersRef.current.find(c => c.id === customerId);
    const customerName = customer?.name ?? customerId ?? '';
    
    const material = materialsRef.current.find(m => m.id === materialId);
    const materialName = material?.name ?? materialId ?? '';
    
    console.log('[MoldManagement handlePartSelect] Updating UI immediately:', {
      partName: foundPart.partName,
      partNumber: foundPart.partNumber,
      customerName,
      materialName
    });
    
    setCurrentInputRow(prev => {
      const updated = {
        partName: foundPart.partName,
        partNumber: foundPart.partNumber ?? '',
        customerName: customerName,
        material: materialName,
        forecast: { ...prev.forecast }
      };
      
      console.log('[MoldManagement handlePartSelect] State updated - React will re-render:', updated);
      return updated;
    });
    
    console.log('[MoldManagement handlePartSelect] UI update complete - no backend dependency');
  };

  // Update forecast value
  const updateForecast = (year: number, value: number) => {
    console.log('[MoldManagement updateForecast] FIRED:', { year, value });
    setCurrentInputRow(prev => ({
      ...prev,
      forecast: {
        ...prev.forecast,
        [year]: value
      }
    }));
  };

  // Handle save button
  const handleSave = () => {
    console.log('[MoldManagement handleSave] called');
    
    if (!currentInputRow) {
      console.warn('[MoldManagement handleSave] currentInputRow is missing');
      alert('입력 데이터가 없습니다.');
      return;
    }
    
    if (!currentInputRow.partName || !currentInputRow.partName.trim()) {
      alert('품목을 선택해주세요.');
      return;
    }
    
    const rowToSave: MoldRow = {
      partName: currentInputRow.partName,
      partNumber: currentInputRow.partNumber ?? '',
      customerName: currentInputRow.customerName ?? '',
      material: currentInputRow.material ?? '',
      forecast: currentInputRow.forecast ? { ...currentInputRow.forecast } : {}
    };
    
    setSavedRows(prev => {
      const updated = [...prev, rowToSave];
      console.log('[MoldManagement handleSave] Row added. Total saved rows:', updated.length);
      return updated;
    });
    
    setCurrentInputRow({
      partName: '',
      partNumber: '',
      customerName: '',
      material: '',
      forecast: {}
    });
    
    console.log('✅ [MoldManagement handleSave] Row saved successfully');
    console.log('📦 [MoldManagement handleSave] SAVE PAYLOAD:', rowToSave);
    
    setSavedRows(prev => {
      alert(`저장 완료!\n품목: ${rowToSave.partName}\n총 ${prev.length + 1}개의 행이 저장되었습니다.`);
      return prev;
    });
  };

  // Handle edit button
  const handleEdit = (savedRowIndex: number) => {
    console.log('[MoldManagement handleEdit] called', { savedRowIndex });
    
    if (savedRowIndex === undefined || savedRowIndex < 0) {
      console.warn('[MoldManagement handleEdit] Invalid savedRowIndex', { savedRowIndex });
      alert('편집할 행 인덱스가 올바르지 않습니다.');
      return;
    }
    
    if (!savedRows || savedRowIndex >= savedRows.length) {
      console.warn('[MoldManagement handleEdit] savedRowIndex out of bounds', { savedRowIndex, savedRowsLength: savedRows?.length });
      alert('편집할 행을 찾을 수 없습니다.');
      return;
    }
    
    const rowToEdit = savedRows[savedRowIndex];
    
    if (!rowToEdit) {
      console.warn('[MoldManagement handleEdit] rowToEdit is missing', { savedRowIndex });
      alert('편집할 행 데이터가 없습니다.');
      return;
    }
    
    setCurrentInputRow({
      partName: rowToEdit.partName ?? '',
      partNumber: rowToEdit.partNumber ?? '',
      customerName: rowToEdit.customerName ?? '',
      material: rowToEdit.material ?? '',
      forecast: rowToEdit.forecast ? { ...rowToEdit.forecast } : {}
    });
    
    setSavedRows(prev => {
      const filtered = prev.filter((_, index) => index !== savedRowIndex);
      console.log('[MoldManagement handleEdit] Row removed from savedRows. Remaining:', filtered.length);
      return filtered;
    });
    
    console.log('✅ [MoldManagement handleEdit] Row loaded for editing:', rowToEdit);
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'auto'
    }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-600" />
          <span>증작금형 관리</span>
          <span className="text-slate-400">/ Mold Management</span>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            onClick={handleSave}
            type="button"
          >
            저장
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div 
        className="grid gap-2 font-semibold text-sm bg-slate-100 p-2"
        style={{
          gridTemplateColumns: '200px 150px 150px 150px repeat(7, minmax(80px, 1fr)) 80px',
          minWidth: 'fit-content',
          width: '100%'
        }}
      >
        <div>품목</div>
        <div>품번</div>
        <div>고객사</div>
        <div>재질</div>
        <div>2026</div>
        <div>2027</div>
        <div>2028</div>
        <div>2029</div>
        <div>2030</div>
        <div>2031</div>
        <div>2032</div>
        <div>수정</div>
      </div>

      {/* TOP: Current Input Row (Editable) */}
      <div 
        className="grid gap-2 p-2 border-b-2 border-indigo-300 bg-indigo-50"
        style={{
          gridTemplateColumns: '200px 150px 150px 150px repeat(7, minmax(80px, 1fr)) 80px',
          minWidth: 'fit-content',
          width: '100%'
        }}
      >
        {/* 품목 */}
        <select
          className="border px-2 py-1"
          value={currentInputRow.partName}
          onChange={(e) => {
            console.log('[MoldManagement SELECT onChange] Event fired:', e.target.value);
            handlePartSelect(e.target.value);
          }}
          disabled={parts.length === 0}
        >
          <option value="">선택</option>
          {parts.map(p => (
            <option key={p.id} value={p.partName}>
              {p.partName}
            </option>
          ))}
        </select>

        {/* 품번 / 고객사 / 재질 */}
        <input 
          className="border px-2 py-1" 
          value={currentInputRow.partNumber ?? ''} 
          readOnly 
        />
        <input 
          className="border px-2 py-1" 
          value={currentInputRow.customerName ?? ''} 
          readOnly 
        />
        <input 
          className="border px-2 py-1" 
          value={currentInputRow.material ?? ''} 
          readOnly 
        />

        {/* 연도별 Forecast */}
        {years.map(year => (
          <input
            key={year}
            type="number"
            className="border px-2 py-1 text-right"
            value={currentInputRow.forecast[year] ?? ''}
            onChange={(e) =>
              updateForecast(year, Number(e.target.value))
            }
          />
        ))}

        {/* Empty cell for "수정" column in input row */}
        <div></div>
      </div>

      {/* BELOW: Saved Rows (Fixed, Read-only) */}
      {savedRows.map((row, savedRowIndex) => (
        <div 
          key={savedRowIndex}
          className="grid gap-2 p-2 border-b bg-white"
          style={{
            gridTemplateColumns: '200px 150px 150px 150px repeat(7, minmax(80px, 1fr)) 80px',
            minWidth: 'fit-content',
            width: '100%'
          }}
        >
          {/* 품목 - Read-only */}
          <input 
            className="border px-2 py-1 bg-slate-50" 
            value={row.partName ?? ''} 
            readOnly 
          />

          {/* 품번 / 고객사 / 재질 - Read-only */}
          <input 
            className="border px-2 py-1 bg-slate-50" 
            value={row.partNumber ?? ''} 
            readOnly 
          />
          <input 
            className="border px-2 py-1 bg-slate-50" 
            value={row.customerName ?? ''} 
            readOnly 
          />
          <input 
            className="border px-2 py-1 bg-slate-50" 
            value={row.material ?? ''} 
            readOnly 
          />

          {/* 연도별 Forecast - Read-only */}
          {years.map(year => (
            <input
              key={year}
              type="number"
              className="border px-2 py-1 text-right bg-slate-50"
              value={row.forecast[year] ?? ''}
              readOnly
            />
          ))}

          {/* 수정 버튼 */}
          <button
            className="px-2 py-1 text-xs border rounded hover:bg-slate-100 transition-colors"
            onClick={() => handleEdit(savedRowIndex)}
            type="button"
          >
            수정
          </button>
        </div>
      ))}

      {parts.length === 0 && (
        <div style={{ 
          padding: '12px', 
          color: '#64748b', 
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          부품 데이터를 불러오는 중...
        </div>
      )}
    </div>
  );
};

export default MoldManagement;
