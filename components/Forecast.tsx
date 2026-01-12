import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../src/api/services/projectService';
import { partService, Part } from '../src/api/services/partService';
import { TrendingUp, Calendar, Package, Search, RefreshCw, CheckCircle2, Sparkles, Clipboard, Check, Edit, Save, X } from 'lucide-react';
import { getTranslations } from '../src/utils/translations';
import { GoogleGenAI } from "@google/genai";

interface Props {
  projects: Project[];
  onProjectsUpdate?: () => void;
}

interface ExcelRow {
  partName: string;
  partNumber: string;
  customerName: string;
  volumes: { [year: number]: number };
}

const Forecast: React.FC<Props> = ({ projects, onProjectsUpdate }) => {
  const t = getTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<ExcelRow[]>([]);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [editData, setEditData] = useState<{ 
    [projectId: string]: { 
      [year: number]: number;
      partName?: string;
      partNumber?: string;
      customerName?: string;
      material?: string;
    } 
  }>({});

  const loadParts = async () => {
    try {
      const partsData = await partService.getAll();
      console.log('Loaded parts:', partsData);
      setParts(partsData);
    } catch (error) {
      console.error('Failed to load parts:', error);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  // 입력 모드로 들어갈 때 parts 데이터 다시 불러오기
  useEffect(() => {
    if (isEditMode) {
      loadParts();
    }
  }, [isEditMode]);

  useEffect(() => {
    if (!projects || !Array.isArray(projects)) {
      setFilteredProjects([]);
      return;
    }
    const filtered = projects.filter(project => {
      if (!project) return false;
      const matchesSearch = 
        project.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.material && project.material.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  const getVolumeForYear = (project: Project, year: number): number => {
    const volumeKey = `volume${year}` as keyof Project;
    return (project[volumeKey] as number) || 0;
  };

  const getTotalVolumeForYear = (year: number): number => {
    return filteredProjects.reduce((sum, project) => sum + getVolumeForYear(project, year), 0);
  };

  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

  // 붙여넣은 데이터 파싱 및 AI 분석
  const handlePasteData = async (text: string) => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setPastedData(text);

    try {
      // 탭과 줄바꿈으로 구분된 데이터 파싱
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        alert('붙여넣은 데이터가 없습니다.');
        setIsAnalyzing(false);
        return;
      }

      // 각 줄을 탭으로 분리 (빈 값도 보존)
      const rows = lines.map(line => {
        // 탭으로 분리 - 연속된 탭 사이의 빈 문자열도 보존
        const cells = line.split('\t');
        // trim은 하되, 빈 문자열은 그대로 유지
        return cells.map(cell => cell === '' ? '' : cell.trim());
      });

      console.log('Parsed paste data:', rows);
      console.log('First row (headers):', rows[0]);

      // 헤더 행 찾기 (연도가 포함된 행 우선)
      let headerRowIndex = 0;
      let headers: string[] = [];
      let bestScore = -1;
      let foundYearRow = false;
      
      // 연도 패턴 (2026-2032)
      const yearPattern = /(202[6-9]|203[0-2])/;
      
      // 먼저 연도가 포함된 행 찾기
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const nonEmptyCells = row.filter(cell => cell !== '').length;
        if (nonEmptyCells < 3) continue;
        
        const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
        const hasYear = yearPattern.test(rowText);
        const hasHeaderKeywords = /품명|품번|부품|part|customer|고객|년도|year|volume|수량/.test(rowText);
        
        if (hasYear) {
          // 연도가 포함된 행을 찾으면 즉시 선택
          headerRowIndex = i;
          headers = row.map(h => String(h || '').toLowerCase().trim());
          foundYearRow = true;
          console.log(`Found header row with years at index ${i}`);
          break;
        }
      }
      
      // 연도가 포함된 행을 찾지 못한 경우, 헤더 키워드로 찾기
      if (!foundYearRow) {
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const nonEmptyCells = row.filter(cell => cell !== '').length;
          if (nonEmptyCells < 3) continue;
          
          const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
          const hasHeaderKeywords = /품명|품번|부품|part|customer|고객|년도|year|volume|수량/.test(rowText);
          
          let score = 0;
          if (hasHeaderKeywords) {
            score += 50;
          }
          score += nonEmptyCells;
          
          if (score > bestScore) {
            bestScore = score;
            headerRowIndex = i;
            headers = row.map(h => String(h || '').toLowerCase().trim());
          }
        }
      }
      
      // 헤더를 찾지 못한 경우 첫 번째 행 사용
      if (headers.length === 0 && rows[0]) {
        headers = rows[0].map(h => String(h || '').toLowerCase().trim());
        headerRowIndex = 0;
      }

      console.log(`Header row index: ${headerRowIndex}`);
      console.log('Headers:', headers);

      // 샘플 데이터 준비
      const sampleRows = rows.slice(headerRowIndex + 1, headerRowIndex + 6).filter(row => row && row.length > 0);

      // AI 분석
      let aiMapping: {
        partName: number | null;
        partNumber: number | null;
        customerName: number | null;
        volumes: { [year: number]: number | null };
      } | null = null;

      if (sampleRows.length > 0) {
        console.log('AI 분석 시작...');
        aiMapping = await analyzeExcelWithAI(headers, sampleRows);
        if (aiMapping) {
          console.log('AI 매핑 결과:', aiMapping);
        }
      }

      // 폴백 매핑 함수
      const getColumnIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          const normalizedName = name.toLowerCase().trim();
          const index = headers.findIndex(h => {
            if (!h || typeof h !== 'string') return false;
            const normalizedHeader = h.toLowerCase().trim();
            return normalizedHeader === normalizedName || 
                   normalizedHeader.includes(normalizedName) ||
                   normalizedName.includes(normalizedHeader);
          });
          if (index !== -1) return index;
        }
        return -1;
      };

      const getPartNameIndex = () => {
        if (aiMapping && aiMapping.partName !== null && aiMapping.partName !== undefined) {
          return aiMapping.partName;
        }
        return getColumnIndex(['부품명', 'partname', 'part', '품명', 'part name', '품목명', 'item name', 'item', '부품']);
      };

      const getPartNumberIndex = () => {
        if (aiMapping && aiMapping.partNumber !== null && aiMapping.partNumber !== undefined) {
          return aiMapping.partNumber;
        }
        return getColumnIndex(['부품번호', 'partnumber', 'p/n', '품번', 'part number', 'part no', 'partno', 'part_no', 'pn', 'p#']);
      };

      const getCustomerNameIndex = () => {
        if (aiMapping && aiMapping.customerName !== null && aiMapping.customerName !== undefined) {
          return aiMapping.customerName;
        }
        return getColumnIndex(['고객사', 'customer', '고객사명', 'customer name', 'customername', 'customer_name', '고객', 'client']);
      };

      const getYearIndex = (year: number) => {
        if (aiMapping && aiMapping.volumes[year] !== null && aiMapping.volumes[year] !== undefined) {
          return aiMapping.volumes[year] as number;
        }
        return getColumnIndex([`${year}`, `${year}년`, `${year} year`, `year ${year}`]);
      };

      // 데이터 파싱
      const parsed: ExcelRow[] = [];
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const isEmptyRow = row.every(cell => cell === '');
        if (isEmptyRow) continue;

        const partNameIndex = getPartNameIndex();
        const partNumberIndex = getPartNumberIndex();
        const customerNameIndex = getCustomerNameIndex();

        const partName = partNameIndex !== -1 && row[partNameIndex] !== undefined && row[partNameIndex] !== null
          ? String(row[partNameIndex] || '').trim() 
          : '';
        const partNumber = partNumberIndex !== -1 && row[partNumberIndex] !== undefined && row[partNumberIndex] !== null
          ? String(row[partNumberIndex] || '').trim()
          : '';
        const customerName = customerNameIndex !== -1 && row[customerNameIndex] !== undefined && row[customerNameIndex] !== null
          ? String(row[customerNameIndex] || '').trim()
          : '';

        if (!partName || !partNumber || !customerName) continue;

        const volumes: { [year: number]: number } = {};
        years.forEach(year => {
          const yearIndex = getYearIndex(year);
          if (yearIndex !== -1 && row[yearIndex] !== null && row[yearIndex] !== undefined) {
            const value = row[yearIndex];
            const numValue = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(/,/g, '')) || 0;
            volumes[year] = Math.max(0, numValue);
          }
        });

        parsed.push({
          partName,
          partNumber,
          customerName,
          volumes
        });
      }

      console.log('Parsed rows from paste:', parsed);
      setParsedRows(parsed);
      setShowPasteArea(false);
    } catch (error) {
      console.error('붙여넣기 데이터 파싱 실패:', error);
      alert('데이터 파싱 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 붙여넣은 데이터로 프로젝트 업데이트
  const handleUpdateFromPaste = async () => {
    if (parsedRows.length === 0) {
      alert('업데이트할 데이터가 없습니다.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      let successCount = 0;
      let failedCount = 0;
      const failedMatches: string[] = [];

      // 디버깅: 현재 프로젝트 목록 확인
      console.log('Current projects:', projects.map(p => ({
        id: p.id,
        partName: p.partName,
        partNumber: p.partNumber,
        customerName: p.customerName
      })));
      console.log('Parsed rows to match:', parsedRows.slice(0, 5).map(r => ({
        partName: r.partName,
        partNumber: r.partNumber,
        customerName: r.customerName
      })));

      for (let idx = 0; idx < parsedRows.length; idx++) {
        const row = parsedRows[idx];
        const normalize = (str: string) => {
          if (!str) return '';
          return str.trim().toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
        };
        
        // 정확한 매칭 시도
        let matchingProject = projects.find(p => {
          const partNameMatch = normalize(p.partName) === normalize(row.partName);
          const partNumberMatch = normalize(p.partNumber) === normalize(row.partNumber);
          const customerMatch = normalize(p.customerName) === normalize(row.customerName);
          return partNameMatch && partNumberMatch && customerMatch;
        });

        // 정확한 매칭 실패 시 품번만으로 매칭 시도
        if (!matchingProject) {
          matchingProject = projects.find(p => {
            const partNumberMatch = normalize(p.partNumber) === normalize(row.partNumber);
            return partNumberMatch;
          });
          
          if (matchingProject && idx < 3) {
            console.log(`Partial match found (by partNumber only):`, {
              row: { partName: row.partName, partNumber: row.partNumber, customerName: row.customerName },
              project: { partName: matchingProject.partName, partNumber: matchingProject.partNumber, customerName: matchingProject.customerName }
            });
          }
        }

        // 디버깅: 처음 몇 개 행의 매칭 시도 로그
        if (idx < 3) {
          console.log(`Matching attempt ${idx + 1}:`, {
            row: { partName: row.partName, partNumber: row.partNumber, customerName: row.customerName },
            normalized: {
              partName: normalize(row.partName),
              partNumber: normalize(row.partNumber),
              customerName: normalize(row.customerName)
            },
            found: !!matchingProject
          });
        }

        if (matchingProject) {
          try {
            const updateData: Partial<Project> = {};
            years.forEach(year => {
              if (row.volumes[year] !== undefined && row.volumes[year] !== null) {
                const volumeKey = `volume${year}` as keyof Project;
                updateData[volumeKey] = row.volumes[year];
              }
            });

            if (Object.keys(updateData).length > 0) {
              await projectService.updateVolumes(matchingProject.id, updateData);
              successCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            console.error(`Failed to update project ${matchingProject.id}:`, error);
            failedCount++;
            failedMatches.push(`${row.partName} (${row.partNumber})`);
          }
        } else {
          failedCount++;
          failedMatches.push(`${row.partName} (${row.partNumber}) - 매칭되는 프로젝트 없음`);
        }
      }

      setUploadStatus({ success: successCount, failed: failedCount });
      
      if (onProjectsUpdate) {
        await onProjectsUpdate();
      }

      // 실패한 매칭 상세 정보
      if (failedCount > 0) {
        console.warn(`Failed matches (first 10):`, failedMatches.slice(0, 10));
        const failedDetails = failedMatches.slice(0, 10).join('\n');
        const message = `업데이트 완료: ${successCount}개 성공, ${failedCount}개 실패\n\n실패한 항목 (처음 10개):\n${failedDetails}${failedMatches.length > 10 ? `\n... 외 ${failedMatches.length - 10}개` : ''}\n\n브라우저 콘솔(F12)에서 상세 로그를 확인하세요.`;
        alert(message);
      } else if (successCount > 0) {
        alert(`업데이트 완료: ${successCount}개 성공`);
      }

      // 초기화
      setParsedRows([]);
      setPastedData('');
    } catch (error) {
      alert('데이터 업데이트 중 오류가 발생했습니다: ' + (error as Error).message);
      setUploadStatus({ success: 0, failed: 0 });
    } finally {
      setIsUploading(false);
    }
  };

  // AI를 사용한 헤더 자동 매핑 함수
  const analyzeExcelWithAI = async (headers: string[], sampleRows: any[][]): Promise<{
    partName: number;
    partNumber: number;
    customerName: number;
    volumes: { [year: number]: number };
  } | null> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        console.warn('Gemini API 키가 없어 AI 분석을 건너뜁니다.');
        return null;
      }

      setIsAnalyzing(true);

      // 샘플 데이터 준비 (최대 5행)
      const sampleData = sampleRows.slice(0, 5).map((row, idx) => {
        const rowData: { [key: string]: any } = {};
        headers.forEach((header, colIdx) => {
          if (row[colIdx] !== undefined && row[colIdx] !== null) {
            rowData[header] = String(row[colIdx]);
          }
        });
        return rowData;
      });

      const prompt = `당신은 엑셀 파일 분석 전문가입니다. 다음 엑셀 파일의 헤더와 샘플 데이터를 분석하여 필요한 필드를 매핑해주세요.

[헤더 목록]
${headers.map((h, i) => `${i}: "${h}"`).join('\n')}

[샘플 데이터 (첫 5행)]
${JSON.stringify(sampleData, null, 2)}

[필요한 필드]
1. partName (부품명): 품명, 부품명, part name, partname 등
2. partNumber (부품번호): 품번, 부품번호, part number, partnumber, p/n 등
3. customerName (고객사명): 고객사, 고객사명, customer, customer name 등
4. volumes (년도별 수량): 2026, 2027, 2028, 2029, 2030, 2031, 2032년의 수량 데이터
   - 년도는 헤더에 "2026", "2027", "2028", "2029", "2030", "2031", "2032" 또는 "2026년", "2027년" 등의 형태로 표시됩니다.
   - 숫자만 있는 컬럼이 아니라 반드시 년도가 포함된 컬럼을 찾아주세요.

중요: volumes는 반드시 년도(2026-2032)가 헤더에 포함된 컬럼만 매핑하세요. 년도가 없는 컬럼은 null로 설정하세요.

다음 JSON 형식으로 응답해주세요 (컬럼 인덱스는 0부터 시작):
{
  "partName": 헤더_인덱스_번호,
  "partNumber": 헤더_인덱스_번호,
  "customerName": 헤더_인덱스_번호,
  "volumes": {
    "2026": 헤더_인덱스_번호_또는_null,
    "2027": 헤더_인덱스_번호_또는_null,
    "2028": 헤더_인덱스_번호_또는_null,
    "2029": 헤더_인덱스_번호_또는_null,
    "2030": 헤더_인덱스_번호_또는_null,
    "2031": 헤더_인덱스_번호_또는_null,
    "2032": 헤더_인덱스_번호_또는_null
  }
}

매핑할 수 없는 필드는 null로 설정하세요. JSON만 응답하고 다른 설명은 포함하지 마세요.`;

      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      const text = response.text || '';
      
      console.log('AI 분석 결과:', text);

      // JSON 추출 (마크다운 코드 블록 제거)
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const mapping = JSON.parse(jsonText);
      console.log('파싱된 매핑:', mapping);

      return mapping;
    } catch (error) {
      console.error('AI 분석 실패:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 엑셀 파일 파싱 및 업로드 기능 제거됨 - 붙여넣기 기능만 사용

  // 편집 모드 저장 처리
  const handleSaveEdit = async () => {
    setIsUploading(true);
    setUploadStatus(null);

    try {
      let successCount = 0;
      let failedCount = 0;

      for (const projectId in editData) {
        const project = filteredProjects.find(p => p.id === projectId);
        if (!project) continue;

        try {
          const updateData: Partial<Project> = {};
          
          // 프로젝트 정보 업데이트
          const projectInfo = editData[projectId];
          if (projectInfo.partName !== undefined) updateData.partName = projectInfo.partName;
          if (projectInfo.partNumber !== undefined) updateData.partNumber = projectInfo.partNumber;
          if (projectInfo.customerName !== undefined) updateData.customerName = projectInfo.customerName;
          if (projectInfo.material !== undefined) updateData.material = projectInfo.material;
          
          // 연도별 수량 업데이트
          years.forEach(year => {
            const volume = editData[projectId][year];
            if (volume !== undefined && volume !== null) {
              const volumeKey = `volume${year}` as keyof Project;
              updateData[volumeKey] = volume;
            }
          });

          if (Object.keys(updateData).length > 0) {
            await projectService.update(projectId, updateData);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to update project ${projectId}:`, error);
          failedCount++;
        }
      }

      setUploadStatus({ success: successCount, failed: failedCount });
      
      // 프로젝트 목록 새로고침
      if (onProjectsUpdate) {
        await onProjectsUpdate();
      }

      // 편집 모드 종료
      setIsEditMode(false);
      setEditData({});

      if (successCount > 0 || failedCount > 0) {
        alert(`${successCount}개 프로젝트 업데이트 완료${failedCount > 0 ? `, ${failedCount}개 실패` : ''}`);
      }
    } catch (error) {
      alert('저장 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  // 편집 데이터 업데이트
  const updateEditData = (projectId: string, year: number, value: number) => {
    setEditData(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [year]: value
      }
    }));
  };

  // 프로젝트 정보 업데이트
  const updateProjectInfo = (projectId: string, field: 'partName' | 'partNumber' | 'customerName' | 'material', value: string) => {
    setEditData(prev => {
      const updated = {
        ...prev,
        [projectId]: {
          ...prev[projectId],
          [field]: value
        }
      };
      
      // 품목이 변경되면 해당 품목의 재질 정보를 자동으로 설정
      if (field === 'partName') {
        const selectedPart = parts.find(p => p.partName === value);
        if (selectedPart) {
          updated[projectId] = {
            ...updated[projectId],
            material: selectedPart.material,
            partNumber: selectedPart.partNumber,
            customerName: selectedPart.customerName
          };
        }
      }
      
      return updated;
    });
  };

  // 엑셀 붙여넣기 처리 (편집 모드에서)
  const handlePasteInEditMode = (e: React.ClipboardEvent<HTMLTableElement>) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return;

    // 첫 번째 줄을 헤더로 간주
    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    
    // 헤더에서 연도 찾기
    const yearIndices: { [year: number]: number } = {};
    years.forEach(year => {
      const index = headers.findIndex(h => h.includes(String(year)));
      if (index !== -1) {
        yearIndices[year] = index;
      }
    });

    // 품명/품번 인덱스 찾기
    const partNameIndex = headers.findIndex(h => 
      h.includes('품명') || h.includes('partname') || h.includes('part name')
    );
    const partNumberIndex = headers.findIndex(h => 
      h.includes('품번') || h.includes('partnumber') || h.includes('part number') || h.includes('p/n')
    );

    // 데이터 행 처리
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      if (cells.length === 0) continue;

      const partName = partNameIndex !== -1 ? cells[partNameIndex]?.trim() : '';
      const partNumber = partNumberIndex !== -1 ? cells[partNumberIndex]?.trim() : '';

      if (!partName && !partNumber) continue;

      // 프로젝트 찾기
      const project = filteredProjects.find(p => {
        const nameMatch = partName && p.partName.toLowerCase().includes(partName.toLowerCase());
        const numberMatch = partNumber && p.partNumber.toLowerCase().includes(partNumber.toLowerCase());
        return nameMatch || numberMatch;
      });

      if (project) {
        // 연도별 데이터 업데이트
        Object.keys(yearIndices).forEach(yearStr => {
          const year = parseInt(yearStr);
          const index = yearIndices[year];
          if (index !== -1 && cells[index]) {
            const value = parseFloat(cells[index].replace(/,/g, '')) || 0;
            updateEditData(project.id, year, value);
          }
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{t.forecast.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.forecast.subtitle}</p>
            </div>
          </div>
          {/* 버튼 그룹 */}
          <div className="flex items-center gap-3">
            {!isEditMode ? (
              <>
                <button
                  onClick={() => {
                    setIsEditMode(true);
                    // 현재 프로젝트 데이터를 편집 데이터로 초기화
                    const initialData: { 
                      [projectId: string]: { 
                        [year: number]: number;
                        partName?: string;
                        partNumber?: string;
                        customerName?: string;
                        material?: string;
                      } 
                    } = {};
                    filteredProjects.forEach(project => {
                      initialData[project.id] = {
                        partName: project.partName,
                        partNumber: project.partNumber,
                        customerName: project.customerName,
                        material: project.material
                      };
                      years.forEach(year => {
                        initialData[project.id][year] = getVolumeForYear(project, year);
                      });
                    });
                    setEditData(initialData);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
                >
                  <Edit size={18} />
                  입력
                </button>
                <button
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    showPasteArea
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  <Clipboard size={18} />
                  {showPasteArea ? '붙여넣기 닫기' : '엑셀 붙여넣기'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isUploading
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      저장
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setEditData({});
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-slate-200 text-slate-700 hover:bg-slate-300"
                >
                  <X size={18} />
                  취소
                </button>
              </>
            )}
          </div>
        </div>

        {/* 붙여넣기 영역 */}
        {showPasteArea && (
          <div className="mb-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-indigo-300">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 mb-2">엑셀 데이터 붙여넣기</h3>
              <p className="text-sm text-slate-600">
                엑셀에서 데이터를 복사(Ctrl+C)한 후 아래 영역에 붙여넣기(Ctrl+V)하세요.
                <br />
                AI가 자동으로 헤더를 인식하고 데이터를 분석합니다.
              </p>
            </div>
            <textarea
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                setTimeout(() => handlePasteData(text), 100);
              }}
              placeholder="엑셀에서 데이터를 복사한 후 여기에 붙여넣으세요 (Ctrl+V)"
              className="w-full h-48 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => handlePasteData(pastedData)}
                disabled={!pastedData.trim() || isAnalyzing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  !pastedData.trim() || isAnalyzing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="animate-pulse" size={18} />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    AI 분석 시작
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setPastedData('');
                  setParsedRows([]);
                  setShowPasteArea(false);
                }}
                className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 파싱된 데이터 미리보기 */}
        {parsedRows.length > 0 && (
          <div className="mb-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                분석 완료: {parsedRows.length}개 행 발견
              </h3>
              <button
                onClick={handleUpdateFromPaste}
                disabled={isUploading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  isUploading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    업데이트 중...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    업데이트 적용
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold">품명</th>
                    <th className="px-4 py-2 text-left font-bold">품번</th>
                    <th className="px-4 py-2 text-left font-bold">고객사</th>
                    {years.map(year => (
                      <th key={year} className="px-4 py-2 text-center font-bold">{year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">{row.partName}</td>
                      <td className="px-4 py-2 font-mono">{row.partNumber}</td>
                      <td className="px-4 py-2">{row.customerName}</td>
                      {years.map(year => (
                        <td key={year} className="px-4 py-2 text-center">
                          {row.volumes[year] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 20 && (
                <p className="mt-2 text-sm text-slate-500 text-center">
                  ... 외 {parsedRows.length - 20}개 행 (최대 20개만 미리보기)
                </p>
              )}
            </div>
          </div>
        )}

        {/* 업로드 상태 메시지 */}
        {uploadStatus && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            uploadStatus.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            <CheckCircle2 size={20} />
            <div className="text-sm font-bold">
              {t.forecast.updateSuccess.replace('{count}', uploadStatus.success.toString())}
              {uploadStatus.failed > 0 && t.forecast.updateFailed.replace('{count}', uploadStatus.failed.toString())}
            </div>
          </div>
        )}

        {/* 검색 및 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t.forecast.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-slate-400" size={20} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Forecast 테이블 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {isEditMode && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-200">
            <p className="text-sm text-indigo-700 font-bold">
              💡 편집 모드: 엑셀에서 데이터를 복사(Ctrl+C)한 후 표에 붙여넣기(Ctrl+V)하거나 직접 입력하세요.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table 
            className="w-full"
            onPaste={isEditMode ? handlePasteInEditMode : undefined}
          >
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold sticky left-0 bg-slate-900 z-10">{t.forecast.partName}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.forecast.partNumber}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.forecast.customerName}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.forecast.material}</th>
                {years.map(year => (
                  <th key={year} className={`px-6 py-4 text-center text-sm font-bold ${selectedYear === year ? 'bg-indigo-600' : ''}`}>
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 && !isEditMode ? (
                <tr>
                  <td colSpan={4 + years.length} className="px-6 py-12 text-center text-slate-400">
                    <Package className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="font-bold">{t.forecast.noResults}</p>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 && isEditMode ? (
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm sticky left-0 bg-white z-10">
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-bold bg-white"
                      defaultValue=""
                    >
                      <option value="">품목 선택</option>
                      {parts.length > 0 ? (
                        parts.map(part => (
                          <option key={part.id} value={part.partName}>
                            {part.partName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>부품 데이터 로딩 중...</option>
                      )}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <input
                      type="text"
                      placeholder="품번"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <input
                      type="text"
                      placeholder="고객사명"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <input
                      type="text"
                      placeholder="재질"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </td>
                  {years.map(year => (
                    <td key={year} className={`px-6 py-4 text-center ${selectedYear === year ? 'bg-indigo-50' : ''}`}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        className="w-28 px-3 py-2 text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-bold"
                      />
                    </td>
                  ))}
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm sticky left-0 bg-white z-10">
                      {isEditMode ? (
                        <select
                          value={editData[project.id]?.partName ?? project.partName}
                          onChange={(e) => updateProjectInfo(project.id, 'partName', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-bold bg-white"
                        >
                          <option value={project.partName}>{project.partName}</option>
                          {parts.length > 0 ? (
                            parts.map(part => (
                              <option key={part.id} value={part.partName}>
                                {part.partName}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>부품 데이터 로딩 중...</option>
                          )}
                        </select>
                      ) : (
                        <span className="font-bold text-slate-900">{project.partName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editData[project.id]?.partNumber ?? project.partNumber}
                          onChange={(e) => updateProjectInfo(project.id, 'partNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
                        />
                      ) : (
                        <span className="text-slate-600 font-mono">{project.partNumber}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editData[project.id]?.customerName ?? project.customerName}
                          onChange={(e) => updateProjectInfo(project.id, 'customerName', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      ) : (
                        <span className="text-slate-700">{project.customerName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editData[project.id]?.material ?? project.material}
                          onChange={(e) => updateProjectInfo(project.id, 'material', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          readOnly
                        />
                      ) : (
                        <span className="text-slate-700">{project.material}</span>
                      )}
                    </td>
                    {years.map(year => {
                      if (isEditMode) {
                        return (
                          <td key={year} className={`px-6 py-4 text-center ${selectedYear === year ? 'bg-indigo-50' : ''}`}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editData[project.id]?.[year] ?? getVolumeForYear(project, year)}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                updateEditData(project.id, year, value);
                              }}
                              className="w-28 px-3 py-2 text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-bold"
                              placeholder="0"
                            />
                          </td>
                        );
                      }
                      const volume = getVolumeForYear(project, year);
                      return (
                        <td key={year} className={`px-6 py-4 text-center text-sm font-bold ${selectedYear === year ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}>
                          {volume.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
              {/* 합계 행 */}
              {filteredProjects.length > 0 && (
                <tr className="bg-slate-900 text-white font-black">
                  <td colSpan={4} className="px-6 py-4 text-sm sticky left-0 bg-slate-900 z-10">{t.forecast.total}</td>
                  {years.map(year => {
                    const total = isEditMode 
                      ? filteredProjects.reduce((sum, project) => {
                          const volume = editData[project.id]?.[year] ?? getVolumeForYear(project, year);
                          return sum + volume;
                        }, 0)
                      : getTotalVolumeForYear(year);
                    return (
                      <td key={year} className={`px-6 py-4 text-center text-sm ${selectedYear === year ? 'bg-indigo-600' : ''}`}>
                        {total.toLocaleString()}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Forecast;

