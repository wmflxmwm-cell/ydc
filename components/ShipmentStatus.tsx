import React, { useState, useEffect, useRef } from 'react';
import { Truck, Upload, FileSpreadsheet, X, Trash2, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { shipmentService, Shipment } from '../src/api/services/shipmentService';
import { getTranslations } from '../src/utils/translations';

interface Props {
  user: { id: string; name: string; role: string };
}

const REQUIRED_FIELDS_COUNT = 4;

const ShipmentStatus: React.FC<Props> = ({ user }) => {
  const t = getTranslations();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [importResult, setImportResult] = useState<{
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    errorRows: Array<{ row: number; error: string; data?: any }>;
    headerRow?: number;
    headerMatchScore?: number;
    headerMatchedFields?: string[];
    debugInfo?: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (yearFilter) params.year = yearFilter;
      if (searchTerm) params.partNo = searchTerm;
      params.sortBy = 'updated_at';
      params.sortOrder = 'DESC';

      const data = await shipmentService.getAll(params);
      setShipments(data);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      alert('출하현황 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      /**
       * ✅ 연도 처리 정책(중요)
       * - 파일명에서 연도 추출은 위험함 (예: 2025_..._260114.xlsx 같은 경우 2025로 잘못 들어갈 수 있음)
       * - 사용자가 연도 필터를 선택해둔 경우만 그 연도를 사용
       * - 아니면 undefined로 보내고 서버가 시트/데이터 기반으로 처리하도록 둠
       */
      const year = typeof yearFilter === 'number' ? yearFilter : undefined;

      const result = await shipmentService.importExcel(file, year, false);

      setImportResult(result);

      // 디버깅 정보 출력
      if (result.debugInfo) {
        console.log('========================================');
        console.log('[Frontend Excel Parsing Debug Info]');
        console.log('========================================');
        console.log(`Import Type: ${result.debugInfo.importType}`);
        console.log(`Selected Sheet: ${result.debugInfo.sheetName}`);
        console.log(`Header Row Index: ${result.debugInfo.headerRowIndex}`);
        console.log(`Headers (Original, first 30):`, result.debugInfo.headersOriginal);
        console.log(`Headers (Normalized, first 30):`, result.debugInfo.headersNormalized);
        console.log(`Column Mapping Result:`, result.debugInfo.mappingResult);
        console.log(`Missing Required Columns:`, result.debugInfo.missingFields);
        console.log('========================================');
      }

      // ✅ 필수 컬럼 4개 기준으로 표시
      if (result.headerRow) {
        console.log(
          `헤더 행: ${result.headerRow}행, 매칭 점수: ${result.headerMatchScore || 0}/${REQUIRED_FIELDS_COUNT}`
        );
      }

      if (result.errorRows?.length > 0) {
        alert(
          `업로드 완료: ${result.insertedCount}개 추가, ${result.updatedCount}개 업데이트, ${result.skippedCount}개 건너뜀, ${result.errorRows.length}개 오류`
        );
      } else {
        alert(
          `업로드 완료: ${result.insertedCount}개 추가, ${result.updatedCount}개 업데이트, ${result.skippedCount}개 건너뜀`
        );
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      fetchData();
    } catch (error: any) {
      console.error('Excel upload error:', error);

      // 서버 디버깅 정보 출력
      const debugInfo = error?.response?.data?.debugInfo;
      if (debugInfo) {
        console.log('========================================');
        console.log('[Frontend Excel Parsing Debug Info]');
        console.log('========================================');
        console.log(`Import Type: ${debugInfo.importType}`);
        console.log(`Selected Sheet: ${debugInfo.sheetName}`);
        console.log(`Header Row Index: ${debugInfo.headerRowIndex}`);
        console.log(`Headers (Original, first 30):`, debugInfo.headersOriginal);
        console.log(`Headers (Normalized, first 30):`, debugInfo.headersNormalized);
        console.log(`Column Mapping Result:`, debugInfo.mappingResult);
        console.log(`Missing Required Columns:`, debugInfo.missingFields);
        console.log('========================================');
      }

      // 서버에서 반환한 구체 오류 메시지
      const errorMessage =
        error?.response?.data?.error || error?.message || '엑셀 업로드 중 오류가 발생했습니다';

      if (String(errorMessage).includes('누락된 컬럼')) {
        alert(errorMessage);
      } else {
        alert(`엑셀 업로드 오류:\n\n${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 출하현황을 삭제하시겠습니까?')) return;

    try {
      await shipmentService.delete(id);
      setShipments((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete shipment:', error);
      alert('출하현황 삭제에 실패했습니다.');
    }
  };

  const handleExportExcel = () => {
    const excelData = filteredShipments.map((item) => ({
      연도: item.year || '',
      출하일자: item.shipmentDate || '',
      고객사: item.customerName || '',
      품번: item.partNo || item.partNumber || '',
      품명: item.itemName || item.partName || '',
      'LOT/No': item.changeSeq || '',
      출하수량:
        item.shipmentQty !== null && item.shipmentQty !== undefined ? item.shipmentQty : item.quantity || '',
      'Invoice No': item.invoiceNo || '',
      'Invoice Date': item.invoiceDate || '',
      업데이트일: item.updatedAt || item.createdAt || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출하현황');

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `출하현황_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 서버 필터링 사용
  const filteredShipments = shipments;

  return (
    <div className="space-y-6">
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
              placeholder="품번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : '')}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">전체 연도</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>

        {/* 업로드 결과 */}
        {importResult && (
          <div className="mb-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">업로드 결과</h3>

            {/* 헤더 매칭 정보 */}
            {importResult.headerRow && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs font-bold text-blue-800">
                  헤더 행: {importResult.headerRow}행 | 매칭 점수: {importResult.headerMatchScore || 0}/
                  {REQUIRED_FIELDS_COUNT}
                </p>
                {importResult.headerMatchedFields && importResult.headerMatchedFields.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    인식된 필드: {importResult.headerMatchedFields.join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-xl">
                <p className="text-xs text-slate-600 mb-1">추가됨</p>
                <p className="text-2xl font-black text-green-600">{importResult.insertedCount}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-xs text-slate-600 mb-1">업데이트됨</p>
                <p className="text-2xl font-black text-blue-600">{importResult.updatedCount}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl">
                <p className="text-xs text-slate-600 mb-1">건너뜀</p>
                <p className="text-2xl font-black text-yellow-600">{importResult.skippedCount}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl">
                <p className="text-xs text-slate-600 mb-1">오류</p>
                <p className="text-2xl font-black text-red-600">{importResult.errorRows.length}</p>
              </div>
            </div>

            {importResult.errorRows.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2">오류 상세 (최대 50개)</h4>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="px-3 py-2 text-left">행</th>
                        <th className="px-3 py-2 text-left">오류</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errorRows.map((error, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-mono">{error.row}</td>
                          <td className="px-3 py-2 text-red-600">{error.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

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
                  <th className="px-6 py-4 text-left text-sm font-bold">연도</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">출하일자</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">고객사</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">품번</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">품명</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">LOT/No</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">출하수량</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Invoice No</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Invoice Date</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                      <p className="font-bold">출하현황 데이터가 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.year || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.shipmentDate || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.customerName || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                        {item.partNo || item.partNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.itemName || item.partName || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.changeSeq || '-'}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-700">
                        {item.shipmentQty !== null && item.shipmentQty !== undefined
                          ? item.shipmentQty.toLocaleString()
                          : item.quantity || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.invoiceNo || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.invoiceDate || '-'}</td>
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
            if (e.target === e.currentTarget) setShowUploadModal(false);
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
                  <p className="text-xs text-slate-600 mb-2 font-bold">
                    ⚠️ 엑셀 파일은 2줄 헤더 구조입니다 (1행: 병합셀/대분류, 2행: 실제 컬럼명)
                  </p>

                  <p className="text-xs text-slate-700 mb-3 font-bold">필수 컬럼 (4개):</p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside mb-3">
                    <li>
                      <strong>품명 (item_name)</strong>: Tên hàng, 품명, Item Name
                    </li>
                    <li>
                      <strong>품번 (part_no)</strong>: Mã hàng, Mã hàng, 품번, Part No
                    </li>
                    <li>
                      <strong>LOT/No (change_seq)</strong>: Số #, LOT / No, Lot No
                    </li>
                    <li>
                      <strong>출하수량 (shipment_qty)</strong>: Số lượng bán, Số lượng, 출하수량, Shipment Qty
                    </li>
                  </ul>

                  <p className="text-xs text-slate-700 mb-2 font-bold">선택 컬럼:</p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>
                      <strong>Invoice No</strong>: Invoice No, Hóa đơn, Số hóa đơn (선택사항)
                    </li>
                    <li>
                      <strong>Invoice Date</strong>: Invoice Date, Ngày, Date (선택사항)
                    </li>
                  </ul>

                  <p className="text-xs text-slate-500 mt-3 p-2 bg-blue-50 rounded">
                    💡 베트남어/한국어/영어 헤더 모두 자동 인식됩니다. (연도는 상단 필터 선택 시 그 값을 사용)
                  </p>
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
                  className={`cursor-pointer flex flex-col items-center gap-4 ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="bg-indigo-100 p-4 rounded-full">
                    <FileSpreadsheet className="text-indigo-600" size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{uploading ? '업로드 중...' : '엑셀 파일을 선택하세요'}</p>
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
