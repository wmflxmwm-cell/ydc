import React, { useState, useEffect, useRef } from 'react';
import { partService, Part } from '../src/api/services/partService';
import { settingsService, Customer, Material } from '../src/api/services/settingsService';
import { forecastService, ForecastRow as ForecastRowType } from '../src/api/services/forecastService';

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
  user?: { id: string; name: string; role: string }; // User information
}

const Forecast: React.FC<ForecastProps> = ({ user }) => {
  // MVP State - ONLY what's needed
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

  // CRITICAL: Use refs to access latest customers/materials without blocking UI updates
  // This ensures UI updates immediately, even if customers/materials are still loading
  const customersRef = useRef<Customer[]>([]);
  const materialsRef = useRef<Material[]>([]);

  // CRITICAL: Separate state for input and saved rows
  // This prevents stale data issues and ensures clear data flow
  const [currentInputRow, setCurrentInputRow] = useState<ForecastRow>({
    partName: '',
    partNumber: '',
    customerName: '',
    material: '',
    forecast: {}
  });

  // Load savedRows from server on mount
  const [savedRows, setSavedRows] = useState<ForecastRow[]>([]);
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(true);

  // Load forecasts from server and migrate localStorage data
  useEffect(() => {
    const loadForecasts = async () => {
      try {
        setIsLoadingForecasts(true);
        
        // First, try to load from server (all forecasts, visible to all users)
        const forecasts = await forecastService.getAll();
        console.log('✅ Loaded forecasts from server:', forecasts.length);
        console.log('📊 Forecast data:', forecasts);
        
        // Transform to ForecastRow format
        let serverRows: ForecastRow[] = forecasts.map(f => ({
          partName: f.partName,
          partNumber: f.partNumber,
          customerName: f.customerName,
          material: f.material,
          forecast: f.forecast
        }));
        
        // Check if there's localStorage data to migrate
        try {
          const saved = localStorage.getItem('forecast_savedRows');
          if (saved) {
            const localRows: ForecastRow[] = JSON.parse(saved);
            console.log('📦 Found localStorage data:', localRows.length);
            
            // Migrate localStorage data to server (only if not already exists)
            for (const localRow of localRows) {
              const exists = serverRows.some(sr => sr.partName === localRow.partName);
              if (!exists) {
                try {
                  await forecastService.save(localRow, user?.id);
                  console.log('✅ Migrated to server:', localRow.partName);
                  serverRows.push(localRow);
                } catch (migrateError) {
                  console.error('Failed to migrate row:', localRow.partName, migrateError);
                }
              }
            }
            
            // Clear localStorage after successful migration
            localStorage.removeItem('forecast_savedRows');
            console.log('🗑️ Cleared localStorage after migration');
          }
        } catch (localError) {
          console.error('Failed to process localStorage:', localError);
        }
        
        setSavedRows(serverRows);
      } catch (error) {
        console.error('Failed to load forecasts from server:', error);
        // Fallback to localStorage if server fails
        try {
          const saved = localStorage.getItem('forecast_savedRows');
          if (saved) {
            const parsed = JSON.parse(saved);
            console.log('✅ Loaded savedRows from localStorage (fallback):', parsed.length);
            setSavedRows(parsed);
          }
        } catch (localError) {
          console.error('Failed to load from localStorage:', localError);
        }
      } finally {
        setIsLoadingForecasts(false);
      }
    };
    loadForecasts();
  }, []);

  // MVP: Load parts, customers, and materials on mount
  // CRITICAL: Load parts FIRST, then customers/materials in background
  // This allows UI to update immediately when part is selected
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load parts FIRST - this is required for UI to work
        const partsData = await partService.getAll();
        console.log('✅ MVP: Loaded parts:', partsData.length);
        setParts(partsData);

        // Load customers and materials in background - optional for name conversion
        // UI will work even if this fails
        try {
          const [customersData, materialsData] = await Promise.all([
            settingsService.getCustomers(),
            settingsService.getMaterials()
          ]);
          console.log('✅ MVP: Loaded customers:', customersData.length);
          console.log('✅ MVP: Loaded materials:', materialsData.length);
          setCustomers(customersData);
          setMaterials(materialsData);
          // Update refs for immediate access in handlers
          customersRef.current = customersData;
          materialsRef.current = materialsData;
        } catch (settingsError) {
          console.warn('⚠️ MVP: Failed to load customers/materials (UI will still work):', settingsError);
          // UI continues to work with IDs instead of names
        }
      } catch (error) {
        console.error('❌ MVP: Failed to load parts:', error);
      }
    };
    loadData();
  }, []);

  // FRONTEND-FIRST: Handle part selection - UI updates IMMEDIATELY
  // NO waiting for API, NO conditional blocking
  // Backend data (customers/materials) is OPTIONAL for name conversion
  const handlePartSelect = (partName: string) => {
    console.log('[handlePartSelect] FIRED - UI update starting immediately:', partName);
    
    // Find matching part in LOCAL state - NO API call
    const foundPart = parts.find(p => p.partName === partName);
    
    if (!foundPart) {
      console.warn('[handlePartSelect] Part not found in local state:', partName);
      // Clear all fields when no match found
      setCurrentInputRow(prev => ({
        partName: partName,
        partNumber: '',
        customerName: '',
        material: '',
        forecast: prev.forecast
      }));
      return;
    }

    // CRITICAL: Update UI IMMEDIATELY with data from local parts array
    // NO async/await, NO waiting for customers/materials
    // Use refs to get latest customers/materials without blocking
    const customerId = foundPart.customerName; // ID from parts array
    const materialId = foundPart.material; // ID from parts array
    
    // Try to convert IDs to names using refs (latest data, no closure issues)
    // If conversion fails, use ID as fallback - UI STILL WORKS
    const customer = customersRef.current.find(c => c.id === customerId);
    const customerName = customer?.name ?? customerId ?? '';
    
    const material = materialsRef.current.find(m => m.id === materialId);
    const materialName = material?.name ?? materialId ?? '';
    
    console.log('[handlePartSelect] Updating UI immediately:', {
      partName: foundPart.partName,
      partNumber: foundPart.partNumber,
      customerName,
      materialName
    });
    
    // CRITICAL: Create NEW object - NO mutation, NO shared references
    // This ensures React detects the change and re-renders
    setCurrentInputRow(prev => {
      const updated = {
        partName: foundPart.partName,
        partNumber: foundPart.partNumber ?? '',
        customerName: customerName,
        material: materialName,
        forecast: { ...prev.forecast } // Deep copy to ensure new object
      };
      
      console.log('[handlePartSelect] State updated - React will re-render:', updated);
      return updated;
    });
    
    // UI is now updated - backend sync can happen later if needed
    console.log('[handlePartSelect] UI update complete - no backend dependency');
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
  const handleSave = async () => {
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
    
    // Save to server (with user ID)
    try {
      const result = await forecastService.save(rowToSave, user?.id);
      console.log('✅ [handleSave] Row saved to server:', result);
      
      // Update local state
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

      alert(`저장 완료!\n품목: ${rowToSave.partName}\n서버에 저장되었습니다.`);
    } catch (error) {
      console.error('❌ [handleSave] Failed to save to server:', error);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
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
        {/* FRONTEND-FIRST: Enable selection as soon as parts are loaded */}
        {/* customers/materials are optional for name conversion only */}
        <select
          className="border px-2 py-1"
          value={currentInputRow.partName}
          onChange={(e) => {
            console.log('[SELECT onChange] Event fired:', e.target.value);
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
