
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, ProjectType } from '../types';
import { Save, RefreshCw, ClipboardCheck, Upload, FileSpreadsheet, X } from 'lucide-react';
import { settingsService, Customer, Material } from '../src/api/services/settingsService';
import { projectService } from '../src/api/services/projectService';
import { getTranslations } from '../src/utils/translations';

interface Props {
  onAddProject: (project: Project) => void;
  onNavigateToManagement: () => void;
  activeTab: string;
}

const ProjectRegistration: React.FC<Props> = ({ onAddProject, onNavigateToManagement, activeTab }) => {
  const t = getTranslations();
  const [formData, setFormData] = useState<Partial<Project>>({
    customerName: '',
    carModel: '',
    partName: '',
    partNumber: '',
    moldCavity: 2,
    sopDate: '',
    material: 'ALDC12',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.NEW_DEVELOPMENT,
    fotDate: '',
    faiDate: '',
    p1Date: '',
    p2Date: '',
    runAtRateDate: '',
    ppapDate: '',
    customerSopDate: '',
    volume2026: undefined,
    volume2027: undefined,
    volume2028: undefined,
    volume2029: undefined,
    volume2030: undefined,
    volume2031: undefined,
    volume2032: undefined,
    // 증작 금형 프로젝트 전용 필드
    developmentPhase: '',
    feasibilityReviewPlan: '',
    feasibilityReviewActual: '',
    moldOrderPlan: '',
    moldOrderActual: '',
    moldDeliveryPlan: '',
    moldDeliveryActual: '',
    istrSubmissionPlan: '',
    istrSubmissionActual: '',
    ydcVnPpapPlan: '',
    ydcVnPpapActual: '',
    ppapKrSubmissionPlan: '',
    ppapKrSubmissionActual: '',
    ppapCustomerApprovalPlan: '',
    ppapCustomerApprovalActual: '',
    ydcVnSopPlan: '',
    ydcVnSopActual: '',
    customerSopPlan: '',
    customerSopActual: '',
    deliverySchedulePlan: '',
    deliveryScheduleActual: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedProjects, setUploadedProjects] = useState<Project[]>([]);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  
  // 드롭다운 목록
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);

  // 설정 데이터 로드 함수
  const loadSettings = async () => {
    try {
      const [customersData, materialsData, projectsData] = await Promise.all([
        settingsService.getCustomers(),
        settingsService.getMaterials(),
        projectService.getAll()
      ]);
      setCustomers(customersData);
      setMaterials(materialsData);
      setExistingProjects(projectsData);
      
      // 기본값 설정 (현재 선택된 값이 없을 때만, type은 절대 변경하지 않음)
      setFormData(prev => {
        // type을 명시적으로 보존
        const currentType = prev.type || ProjectType.NEW_DEVELOPMENT;
        // 실제로 변경이 필요한 경우에만 업데이트
        const needsUpdate = 
          (customersData.length > 0 && !prev.customerName) ||
          (materialsData.length > 0 && !prev.material) ||
          !prev.type;
        
        if (!needsUpdate) {
          return prev; // 변경이 없으면 이전 상태 반환
        }
        
        const updated = { ...prev, type: currentType }; // type 명시적으로 보존
        // type은 절대 변경하지 않음
        if (customersData.length > 0 && !updated.customerName) {
          updated.customerName = customersData[0].name;
        }
        if (materialsData.length > 0 && !updated.material) {
          updated.material = materialsData[0].code;
        }
        return updated;
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // 초기 로드 및 실시간 업데이트
  useEffect(() => {
    // 초기 로드
    loadSettings();

    // 윈도우 포커스 시 데이터 다시 불러오기
    const handleFocus = () => {
      loadSettings();
    };

    // 페이지 가시성 변경 시 데이터 다시 불러오기
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSettings();
      }
    };

    // 주기적으로 데이터 갱신 (10초마다 - 더 빠른 업데이트)
    const intervalId = setInterval(() => {
      loadSettings();
    }, 10000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // 탭이 활성화될 때마다 데이터 다시 불러오기
  useEffect(() => {
    if (activeTab === 'registration') {
      loadSettings();
    }
  }, [activeTab]);

  // 프로젝트 형태 변경 시 부품명 초기화 (증작 금형으로 변경 시)
  useEffect(() => {
    if (formData.type === ProjectType.INCREMENTAL_MOLD && formData.partName && !existingProjects.find(p => p.partName === formData.partName && p.type === ProjectType.NEW_DEVELOPMENT)) {
      // 증작 금형으로 변경했는데 선택된 부품명이 신규 개발 프로젝트가 아니면 초기화
      setFormData(prev => ({
        ...prev,
        partName: '',
        partNumber: '',
        carModel: '',
        customerName: prev.customerName || '',
        material: prev.material || 'ALDC12'
      }));
    }
  }, [formData.type, existingProjects]);

  // 엑셀 파일 파싱 함수
  const parseExcelFile = async (file: File): Promise<Project[]> => {
    try {
      // 동적 import로 xlsx 라이브러리 로드
      const XLSX = await import('xlsx');
      
      return new Promise((resolve, reject) => {
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
      });
    } catch (error) {
      throw new Error('xlsx 라이브러리 로드 실패: ' + (error as Error).message);
    }
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
    <div className="max-w-7xl mx-auto">
      <div className={`grid grid-cols-1 gap-6 ${formData.type === ProjectType.NEW_DEVELOPMENT ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* 왼쪽: 수동 입력 폼 */}
        <div className={formData.type === ProjectType.NEW_DEVELOPMENT ? 'lg:col-span-2' : 'lg:col-span-1'}>

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
            <h2 className="text-xl font-bold tracking-tight">{t.registration.title}</h2>
          </div>
          <p className="text-xs text-slate-400 font-mono">{t.registration.formNumber}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{t.registration.projectType}</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, type: ProjectType.NEW_DEVELOPMENT});
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.type === ProjectType.NEW_DEVELOPMENT 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {t.registration.newDevelopment}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, type: ProjectType.INCREMENTAL_MOLD});
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    formData.type === ProjectType.INCREMENTAL_MOLD 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {t.registration.incrementalMold}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.registration.customerName}</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                disabled={formData.type === ProjectType.INCREMENTAL_MOLD}
              >
                <option value="">{t.registration.selectCustomer}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.registration.carModel}</label>
              {formData.type === ProjectType.INCREMENTAL_MOLD ? (
                <input 
                  required
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed text-sm"
                  placeholder={t.registration.autoFillNote}
                  value={formData.carModel}
                />
              ) : (
                <input 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="예) EV9, 아이오닉 6..."
                  value={formData.carModel}
                  onChange={(e) => setFormData({...formData, carModel: e.target.value})}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.registration.partName}</label>
              {formData.type === ProjectType.INCREMENTAL_MOLD ? (
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                  value={formData.partName}
                  onChange={(e) => {
                    const selectedProject = existingProjects.find(p => p.partName === e.target.value);
                    setFormData({
                      ...formData,
                      partName: e.target.value,
                      partNumber: selectedProject?.partNumber || formData.partNumber,
                      customerName: selectedProject?.customerName || formData.customerName,
                      carModel: selectedProject?.carModel || formData.carModel,
                      material: selectedProject?.material || formData.material
                    });
                  }}
                >
                  <option value="">{t.registration.selectPartName}</option>
                  {existingProjects.filter(p => p.type === ProjectType.NEW_DEVELOPMENT).length === 0 ? (
                    <option value="" disabled>{t.registration.noNewDevelopmentProjects}</option>
                  ) : (
                    existingProjects
                      .filter(p => p.type === ProjectType.NEW_DEVELOPMENT)
                      .map((project) => (
                        <option key={project.id} value={project.partName}>
                          {project.partName} ({project.partNumber}) - {project.customerName}
                        </option>
                      ))
                  )}
                </select>
              ) : (
                <input 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="예) 실린더 블록, 하우징 케이스..."
                  value={formData.partName}
                  onChange={(e) => setFormData({...formData, partName: e.target.value})}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.registration.partNumber}</label>
              <input 
                required
                className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm ${formData.type === ProjectType.INCREMENTAL_MOLD ? 'bg-slate-100 text-slate-500' : ''}`}
                placeholder="예) 24001-XXXX-00"
                value={formData.partNumber}
                onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
                readOnly={formData.type === ProjectType.INCREMENTAL_MOLD}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.registration.moldCavity}</label>
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
              <label className="text-sm font-bold text-slate-700">{t.registration.material}</label>
              <select 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none bg-white"
                value={formData.material}
                onChange={(e) => setFormData({...formData, material: e.target.value})}
                disabled={formData.type === ProjectType.INCREMENTAL_MOLD}
              >
                <option value="">{t.registration.selectMaterial}</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.code}>
                    {material.name} ({material.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 연도별 볼륨 섹션 (신규 개발 프로젝트만 표시) */}
          {formData.type === ProjectType.NEW_DEVELOPMENT && (
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ClipboardCheck className="text-indigo-600" size={20} />
                {t.registration.volumeTitle}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2026 year</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2027</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2028</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2029</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2030</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2031</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-700 border border-slate-200">2032</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map((year) => {
                        const volumeKey = `volume${year}` as keyof typeof formData;
                        const currentValue = formData[volumeKey] as number | undefined;
                        return (
                          <td key={year} className="px-4 py-3 border border-slate-200">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                              placeholder="0"
                              value={currentValue || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                setFormData({ ...formData, [volumeKey]: value });
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 프로젝트 일정 섹션 (신규 개발 프로젝트만 표시) */}
          {formData.type === ProjectType.NEW_DEVELOPMENT && (
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ClipboardCheck className="text-indigo-600" size={20} />
                {t.registration.scheduleTitle}
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.fot}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.fotDate || ''}
                  onChange={(e) => setFormData({...formData, fotDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.fai}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.faiDate || ''}
                  onChange={(e) => setFormData({...formData, faiDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.p1}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.p1Date || ''}
                  onChange={(e) => setFormData({...formData, p1Date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.p2}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.p2Date || ''}
                  onChange={(e) => setFormData({...formData, p2Date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.runAtRate}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.runAtRateDate || ''}
                  onChange={(e) => setFormData({...formData, runAtRateDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.ppap}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.ppapDate || ''}
                  onChange={(e) => setFormData({...formData, ppapDate: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">{t.registration.customerSop}</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  value={formData.customerSopDate || ''}
                  onChange={(e) => setFormData({...formData, customerSopDate: e.target.value})}
                />
              </div>
            </div>
          </div>
          )}

          {/* 증작 금형 프로젝트 전용 필드 */}
          {formData.type === ProjectType.INCREMENTAL_MOLD && (
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ClipboardCheck className="text-indigo-600" size={20} />
                {t.registration.incrementalScheduleTitle}
              </h3>
              
              {/* 개발 차수 */}
              <div className="mb-6">
                <label className="text-sm font-bold text-slate-700 block mb-2">{t.registration.developmentPhase}</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="예) 1차, 2차..."
                  value={formData.developmentPhase || ''}
                  onChange={(e) => setFormData({...formData, developmentPhase: e.target.value})}
                />
              </div>

              {/* 계획/실적 날짜 필드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 타당성검토서 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.feasibilityReviewPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.feasibilityReviewPlan || ''}
                    onChange={(e) => setFormData({...formData, feasibilityReviewPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.feasibilityReviewActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.feasibilityReviewActual || ''}
                    onChange={(e) => setFormData({...formData, feasibilityReviewActual: e.target.value})}
                  />
                </div>

                {/* 금형발주 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.moldOrderPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.moldOrderPlan || ''}
                    onChange={(e) => setFormData({...formData, moldOrderPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.moldOrderActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.moldOrderActual || ''}
                    onChange={(e) => setFormData({...formData, moldOrderActual: e.target.value})}
                  />
                </div>

                {/* 금형 입고 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.moldDeliveryPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.moldDeliveryPlan || ''}
                    onChange={(e) => setFormData({...formData, moldDeliveryPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.moldDeliveryActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.moldDeliveryActual || ''}
                    onChange={(e) => setFormData({...formData, moldDeliveryActual: e.target.value})}
                  />
                </div>

                {/* istr 제출 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.istrSubmissionPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.istrSubmissionPlan || ''}
                    onChange={(e) => setFormData({...formData, istrSubmissionPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.istrSubmissionActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.istrSubmissionActual || ''}
                    onChange={(e) => setFormData({...formData, istrSubmissionActual: e.target.value})}
                  />
                </div>

                {/* ydc vn ppap */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ydcVnPpapPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ydcVnPpapPlan || ''}
                    onChange={(e) => setFormData({...formData, ydcVnPpapPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ydcVnPpapActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ydcVnPpapActual || ''}
                    onChange={(e) => setFormData({...formData, ydcVnPpapActual: e.target.value})}
                  />
                </div>

                {/* ppap kr 제출 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ppapKrSubmissionPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ppapKrSubmissionPlan || ''}
                    onChange={(e) => setFormData({...formData, ppapKrSubmissionPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ppapKrSubmissionActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ppapKrSubmissionActual || ''}
                    onChange={(e) => setFormData({...formData, ppapKrSubmissionActual: e.target.value})}
                  />
                </div>

                {/* ppap 고객 승인 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ppapCustomerApprovalPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ppapCustomerApprovalPlan || ''}
                    onChange={(e) => setFormData({...formData, ppapCustomerApprovalPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ppapCustomerApprovalActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ppapCustomerApprovalActual || ''}
                    onChange={(e) => setFormData({...formData, ppapCustomerApprovalActual: e.target.value})}
                  />
                </div>

                {/* ydc vn sop */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ydcVnSopPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ydcVnSopPlan || ''}
                    onChange={(e) => setFormData({...formData, ydcVnSopPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.ydcVnSopActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.ydcVnSopActual || ''}
                    onChange={(e) => setFormData({...formData, ydcVnSopActual: e.target.value})}
                  />
                </div>

                {/* 고객 sop */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.customerSopPlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.customerSopPlan || ''}
                    onChange={(e) => setFormData({...formData, customerSopPlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.customerSopActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.customerSopActual || ''}
                    onChange={(e) => setFormData({...formData, customerSopActual: e.target.value})}
                  />
                </div>

                {/* 납품일정 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.deliverySchedulePlan}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.deliverySchedulePlan || ''}
                    onChange={(e) => setFormData({...formData, deliverySchedulePlan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t.registration.deliveryScheduleActual}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    value={formData.deliveryScheduleActual || ''}
                    onChange={(e) => setFormData({...formData, deliveryScheduleActual: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
              {isSubmitting ? t.registration.submitting : t.registration.submit}
            </button>
            <button 
              type="reset" 
              className="px-8 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              onClick={() => setFormData({})}
            >
              {t.registration.reset}
            </button>
          </div>
        </form>
        </div>
        </div>

        {/* 오른쪽: 엑셀 업로드 섹션 (신규 개발 프로젝트만) */}
        {formData.type === ProjectType.NEW_DEVELOPMENT && (
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden sticky top-8">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-4 text-white">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-white" size={20} />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">{t.registration.excelUpload}</h3>
                  <p className="text-[10px] text-indigo-100 mt-0.5">{t.registration.excelUploadSub}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
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
                  className={`cursor-pointer flex flex-col items-center gap-3 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="animate-spin text-indigo-600" size={32} />
                      <p className="text-slate-600 font-bold text-xs">처리 중...</p>
                    </>
                  ) : (
                    <>
                      <div className="bg-indigo-100 p-3 rounded-full">
                        <Upload className="text-indigo-600" size={24} />
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold text-sm">{t.registration.uploadFile}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">.xlsx, .xls</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-left text-[10px] text-slate-600 w-full">
                        <p className="font-bold mb-1.5 text-xs">{t.registration.requiredColumns}</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>고객사명</li>
                          <li>차종</li>
                          <li>부품명</li>
                          <li>부품번호</li>
                          <li>SOP일자</li>
                        </ul>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ProjectRegistration;
