import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../src/api/services/projectService';
import { TrendingUp, Calendar, Package, Search, Upload, FileSpreadsheet, RefreshCw, CheckCircle2, Sparkles, Clipboard, Check } from 'lucide-react';
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

  useEffect(() => {
    const filtered = projects.filter(project => {
      const matchesSearch = 
        project.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.carModel.toLowerCase().includes(searchTerm.toLowerCase());
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

  // 엑셀 파일 파싱 함수 (AI 기반)
  const parseExcelFile = async (file: File): Promise<ExcelRow[]> => {
    try {
      const XLSX = await import('xlsx');
      
      // 파일을 먼저 읽기
      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
      });

      const data = new Uint8Array(fileData);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];

      console.log('Raw Excel data:', jsonData);
      console.log('First few rows:', jsonData.slice(0, 5));

      // 실제 헤더 행 찾기 (첫 번째 행이 제목일 수 있음)
      let headerRowIndex = 0;
      let headers: string[] = [];
      
      // 첫 5행을 확인하여 가장 많은 비어있지 않은 셀을 가진 행을 헤더로 간주
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        const nonEmptyCells = row.filter(cell => {
          const value = cell === null || cell === undefined ? '' : String(cell).trim();
          return value !== '';
        }).length;
        
        // 비어있지 않은 셀이 3개 이상이고, "년도", "volume", "수량" 등의 키워드가 포함된 행을 헤더로 간주
        const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
        const hasHeaderKeywords = /품명|품번|부품|part|customer|고객|년도|year|volume|수량|202[0-9]/.test(rowText);
        
        if (nonEmptyCells >= 3 && (hasHeaderKeywords || i === 0)) {
          headerRowIndex = i;
          headers = row.map((h: any) => {
            if (h === null || h === undefined) return '';
            return String(h).toLowerCase().trim();
          });
          break;
        }
      }
      
      // 헤더를 찾지 못한 경우 첫 번째 행 사용
      if (headers.length === 0 && jsonData[0]) {
        headers = jsonData[0].map((h: any) => {
          if (h === null || h === undefined) return '';
          return String(h).toLowerCase().trim();
        });
      }
      
      console.log(`Header row index: ${headerRowIndex}`);
      console.log('Normalized headers:', headers);
      console.log('All header values:', jsonData[headerRowIndex]);
      
      // AI를 사용한 헤더 자동 매핑 시도
      let aiMapping: {
        partName: number | null;
        partNumber: number | null;
        customerName: number | null;
        volumes: { [year: number]: number | null };
      } | null = null;

      // 샘플 데이터 준비 (헤더 행 다음부터 최대 10행)
      const sampleRows = jsonData.slice(headerRowIndex + 1, headerRowIndex + 11).filter(row => row && row.length > 0);
      
      if (sampleRows.length > 0) {
        console.log('AI 분석 시작...');
        aiMapping = await analyzeExcelWithAI(headers, sampleRows);
        if (aiMapping) {
          console.log('AI 매핑 결과:', aiMapping);
        }
      }

            // 폴백: 기존 헤더 매핑 로직
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
                if (index !== -1) {
                  console.log(`Found column "${name}" at index ${index} (header: "${headers[index]}")`);
                  return index;
                }
              }
              return -1;
            };

            // AI 매핑 또는 폴백 매핑 사용
            const getPartNameIndex = () => {
              if (aiMapping && aiMapping.partName !== null && aiMapping.partName !== undefined) {
                return aiMapping.partName;
              }
              return getColumnIndex([
                '부품명', 'partname', 'part', '품명', 'part name', 
                '품목명', 'item name', 'itemname', '품목', 'item', '부품'
              ]);
            };

            const getPartNumberIndex = () => {
              if (aiMapping && aiMapping.partNumber !== null && aiMapping.partNumber !== undefined) {
                return aiMapping.partNumber;
              }
              return getColumnIndex([
                '부품번호', 'partnumber', 'p/n', '품번', 'part number', 'part no',
                'partno', 'part_no', 'part-number', '품목번호', 'item number', 'pn', 'p#'
              ]);
            };

            const getCustomerNameIndex = () => {
              if (aiMapping && aiMapping.customerName !== null && aiMapping.customerName !== undefined) {
                return aiMapping.customerName;
              }
              return getColumnIndex([
                '고객사', 'customer', '고객사명', 'customer name', 'customername',
                'customer_name', 'customer-name', '고객', 'client', 'client name'
              ]);
            };

            const getYearIndex = (year: number) => {
              if (aiMapping && aiMapping.volumes[year] !== null && aiMapping.volumes[year] !== undefined) {
                return aiMapping.volumes[year] as number;
              }
              return getColumnIndex([`${year}`, `${year}년`, `${year} year`, `year ${year}`]);
            };

            const rows: ExcelRow[] = [];
            
            // 데이터 행 처리 (헤더 행 다음부터)
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.length === 0) continue;
              
              // 빈 행 체크
              const isEmptyRow = row.every(cell => {
                const cellValue = cell === null || cell === undefined ? '' : String(cell).trim();
                return cellValue === '';
              });
              if (isEmptyRow) continue;

              const partNameIndex = getPartNameIndex();
              const partNumberIndex = getPartNumberIndex();
              const customerNameIndex = getCustomerNameIndex();
              
              // 첫 번째 데이터 행에서 인덱스 로그
              if (i === 1) {
                console.log('Column indices found:', {
                  partName: partNameIndex,
                  partNumber: partNumberIndex,
                  customerName: customerNameIndex,
                  usingAI: !!aiMapping
                });
              }

              const partName = partNameIndex !== -1 && row[partNameIndex] !== undefined && row[partNameIndex] !== null
                ? String(row[partNameIndex] || '').trim() 
                : '';
              const partNumber = partNumberIndex !== -1 && row[partNumberIndex] !== undefined && row[partNumberIndex] !== null
                ? String(row[partNumberIndex] || '').trim()
                : '';
              const customerName = customerNameIndex !== -1 && row[customerNameIndex] !== undefined && row[customerNameIndex] !== null
                ? String(row[customerNameIndex] || '').trim()
                : '';

              // 필수 필드 확인
              if (!partName || !partNumber || !customerName) {
                if (i <= 3) { // 처음 몇 행만 로그
                  console.log(`Row ${i}: partName="${partName}", partNumber="${partNumber}", customerName="${customerName}"`);
                }
                continue;
              }

              // 년도별 수량 추출
              const volumes: { [year: number]: number } = {};
              years.forEach(year => {
                const yearIndex = getYearIndex(year);
                if (yearIndex !== -1 && row[yearIndex] !== null && row[yearIndex] !== undefined) {
                  const value = row[yearIndex];
                  const numValue = typeof value === 'number' ? value : parseFloat(String(value || '0')) || 0;
                  volumes[year] = Math.max(0, numValue);
                }
              });

              rows.push({
                partName,
                partNumber,
                customerName,
                volumes
              });
            }

      console.log('Parsed rows:', rows);
      
      // 파싱된 행이 없고 헤더는 있는 경우 경고
      if (rows.length === 0 && headers.length > 0) {
        console.warn('No data rows parsed. Available headers:', headers);
        console.warn('Please check if your Excel file has the correct column names.');
        console.warn('Expected columns: 부품명/partname, 부품번호/partnumber, 고객사/customer');
      }
      
      return rows;
    } catch (error) {
      throw new Error('xlsx 라이브러리 로드 실패: ' + (error as Error).message);
    }
  };

  // 엑셀 파일 업로드 처리
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const excelRows = await parseExcelFile(file);
      console.log('Parsed Excel rows:', excelRows);
      console.log('Current projects:', projects);
      
      if (excelRows.length === 0) {
        alert('엑셀 파일에서 데이터를 읽을 수 없습니다.\n\n필수 컬럼: 부품명, 부품번호, 고객사명\n\n브라우저 콘솔(F12)에서 상세 로그를 확인하세요.');
        setIsUploading(false);
        return;
      }
      
      // 프로젝트 매칭 및 업데이트
      let successCount = 0;
      let failedCount = 0;
      const failedMatches: string[] = [];

      for (const row of excelRows) {
        // 품명, 품번, 고객사명으로 프로젝트 찾기 (대소문자 무시, 공백 제거)
        const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, '');
        
        const matchingProject = projects.find(p => {
          const partNameMatch = normalize(p.partName) === normalize(row.partName);
          const partNumberMatch = normalize(p.partNumber) === normalize(row.partNumber);
          const customerMatch = normalize(p.customerName) === normalize(row.customerName);
          return partNameMatch && partNumberMatch && customerMatch;
        });

        if (matchingProject) {
          try {
            // volume 필드만 업데이트
            const updateData: Partial<Project> = {};
            years.forEach(year => {
              if (row.volumes[year] !== undefined && row.volumes[year] !== null) {
                const volumeKey = `volume${year}` as keyof Project;
                updateData[volumeKey] = row.volumes[year];
              }
            });

            if (Object.keys(updateData).length > 0) {
              console.log(`Updating project ${matchingProject.id} with volumes:`, updateData);
              await projectService.updateVolumes(matchingProject.id, updateData);
              successCount++;
            } else {
              console.warn(`No volume data to update for project ${matchingProject.id}`);
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
          console.warn('No matching project found for:', row);
        }
      }

      console.log(`Update complete: ${successCount} success, ${failedCount} failed`);
      if (failedMatches.length > 0) {
        console.log('Failed matches:', failedMatches);
      }

      setUploadStatus({ success: successCount, failed: failedCount });
      
      // 프로젝트 목록 새로고침
      if (onProjectsUpdate) {
        await onProjectsUpdate();
      }

      // 파일 입력 초기화
      e.target.value = '';
    } catch (error) {
      alert('엑셀 파일 처리 중 오류가 발생했습니다: ' + (error as Error).message);
      setUploadStatus({ success: 0, failed: 0 });
    } finally {
      setIsUploading(false);
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
          {/* 엑셀 업로드 및 붙여넣기 버튼 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasteArea(!showPasteArea)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                showPasteArea
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              <Clipboard size={18} />
              {showPasteArea ? '붙여넣기 닫기' : '엑셀 붙여넣기'}
            </button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="forecast-excel-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="forecast-excel-upload"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                isUploading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
              }`}
            >
              {isUploading || isAnalyzing ? (
                <>
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="animate-pulse" size={18} />
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      {t.forecast.uploading}
                    </>
                  )}
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  {t.forecast.uploadExcel}
                </>
              )}
            </label>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold sticky left-0 bg-slate-900 z-10">{t.forecast.partName}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.forecast.partNumber}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.forecast.customerName}</th>
                <th className="px-6 py-4 text-left text-sm font-bold">{t.forecast.carModel}</th>
                {years.map(year => (
                  <th key={year} className={`px-6 py-4 text-center text-sm font-bold ${selectedYear === year ? 'bg-indigo-600' : ''}`}>
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={4 + years.length} className="px-6 py-12 text-center text-slate-400">
                    <Package className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="font-bold">{t.forecast.noResults}</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 sticky left-0 bg-white z-10">{project.partName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{project.partNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{project.customerName}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{project.carModel}</td>
                    {years.map(year => {
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
                    const total = getTotalVolumeForYear(year);
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

