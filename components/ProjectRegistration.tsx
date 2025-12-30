
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, ProjectType } from '../types';
import { Save, RefreshCw, ClipboardCheck, Upload, FileSpreadsheet, X } from 'lucide-react';
import { settingsService, Customer, Material } from '../src/api/services/settingsService';

interface Props {
  onAddProject: (project: Project) => void;
  onNavigateToManagement: () => void;
}

const ProjectRegistration: React.FC<Props> = ({ onAddProject, onNavigateToManagement }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    customerName: '',
    carModel: '',
    partName: '',
    partNumber: '',
    moldCavity: 2,
    sopDate: '',
    material: 'ALDC12',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.NEW_DEVELOPMENT
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedProjects, setUploadedProjects] = useState<Project[]>([]);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  
  // 드롭다운 목록
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  // 설정 데이터 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [customersData, materialsData] = await Promise.all([
          settingsService.getCustomers(),
          settingsService.getMaterials()
        ]);
        setCustomers(customersData);
        setMaterials(materialsData);
        
        // 기본값 설정
        if (customersData.length > 0 && !formData.customerName) {
          setFormData({ ...formData, customerName: customersData[0].name });
        }
        if (materialsData.length > 0 && !formData.material) {
          setFormData({ ...formData, material: materialsData[0].code });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // 엑셀 파일 파싱 함수
  const parseExcelFile = (file: File): Promise<Project[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        // 동적 import로 xlsx 라이브러리 로드
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

          // 헤더 행 찾기 (첫 번째 행이 헤더)
          const headers = jsonData[0]?.map((h: any) => String(h).toLowerCase().trim()) || [];
          
          // 헤더 매핑 (다양한 형식 지원)
          const getColumnIndex = (possibleNames: string[]) => {
            for (const name of possibleNames) {
              const index = headers.findIndex(h => h.includes(name));
              if (index !== -1) return index;
            }
            return -1;
          };

          const projects: Project[] = [];
          
          // 데이터 행 처리 (헤더 제외)
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.every(cell => !cell)) continue; // 빈 행 건너뛰기

            const customerName = row[getColumnIndex(['고객사', 'customer', '고객'])] || '';
            const carModel = row[getColumnIndex(['차종', 'carmodel', 'car', '모델'])] || '';
            const partName = row[getColumnIndex(['부품명', 'partname', 'part', '품명'])] || '';
            const partNumber = row[getColumnIndex(['부품번호', 'partnumber', 'p/n', '품번'])] || '';
            const moldCavity = parseInt(row[getColumnIndex(['캐비티', 'cavity', 'cavity수'])] || '2') || 2;
            const material = String(row[getColumnIndex(['재질', 'material', '소재'])] || 'ALDC12').toUpperCase();
            const sopDate = row[getColumnIndex(['sop', 'sop일자', '양산일', 'sopdate'])] || '';
            const typeStr = String(row[getColumnIndex(['형태', 'type', '프로젝트형태', '유형'])] || '신규').toLowerCase();
            const statusStr = String(row[getColumnIndex(['상태', 'status', '진행상태'])] || '진행중').toLowerCase();

            // 필수 필드 확인
            if (!customerName || !carModel || !partName || !partNumber || !sopDate) {
              continue; // 필수 필드가 없으면 건너뛰기
            }

            // 프로젝트 형태 변환
            let type = ProjectType.NEW_DEVELOPMENT;
            if (typeStr.includes('증작') || typeStr.includes('incremental') || typeStr.includes('증량')) {
              type = ProjectType.INCREMENTAL_MOLD;
            }

            // 상태 변환
            let status = ProjectStatus.IN_PROGRESS;
            if (statusStr.includes('완료') || statusStr.includes('complete') || statusStr.includes('종료')) {
              status = ProjectStatus.COMPLETED;
            } else if (statusStr.includes('대기') || statusStr.includes('pending') || statusStr.includes('보류')) {
              status = ProjectStatus.PENDING;
            }

            // SOP 날짜 형식 변환 (엑셀 날짜 숫자 또는 문자열)
            let formattedSopDate = sopDate;
            if (typeof sopDate === 'number') {
              // 엑셀 날짜 숫자를 변환
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + sopDate * 86400000);
              formattedSopDate = date.toISOString().split('T')[0];
            } else if (typeof sopDate === 'string') {
              // 문자열 날짜 형식 정리
              formattedSopDate = sopDate.replace(/\//g, '-').split(' ')[0];
            }

            const project: Project = {
              id: `proj-${Date.now()}-${i}`,
              customerName: String(customerName).trim(),
              carModel: String(carModel).trim(),
              partName: String(partName).trim(),
              partNumber: String(partNumber).trim(),
              moldCavity: moldCavity,
              sopDate: formattedSopDate,
              material: material,
              type: type,
              status: status,
              createdAt: new Date().toISOString()
            };

            projects.push(project);
          }

          resolve(projects);
        } catch (error) {
          reject(new Error('엑셀 파일 파싱 중 오류가 발생했습니다: ' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(new Error('xlsx 라이브러리 로드 실패: ' + (error as Error).message));
      }
    });
  };

  // 엑셀 파일 업로드 처리
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    try {
      const projects = await parseExcelFile(file);
      if (projects.length === 0) {
        alert('엑셀 파일에서 유효한 프로젝트 데이터를 찾을 수 없습니다.\n\n필수 컬럼: 고객사명, 차종, 부품명, 부품번호, SOP일자');
        setIsUploading(false);
        return;
      }
      setUploadedProjects(projects);
      setShowUploadPreview(true);
    } catch (error) {
      alert('파일 처리 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // 파일 입력 초기화
    }
  };

  // 업로드된 프로젝트 일괄 등록
  const handleBulkRegister = async () => {
    if (uploadedProjects.length === 0) return;

    setIsSubmitting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const project of uploadedProjects) {
        try {
          await onAddProject(project);
          successCount++;
        } catch (error) {
          console.error('프로젝트 등록 실패:', project.partName, error);
          failCount++;
        }
      }

      alert(`${successCount}개 프로젝트가 성공적으로 등록되었습니다.${failCount > 0 ? `\n${failCount}개 등록 실패.` : ''}`);
      setUploadedProjects([]);
      setShowUploadPreview(false);
      onNavigateToManagement();
    } catch (error) {
      alert('일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      const newProject: Project = {
        ...formData as Project,
        id: `proj-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      onAddProject(newProject);
      setIsSubmitting(false);
      alert('신규 프로젝트가 성공적으로 등록되었습니다.');
      onNavigateToManagement();
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 엑셀 업로드 섹션 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-white" size={24} />
              <div>
                <h2 className="text-xl font-bold tracking-tight">엑셀 파일 일괄 등록</h2>
                <p className="text-xs text-indigo-100 mt-1">엑셀 파일을 업로드하여 여러 프로젝트를 한 번에 등록하세요</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-8">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="excel-upload"
              className={`cursor-pointer flex flex-col items-center gap-4 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="animate-spin text-indigo-600" size={48} />
                  <p className="text-slate-600 font-bold">파일 처리 중...</p>
                </>
              ) : (
                <>
                  <div className="bg-indigo-100 p-4 rounded-full">
                    <Upload className="text-indigo-600" size={32} />
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-lg">엑셀 파일 업로드</p>
                    <p className="text-slate-500 text-sm mt-1">.xlsx 또는 .xls 파일을 선택하세요</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-left text-xs text-slate-600 max-w-md">
                    <p className="font-bold mb-2">필수 컬럼:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>고객사명 (또는 Customer)</li>
                      <li>차종 (또는 Car Model)</li>
                      <li>부품명 (또는 Part Name)</li>
                      <li>부품번호 (또는 Part Number)</li>
                      <li>SOP일자 (또는 SOP Date)</li>
                    </ul>
                    <p className="font-bold mt-3 mb-2">선택 컬럼:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>금형캐비티수 (기본값: 2)</li>
                      <li>재질 (기본값: ALDC12)</li>
                      <li>프로젝트형태 (신규/증작, 기본값: 신규)</li>
                      <li>상태 (진행중/완료/대기, 기본값: 진행중)</li>
                    </ul>
                  </div>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* 업로드 미리보기 모달 */}
      {showUploadPreview && uploadedProjects.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} />
                <div>
                  <h3 className="text-lg font-bold">업로드된 프로젝트 미리보기</h3>
                  <p className="text-xs text-slate-400">총 {uploadedProjects.length}개 프로젝트</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadPreview(false);
                  setUploadedProjects([]);
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {uploadedProjects.map((project, index) => (
                  <div key={index} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">고객사</p>
                        <p className="font-bold text-slate-900">{project.customerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">차종</p>
                        <p className="font-bold text-slate-900">{project.carModel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">부품명</p>
                        <p className="font-bold text-slate-900">{project.partName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">부품번호</p>
                        <p className="font-bold text-slate-900">{project.partNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadPreview(false);
                  setUploadedProjects([]);
                }}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBulkRegister}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {uploadedProjects.length}개 프로젝트 등록
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수동 입력 폼 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight">프로젝트 기술 사양서 입력</h2>
          </div>
          <p className="text-xs text-slate-400 font-mono">양식: APQP-F01-KO</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">프로젝트 형태</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: ProjectType.NEW_DEVELOPMENT})}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.type === ProjectType.NEW_DEVELOPMENT 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  신규 개발 프로젝트
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, type: ProjectType.INCREMENTAL_MOLD})}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.type === ProjectType.INCREMENTAL_MOLD 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  증작 금형 프로젝트
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">고객사명</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              >
                <option value="">고객사 선택</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">차종</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) EV9, 아이오닉 6..."
                value={formData.carModel}
                onChange={(e) => setFormData({...formData, carModel: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">부품명 (Die-casting)</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) 실린더 블록, 하우징 케이스..."
                value={formData.partName}
                onChange={(e) => setFormData({...formData, partName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">부품 번호 (P/N)</label>
              <input 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="예) 24001-XXXX-00"
                value={formData.partNumber}
                onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">금형 캐비티 수 (Cavity)</label>
              <input 
                required
                type="number"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                value={formData.moldCavity}
                onChange={(e) => setFormData({...formData, moldCavity: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">재질 선정</label>
              <select 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                value={formData.material}
                onChange={(e) => setFormData({...formData, material: e.target.value})}
              >
                <option value="">재질 선택</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.code}>
                    {material.name} ({material.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">SOP (양산 개시일)</label>
              <input 
                required
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                value={formData.sopDate}
                onChange={(e) => setFormData({...formData, sopDate: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
              {isSubmitting ? '저장 중...' : '프로젝트 등록 완료'}
            </button>
            <button 
              type="reset" 
              className="px-8 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              onClick={() => setFormData({})}
            >
              내용 초기화
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectRegistration;
