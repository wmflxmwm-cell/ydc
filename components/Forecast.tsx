import React, { useState, useEffect } from 'react';
import { partService, Part } from '../src/api/services/partService';
import { settingsService, Customer, Material } from '../src/api/services/settingsService';

// ============================================
// PHASE 2: CLEAN MVP REBUILD
// ============================================
// Rules:
// - ONLY React, useState, useEffect
// - ONLY Native HTML <select>
// - NO Radix, NO shadcn, NO memo/optimization
// - NO editData, NO projectId logic yet
// ============================================

type ForecastRow = {
  partName: string;
  partNumber: string;
  customerName: string;
  material: string;
  forecast: Record<number, number>;
};

interface ForecastProps {
  projects?: any[]; // Not used in MVP
  onProjectsUpdate?: () => void; // Not used in MVP
}

const Forecast: React.FC<ForecastProps> = () => {
  // MVP State - ONLY what's needed
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

  // CRITICAL: Separate state for input and saved rows
  // This prevents stale data issues and ensures clear data flow
  const [currentInputRow, setCurrentInputRow] = useState<ForecastRow>({
    partName: '',
    partNumber: '',
    customerName: '',
    material: '',
    forecast: {}
  });

  const [savedRows, setSavedRows] = useState<ForecastRow[]>([]);

  // MVP: Load parts, customers, and materials on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load parts
        const partsData = await partService.getAll();
        console.log('✅ MVP: Loaded parts:', partsData.length);
        setParts(partsData);

        // Load customers and materials for ID-to-name mapping
        const [customersData, materialsData] = await Promise.all([
          settingsService.getCustomers(),
          settingsService.getMaterials()
        ]);
        console.log('✅ MVP: Loaded customers:', customersData.length);
        console.log('✅ MVP: Loaded materials:', materialsData.length);
        setCustomers(customersData);
        setMaterials(materialsData);
      } catch (error) {
        console.error('❌ MVP: Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // MVP: Handle part selection - ONLY affects currentInputRow
  // CRITICAL FIX: Use functional setState to access latest customers/materials
  // This prevents stale closure issues when customers/materials load asynchronously
  const handlePartSelect = (partName: string) => {
    console.log('🔥 MVP handlePartSelect FIRED:', partName);
    
    // Find matching part - exact match required
    const foundPart = parts.find(p => p.partName === partName);
    
    if (foundPart) {
      // CRITICAL FIX: Access latest customers/materials via functional setState
      // This ensures we always use the most recent data, even if it loads after component mount
      setCurrentInputRow(prev => {
        // Access latest customers and materials from state (via closure)
        // If they're not loaded yet, we'll use the ID as fallback
        const customerId = foundPart.customerName; // This is an ID like "customer-1767068"
        const customer = customers.find(c => c.id === customerId);
        const customerName = customer?.name ?? customerId ?? ''; // Use name if found, otherwise fallback to ID
        
        const materialId = foundPart.material; // This is an ID like "material-17670673"
        const material = materials.find(m => m.id === materialId);
        const materialName = material?.name ?? materialId ?? ''; // Use name if found, otherwise fallback to ID
        
        // MANDATORY: Log selectedPart BEFORE setState
        console.log('✅ MVP: Found part BEFORE setState:', {
          partName: foundPart.partName,
          partNumber: foundPart.partNumber,
          customerId: customerId,
          customerName: customerName,
          materialId: materialId,
          materialName: materialName,
          customerFound: !!customer,
          materialFound: !!material,
          customersLoaded: customers.length,
          materialsLoaded: materials.length
        });
        
        const updated = {
          partName: foundPart.partName,
          partNumber: foundPart.partNumber ?? '',
          customerName: customerName, // Use converted name, not ID
          material: materialName, // Use converted name, not ID
          forecast: prev.forecast // Keep existing forecast values
        };
        
        // MANDATORY: Log final row AFTER setState (in callback)
        console.log('✅ MVP: Updated currentInputRow AFTER setState:', {
          partName: updated.partName,
          partNumber: updated.partNumber,
          customerName: updated.customerName,
          material: updated.material
        });
        
        return updated;
      });
    } else {
      console.log('❌ MVP: Part not found for:', partName);
      // Clear all fields when no match found
      setCurrentInputRow(prev => ({
        partName: partName,
        partNumber: '',
        customerName: '',
        material: '',
        forecast: prev.forecast
      }));
    }
  };

  // MVP: Update forecast value - ONLY affects currentInputRow
  const updateForecast = (year: number, value: number) => {
    console.log('🔥 MVP updateForecast FIRED:', { year, value });
    setCurrentInputRow(prev => ({
      ...prev,
      forecast: {
        ...prev.forecast,
        [year]: value
      }
    }));
  };

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against undefined state
  const handleSave = () => {
    console.log('[handleSave] called');
    
    // Guard: Validate currentInputRow exists
    if (!currentInputRow) {
      console.warn('[handleSave] currentInputRow is missing');
      alert('입력 데이터가 없습니다.');
      return;
    }
    
    // Validate that at least partName is filled
    if (!currentInputRow.partName || !currentInputRow.partName.trim()) {
      alert('품목을 선택해주세요.');
      return;
    }
    
    // Create a copy of currentInputRow to add to savedRows
    const rowToSave: ForecastRow = {
      partName: currentInputRow.partName,
      partNumber: currentInputRow.partNumber ?? '',
      customerName: currentInputRow.customerName ?? '',
      material: currentInputRow.material ?? '',
      forecast: currentInputRow.forecast ? { ...currentInputRow.forecast } : {} // Deep copy forecast object
    };
    
    // Add to savedRows
    setSavedRows(prev => {
      const updated = [...prev, rowToSave];
      console.log('[handleSave] Row added. Total saved rows:', updated.length);
      return updated;
    });
    
    // Reset currentInputRow to empty
    setCurrentInputRow({
      partName: '',
      partNumber: '',
      customerName: '',
      material: '',
      forecast: {}
    });
    
    console.log('✅ [handleSave] Row saved successfully');
    console.log('📦 [handleSave] SAVE PAYLOAD:', rowToSave);
    
    // Show visible feedback
    setSavedRows(prev => {
      alert(`저장 완료!\n품목: ${rowToSave.partName}\n총 ${prev.length + 1}개의 행이 저장되었습니다.`);
      return prev;
    });
    
    // TODO: API / SQL 연동
    // await forecastService.save(rowToSave);
  };

  // DEFENSIVE HANDLER PATTERN: Log execution and guard against invalid input
  const handleEdit = (savedRowIndex: number) => {
    console.log('[handleEdit] called', { savedRowIndex });
    
    // Guard: Validate savedRowIndex is valid
    if (savedRowIndex === undefined || savedRowIndex < 0) {
      console.warn('[handleEdit] Invalid savedRowIndex', { savedRowIndex });
      alert('편집할 행 인덱스가 올바르지 않습니다.');
      return;
    }
    
    // Guard: Validate savedRows exists and has the index
    if (!savedRows || savedRowIndex >= savedRows.length) {
      console.warn('[handleEdit] savedRowIndex out of bounds', { savedRowIndex, savedRowsLength: savedRows?.length });
      alert('편집할 행을 찾을 수 없습니다.');
      return;
    }
    
    // Get the row to edit
    const rowToEdit = savedRows[savedRowIndex];
    
    // Guard: Validate rowToEdit exists
    if (!rowToEdit) {
      console.warn('[handleEdit] rowToEdit is missing', { savedRowIndex });
      alert('편집할 행 데이터가 없습니다.');
      return;
    }
    
    // Load it into currentInputRow
    setCurrentInputRow({
      partName: rowToEdit.partName ?? '',
      partNumber: rowToEdit.partNumber ?? '',
      customerName: rowToEdit.customerName ?? '',
      material: rowToEdit.material ?? '',
      forecast: rowToEdit.forecast ? { ...rowToEdit.forecast } : {} // Deep copy
    });
    
    // Remove from savedRows
    setSavedRows(prev => {
      const filtered = prev.filter((_, index) => index !== savedRowIndex);
      console.log('[handleEdit] Row removed from savedRows. Remaining:', filtered.length);
      return filtered;
    });
    
    console.log('✅ [handleEdit] Row loaded for editing:', rowToEdit);
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'auto' // FIX 3: Allow horizontal scroll if needed
    }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold">
          Forecast <span className="text-slate-400">/ 연간 계획</span>
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
      {/* FIX 2 & 3: Use minmax for year columns to prevent overflow, ensure full width */}
      {/* Added "수정" column at the end */}
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
        {/* CRITICAL: Disable selection until customers and materials are loaded */}
        <select
          className="border px-2 py-1"
          value={currentInputRow.partName}
          onChange={(e) => handlePartSelect(e.target.value)}
          disabled={customers.length === 0 || materials.length === 0}
        >
          <option value="">선택</option>
          {parts.map(p => (
            <option key={p.id} value={p.partName}>
              {p.partName}
            </option>
          ))}
        </select>

        {/* 품번 / 고객사 / 재질 */}
        {/* MANDATORY: Controlled inputs with explicit null handling - single source of truth */}
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

export default Forecast;
