import React, { useState, useEffect } from 'react';
import { partService, Part } from '../src/api/services/partService';

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
  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];
  
  // Row data structure
  const [row, setRow] = useState<ForecastRow>({
    partName: '',
    partNumber: '',
    customerName: '',
    material: '',
    forecast: {}
  });

  // MVP: Load parts on mount
  useEffect(() => {
    const loadParts = async () => {
      try {
        const partsData = await partService.getAll();
        console.log('✅ MVP: Loaded parts:', partsData.length);
        setParts(partsData);
      } catch (error) {
        console.error('❌ MVP: Failed to load parts:', error);
      }
    };
    loadParts();
  }, []);

  // MVP: Handle part selection
  const handlePartSelect = (partName: string) => {
    console.log('🔥 MVP handlePartSelect FIRED:', partName);
    
    // Find matching part
    const foundPart = parts.find(p => p.partName === partName);
    if (foundPart) {
      console.log('✅ MVP: Found part:', {
        partName: foundPart.partName,
        partNumber: foundPart.partNumber,
        customerName: foundPart.customerName,
        material: foundPart.material
      });
      
      setRow({
        partName: foundPart.partName,
        partNumber: foundPart.partNumber || '',
        customerName: foundPart.customerName || '',
        material: foundPart.material || '',
        forecast: row.forecast // Keep existing forecast values
      });
    } else {
      console.log('❌ MVP: Part not found for:', partName);
      setRow({
        partName: partName,
        partNumber: '',
        customerName: '',
        material: '',
        forecast: row.forecast
      });
    }
  };

  // MVP: Update forecast value
  const updateForecast = (year: number, value: number) => {
    console.log('🔥 MVP updateForecast FIRED:', year, value);
    setRow(prev => ({
      ...prev,
      forecast: {
        ...prev.forecast,
        [year]: value
      }
    }));
  };

  // MVP: Handle save
  const handleSave = () => {
    const forecastRows = [row]; // Currently single row, can be extended to array
    console.log('SAVE PAYLOAD:', forecastRows);
    // API / SQL 연동
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      width: '100%'
    }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold">
          Forecast <span className="text-slate-400">/ 연간 계획</span>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded">입력</button>
          <button 
            className="px-3 py-1 bg-indigo-600 text-white rounded"
            onClick={handleSave}
          >
            저장
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[200px_150px_150px_150px_repeat(7,1fr)] gap-2 font-semibold text-sm bg-slate-100 p-2">
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
      </div>

      {/* Table Row */}
      <div className="grid grid-cols-[200px_150px_150px_150px_repeat(7,1fr)] gap-2 p-2 border-b">
        {/* 품목 */}
        <select
          className="border px-2 py-1"
          value={row.partName}
          onChange={(e) => handlePartSelect(e.target.value)}
        >
          <option value="">선택</option>
          {parts.map(p => (
            <option key={p.id} value={p.partName}>
              {p.partName}
            </option>
          ))}
        </select>

        {/* 품번 / 고객사 / 재질 */}
        <input className="border px-2 py-1" value={row.partNumber} readOnly />
        <input className="border px-2 py-1" value={row.customerName} readOnly />
        <input className="border px-2 py-1" value={row.material} readOnly />

        {/* 연도별 Forecast */}
        {years.map(year => (
          <input
            key={year}
            type="number"
            className="border px-2 py-1 text-right"
            value={row.forecast[year] ?? ''}
            onChange={(e) =>
              updateForecast(year, Number(e.target.value))
            }
          />
        ))}
      </div>

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
