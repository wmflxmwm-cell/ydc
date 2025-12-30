import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../src/api/services/projectService';
import { TrendingUp, Calendar, Package, Search, Upload, FileSpreadsheet, RefreshCw, CheckCircle2 } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: number; failed: number } | null>(null);

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

  // 엑셀 파일 파싱 함수
  const parseExcelFile = async (file: File): Promise<ExcelRow[]> => {
    try {
      const XLSX = await import('xlsx');
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

            // 헤더 행 찾기
            const headers = jsonData[0]?.map((h: any) => String(h).toLowerCase().trim()) || [];
            
            // 헤더 매핑
            const getColumnIndex = (possibleNames: string[]) => {
              for (const name of possibleNames) {
                const index = headers.findIndex(h => h.includes(name));
                if (index !== -1) return index;
              }
              return -1;
            };

            const rows: ExcelRow[] = [];
            
            // 데이터 행 처리
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.every(cell => !cell)) continue;

              const partName = String(row[getColumnIndex(['부품명', 'partname', 'part', '품명', 'part name'])] || '').trim();
              const partNumber = String(row[getColumnIndex(['부품번호', 'partnumber', 'p/n', '품번', 'part number', 'part no'])] || '').trim();
              const customerName = String(row[getColumnIndex(['고객사', 'customer', '고객사명', 'customer name'])] || '').trim();

              // 필수 필드 확인
              if (!partName || !partNumber || !customerName) {
                continue;
              }

              // 년도별 수량 추출
              const volumes: { [year: number]: number } = {};
              years.forEach(year => {
                const yearIndex = getColumnIndex([`${year}`, `${year}년`, `${year} year`, `year ${year}`]);
                if (yearIndex !== -1) {
                  const value = row[yearIndex];
                  volumes[year] = typeof value === 'number' ? value : parseInt(String(value || '0')) || 0;
                }
              });

              rows.push({
                partName,
                partNumber,
                customerName,
                volumes
              });
            }

            resolve(rows);
          } catch (error) {
            reject(new Error('엑셀 파일 파싱 중 오류가 발생했습니다: ' + (error as Error).message));
          }
        };
        
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
      });
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
      
      // 프로젝트 매칭 및 업데이트
      let successCount = 0;
      let failedCount = 0;

      for (const row of excelRows) {
        // 품명, 품번, 고객사명으로 프로젝트 찾기
        const matchingProject = projects.find(
          p => p.partName === row.partName && 
               p.partNumber === row.partNumber && 
               p.customerName === row.customerName
        );

        if (matchingProject) {
          try {
            // volume 필드만 업데이트
            const updateData: Partial<Project> = {};
            years.forEach(year => {
              if (row.volumes[year] !== undefined) {
                const volumeKey = `volume${year}` as keyof Project;
                updateData[volumeKey] = row.volumes[year];
              }
            });

            await projectService.updateVolumes(matchingProject.id, updateData);
            successCount++;
          } catch (error) {
            console.error(`Failed to update project ${matchingProject.id}:`, error);
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }

      setUploadStatus({ success: successCount, failed: failedCount });
      
      // 프로젝트 목록 새로고침
      if (onProjectsUpdate) {
        onProjectsUpdate();
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
              <h2 className="text-2xl font-black text-slate-900">아이템별 Forecast</h2>
              <p className="text-sm text-slate-500 mt-1">프로젝트별 연도별 생산량 예측</p>
            </div>
          </div>
          {/* 엑셀 업로드 버튼 */}
          <div className="flex items-center gap-3">
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
              {isUploading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  처리 중...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  엑셀 파일 등록
                </>
              )}
            </label>
          </div>
        </div>

        {/* 업로드 상태 메시지 */}
        {uploadStatus && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            uploadStatus.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            <CheckCircle2 size={20} />
            <div className="text-sm font-bold">
              {uploadStatus.success}개 프로젝트 업데이트 완료
              {uploadStatus.failed > 0 && `, ${uploadStatus.failed}개 실패`}
            </div>
          </div>
        )}

        {/* 검색 및 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="부품명, 부품번호, 고객사명, 차종으로 검색..."
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
                <th className="px-6 py-4 text-left text-sm font-bold sticky left-0 bg-slate-900 z-10">부품명</th>
                <th className="px-6 py-4 text-left text-sm font-bold">부품번호</th>
                <th className="px-6 py-4 text-left text-sm font-bold">고객사명</th>
                <th className="px-6 py-4 text-left text-sm font-bold">차종</th>
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
                    <p className="font-bold">검색 결과가 없습니다</p>
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
                  <td colSpan={4} className="px-6 py-4 text-sm sticky left-0 bg-slate-900 z-10">합계</td>
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

