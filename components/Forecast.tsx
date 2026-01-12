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

interface ForecastProps {
  projects?: any[]; // Not used in MVP
  onProjectsUpdate?: () => void; // Not used in MVP
}

const Forecast: React.FC<ForecastProps> = () => {
  // MVP State - ONLY what's needed
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPartName, setSelectedPartName] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

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

  // MVP: Simple onChange handler
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('🔥 MVP onChange FIRED:', value);
    
    setSelectedPartName(value);
    
    // Find matching part
    const foundPart = parts.find(p => p.partName === value);
    if (foundPart) {
      console.log('✅ MVP: Found part:', {
        partName: foundPart.partName,
        partNumber: foundPart.partNumber,
        customerName: foundPart.customerName,
        material: foundPart.material
      });
      setSelectedPart(foundPart);
    } else {
      console.log('❌ MVP: Part not found for:', value);
      setSelectedPart(null);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      maxWidth: '1200px'
    }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold">
          Forecast <span className="text-slate-400">/ 연간 계획</span>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded">입력</button>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded">
            저장
          </button>
        </div>
      </div>

      {/* MVP: Visible select */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 'bold',
          fontSize: '14px',
          color: '#475569'
        }}>
          품목 선택:
        </label>
        <select
          value={selectedPartName}
          onChange={handleSelectChange}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="">-- 품목을 선택하세요 --</option>
          {parts.map((part) => (
            <option key={part.id} value={part.partName}>
              {part.partName}
            </option>
          ))}
        </select>
      </div>

      {/* MVP: Visible rendering of selected fields */}
      {selectedPart && (
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0',
          borderRadius: '6px'
        }}>
          <h3 style={{ 
            marginTop: 0, 
            marginBottom: '12px',
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#1e293b'
          }}>
            선택된 정보:
          </h3>
          <div style={{ 
            fontSize: '14px', 
            lineHeight: '1.8',
            color: '#334155'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>품목:</strong> {selectedPart.partName}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>품번:</strong> {selectedPart.partNumber || '(없음)'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>고객사:</strong> {selectedPart.customerName || '(없음)'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>재질:</strong> {selectedPart.material || '(없음)'}
            </div>
          </div>
        </div>
      )}

      {!selectedPart && selectedPartName && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px', 
          color: '#dc2626', 
          fontSize: '14px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px'
        }}>
          ⚠️ 매칭되는 부품을 찾을 수 없습니다.
        </div>
      )}

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
