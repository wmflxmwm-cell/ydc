import React, { useState, useEffect, useRef } from 'react';
import { Truck, Upload, FileSpreadsheet, X, Save, Trash2, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { shipmentService, Shipment } from '../src/api/services/shipmentService';
import { getTranslations } from '../src/utils/translations';

interface Props {
  user: { id: string; name: string; role: string };
}

const ShipmentStatus: React.FC<Props> = ({ user }) => {
  // 출하현황: 모든 사용자가 조회 및 업로드 가능 (SQL에 저장되어 언제든지 조회 가능)
  const t = getTranslations();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await shipmentService.getAll();
      setShipments(data);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      alert('출하현황 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const parseExcelFile = async (file: File): Promise<Shipment[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

          // 첫 번째 행이 헤더인지 확인
          const headerRow = jsonData[0] || [];
          const dataRows = jsonData.slice(1);

          // 헤더 매핑 (유연하게 처리)
          const headerMap: { [key: string]: number } = {};
          headerRow.forEach((cell: any, index: number) => {
            const cellStr = String(cell || '').toLowerCase().trim();
            if (cellStr.includes('출하일') || cellStr.includes('일자') || cellStr.includes('date')) {
              headerMap['shipmentDate'] = index;
            }
            if (cellStr.includes('고객') || cellStr.includes('customer')) {
              headerMap['customerName'] = index;
            }
            if (cellStr.includes('품번') || cellStr.includes('part number') || cellStr.includes('품목번호')) {
              headerMap['partNumber'] = index;
            }
            if (cellStr.includes('품명') || cellStr.includes('part name') || cellStr.includes('품목명')) {
              headerMap['partName'] = index;
            }
            if (cellStr.includes('수량') || cellStr.includes('quantity') || cellStr.includes('qty')) {
              headerMap['quantity'] = index;
            }
            if (cellStr.includes('출하방법') || cellStr.includes('shipping') || cellStr.includes('방법')) {
              headerMap['shippingMethod'] = index;
            }
            if (cellStr.includes('비고') || cellStr.includes('remark') || cellStr.includes('note')) {
              headerMap['remarks'] = index;
            }
          });

          const parsedShipments: Shipment[] = [];

          dataRows.forEach((row, rowIndex) => {
            // 빈 행 건너뛰기
            if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
              return;
            }

            const shipmentDate = row[headerMap['shipmentDate']] || '';
            const customerName = row[headerMap['customerName']] || '';
            const partNumber = row[headerMap['partNumber']] || '';
            const partName = row[headerMap['partName']] || '';
            const quantity = row[headerMap['quantity']] || '';
            const shippingMethod = row[headerMap['shippingMethod']] || '해운';
            const remarks = row[headerMap['remarks']] || '';

            // 필수 필드 확인
            if (!shipmentDate || !customerName || !partNumber || !partName) {
              console.warn(`Row ${rowIndex + 2} skipped: missing required fields`);
              return;
            }

            // 날짜 변환 (Excel 날짜 형식 처리)
            let formattedDate = '';
            if (typeof shipmentDate === 'number') {
              // Excel 날짜는 1900년 1월 1일부터의 일수
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + shipmentDate * 86400000);
              formattedDate = date.toISOString().split('T')[0];
            } else {
              // 문자열 날짜 처리
              const dateStr = String(shipmentDate).trim();
              if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                formattedDate = dateStr;
              } else if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
                formattedDate = dateStr.replace(/\//g, '-');
              } else {
                // 다른 형식 시도
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                  formattedDate = parsed.toISOString().split('T')[0];
                } else {
                  formattedDate = dateStr;
                }
              }
            }

            parsedShipments.push({
              id: `temp-${rowIndex}`,
              shipmentDate: formattedDate,
              customerName: String(customerName).trim(),
              partNumber: String(partNumber).trim(),
              partName: String(partName).trim(),
              quantity: String(quantity).trim(),
              shippingMethod: String(shippingMethod).trim() || '해운',
              remarks: String(remarks).trim(),
              createdAt: new Date().toISOString()
            });
          });

          resolve(parsedShipments);
        } catch (error) {
          reject(new Error('엑셀 파일 파싱 중 오류가 발생했습니다: ' + (error as Error).message));
        }
      };

      reader.onerror = () => {
        reject(new Error('파일 읽기 실패'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    try {
      const parsedShipments = await parseExcelFile(file);
      
      if (parsedShipments.length === 0) {
        alert('엑셀 파일에서 데이터를 찾을 수 없습니다.');
        setUploading(false);
        return;
      }

      // 일괄 등록
      const createdShipments = await Promise.all(
        parsedShipments.map(shipment => {
          const { id, createdAt, ...data } = shipment;
          return shipmentService.create(data);
        })
      );

      alert(`${createdShipments.length}개의 출하현황이 등록되었습니다.`);
      setShowUploadModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchData();
    } catch (error) {
      console.error('Excel upload error:', error);
      alert('엑셀 업로드 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 출하현황을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await shipmentService.delete(id);
      setShipments(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete shipment:', error);
      alert('출하현황 삭제에 실패했습니다.');
    }
  };

  const handleExportExcel = () => {
    const excelData = filteredShipments.map(item => ({
      '출하일자': item.shipmentDate,
      '고객사': item.customerName,
      '품번': item.partNumber,
      '품명': item.partName,
      '수량': item.quantity,
      '출하방법': item.shippingMethod,
      '비고': item.remarks
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출하현황');

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `출하현황_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 필터링된 데이터
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      !searchTerm ||
      shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.partName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = 
      (!dateFilter.start || shipment.shipmentDate >= dateFilter.start) &&
      (!dateFilter.end || shipment.shipmentDate <= dateFilter.end);

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Truck className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">출하현황</h2>
              <p className="text-sm text-slate-500 mt-1">출하 데이터 관리 및 엑셀 업로드</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
            >
              <Download size={18} />
              엑셀 다운로드
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg"
            >
              <Upload size={18} />
              엑셀 업로드
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="고객사, 품번, 품명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              placeholder="시작일"
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              placeholder="종료일"
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {(dateFilter.start || dateFilter.end) && (
              <button
                onClick={() => setDateFilter({ start: '', end: '' })}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 목록 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-bold">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 text-left text-sm font-bold">출하일자</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">고객사</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">품번</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">품명</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">수량</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">출하방법</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">비고</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <p className="font-bold">출하현황 데이터가 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.shipmentDate}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.customerName}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">{item.partNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.partName}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-700">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.shippingMethod}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.remarks || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        {user?.role === 'MANAGER' || user?.role?.includes('총괄') ? (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 엑셀 업로드 모달 */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
            }
          }}
        >
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2.5 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">엑셀 파일 업로드</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">출하현황 데이터 일괄 등록</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-700 mb-3">엑셀 파일 형식</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">
                    엑셀 파일의 첫 번째 행은 헤더로 인식됩니다. 다음 컬럼명을 포함하세요:
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>출하일자 (또는 일자, Date)</li>
                    <li>고객사 (또는 Customer)</li>
                    <li>품번 (또는 Part Number, 품목번호)</li>
                    <li>품명 (또는 Part Name, 품목명)</li>
                    <li>수량 (또는 Quantity, Qty)</li>
                    <li>출하방법 (또는 Shipping, 방법) - 선택사항</li>
                    <li>비고 (또는 Remark, Note) - 선택사항</li>
                  </ul>
                </div>
              </div>

              <div className="border-2 border-dashed border-indigo-300 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="excel-upload"
                  className={`cursor-pointer flex flex-col items-center gap-4 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="bg-indigo-100 p-4 rounded-full">
                    <FileSpreadsheet className="text-indigo-600" size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {uploading ? '업로드 중...' : '엑셀 파일을 선택하세요'}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-0.5">.xlsx, .xls</p>
                  </div>
                </label>
              </div>

              {uploading && (
                <div className="mt-6 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-2 text-sm text-slate-600">엑셀 파일을 처리하는 중...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentStatus;

