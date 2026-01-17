// shipmentService.ts (전체 교체용)
// ✅ 업로드 시 엑셀 헤더(2행) 자동 인식 + 1행 병합 타이틀 제거 + 표준 헤더로 재생성 후 업로드
// ✅ 베트남어 결합문자(예: Mã hàng) 문제 해결 (NFKD + 결합문자 제거)
// ✅ part_no 중복 헤더(Mã hàng / Mã hàng 등)일 때, 값 패턴(알파벳 포함/길이)으로 더 좋은 컬럼 자동 선택

import client from '../client';
import * as XLSX from 'xlsx';

export interface Shipment {
  id: string;
  year?: number;
  shipmentDate?: string; // 출하일자 (YYYY-MM-DD)
  customerName?: string; // 고객사
  itemName?: string; // 품명
  partNo?: string; // 품번
  changeSeq?: string; // 명칭 변경 차수 (LOT/No)
  shipmentQty?: number; // 출하수량
  invoiceNo?: string; // Invoice No (선택)
  invoiceSeq?: string; // Invoice Seq (선택)
  invoiceDate?: string; // Invoice Date (선택)
  sourceFileId?: string;
  createdAt?: string;
  updatedAt?: string;

  // 하위 호환성 필드
  partNumber?: string;
  partName?: string;
  quantity?: string;
  shippingMethod?: string;
  remarks?: string;
}

export interface CreateShipmentData {
  shipmentDate: string;
  customerName: string;
  partNumber: string;
  partName: string;
  quantity: string;
  shippingMethod: string;
  remarks: string;
}

export interface ImportResult {
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorRows: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  importId?: string;
  year?: number;
  message?: string;
  headerRow?: number;
  headerMatchScore?: number;
  headerMatchedFields?: string[];
  debugInfo?: {
    importType: string;
    sheetName: string;
    headerRowIndex: number;
    headersOriginal: string[];
    headersNormalized: string[];
    mappingResult: {
      dateCol: number | null;
      customerCol: number | null;
      partNoCol: number | null;
      itemNameCol: number | null;
      qtyCol: number | null;
    };
    missingFields: string[];
  };
}

// =========================
// ✅ Excel Normalization Helpers
// =========================

const REQUIRED_FIELDS_COUNT = 4;

type CanonField = 'item_name' | 'part_no' | 'change_seq' | 'shipment_qty' | 'shipment_date' | 'customer' | 'invoice_no' | 'invoice_date';

const SYNONYMS: Record<CanonField, string[]> = {
  item_name: ['Tên hàng', 'TÊN HÀNG', '품명', 'Item Name', 'Tên hàng hóa'],
  part_no: ['Mã hàng', 'Mã hàng', 'Ma hang', '품번', 'Part No', 'PartNo', 'Part Number', 'Mã SP', 'Mã SP'],
  change_seq: ['Số #', 'Số#', 'LOT / No', 'LOT/No', 'Lot No', 'LOT NO', 'No', '번호'],
  shipment_qty: ['Số lượng bán', 'Số lượng', '출하수량', 'Shipment Qty', 'Ship Qty', 'Qty', 'Quantity', 'SL'],
  shipment_date: ['출하일자', 'Shipment Date', 'Ship Date', 'Date', 'Ngày', 'Ngày xuất', '출하일', '출하 일자'],
  customer: ['고객사', 'Customer', 'Khách hàng', 'Customer Name', 'Cust'],
  invoice_no: ['Invoice No', 'Số hóa đơn', 'Hóa đơn', 'Invoice', 'Inv No', 'INV No'],
  invoice_date: ['Invoice Date', 'Ngày hóa đơn', 'Inv Date', 'Ngày', 'Date (Invoice)'],
};

function normalizeHeader(v: any): string {
  if (v == null) return '';
  return String(v)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // 결합문자 제거
    .replace(/[đĐ]/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYN_NORM: Record<CanonField, string[]> = Object.fromEntries(
  Object.entries(SYNONYMS).map(([k, arr]) => [k, arr.map(normalizeHeader)])
) as any;

function isNonEmpty(v: any) {
  return String(v ?? '').trim() !== '';
}

function scoreRowAsHeader(row: any[]): { score: number; matched: CanonField[] } {
  const norm = row.map(normalizeHeader);
  const required: CanonField[] = ['item_name', 'part_no', 'change_seq', 'shipment_qty'];
  const matched: CanonField[] = [];

  for (const field of required) {
    const syns = SYN_NORM[field];
    if (norm.some((h) => syns.includes(h))) matched.push(field);
  }
  return { score: matched.length, matched };
}

function pickHeaderRowIndex(rows: any[][], scanRows = 30) {
  let bestIdx = -1;
  let bestScore = -1;
  let bestMatched: CanonField[] = [];

  for (let i = 0; i < Math.min(rows.length, scanRows); i++) {
    const row = rows[i] ?? [];
    const nonEmptyCount = row.filter(isNonEmpty).length;

    // ✅ 병합 타이틀행(A1만 값) 같은 줄 제거
    if (nonEmptyCount < 4) continue;

    const { score, matched } = scoreRowAsHeader(row);
    if (score > bestScore) {
      bestIdx = i;
      bestScore = score;
      bestMatched = matched;
      if (bestScore === REQUIRED_FIELDS_COUNT) break; // 4/4면 확정
    }
  }

  return { headerRowIndex: bestIdx, headerMatchScore: bestScore, headerMatchedFields: bestMatched };
}

function findCandidateCols(headerRow: any[]): Record<CanonField, number[]> {
  const normHeaders = headerRow.map(normalizeHeader);

  const out: Record<CanonField, number[]> = {
    item_name: [],
    part_no: [],
    change_seq: [],
    shipment_qty: [],
    shipment_date: [],
    customer: [],
    invoice_no: [],
    invoice_date: [],
  };

  (Object.keys(out) as CanonField[]).forEach((field) => {
    const syns = SYN_NORM[field];
    normHeaders.forEach((h, idx) => {
      if (h && syns.includes(h)) out[field].push(idx);
    });
  });

  return out;
}

function pickBestPartNoColumn(candidates: number[], rows: any[][], headerRowIndex: number): number {
  if (candidates.length <= 1) return candidates[0] ?? -1;

  const sample = rows.slice(headerRowIndex + 1, headerRowIndex + 21);

  const score = (colIdx: number) => {
    const vals = sample.map((r) => String(r?.[colIdx] ?? '').trim()).filter(Boolean);
    if (!vals.length) return 0;

    const alphaCount = vals.filter((v) => /[A-Za-z]/.test(v)).length;
    const avgLen = vals.reduce((a, v) => a + v.length, 0) / vals.length;

    // 알파벳 포함이 많고 길이가 긴 컬럼을 우선(실제 Part No 패턴)
    return alphaCount * 10 + avgLen;
  };

  let best = candidates[0];
  let bestScore = -1;
  for (const idx of candidates) {
    const s = score(idx);
    if (s > bestScore) {
      bestScore = s;
      best = idx;
    }
  }
  return best;
}

function excelDateToISO(v: any): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v.trim();

  // Excel serial date number
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return String(v);
    const yyyy = String(d.y).padStart(4, '0');
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Date object
  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return String(v).trim();
}

async function preprocessShipmentExcel(file: File): Promise<File> {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });

    // ✅ 여러 시트 중, 필수컬럼 매칭 점수가 가장 높은 시트 선택
    let best = {
      sheetName: '',
      headerRowIndex: -1,
      headerMatchScore: -1,
      headerMatchedFields: [] as CanonField[],
      rows: [] as any[][],
    };

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][];
      const picked = pickHeaderRowIndex(rows, 40);

      if (picked.headerMatchScore > best.headerMatchScore) {
        best = {
          sheetName,
          headerRowIndex: picked.headerRowIndex,
          headerMatchScore: picked.headerMatchScore,
          headerMatchedFields: picked.headerMatchedFields,
          rows,
        };
      }

      if (best.headerMatchScore === REQUIRED_FIELDS_COUNT) break;
    }

    // 필수 4개가 안 잡히면 원본 그대로 업로드(서버에서 처리 시도)
    if (best.headerRowIndex < 0 || best.headerMatchScore < REQUIRED_FIELDS_COUNT) {
      console.warn('[Shipment Excel Preprocess] 헤더 자동탐지 실패 → 원본 업로드', {
        file: file.name,
        best,
      });
      return file;
    }

    const headerRow = best.rows[best.headerRowIndex] ?? [];
    const candidates = findCandidateCols(headerRow);

    const itemNameCol = candidates.item_name[0] ?? -1;
    const changeSeqCol = candidates.change_seq[0] ?? -1;
    const qtyCol = candidates.shipment_qty[0] ?? -1;

    const partNoCol = pickBestPartNoColumn(candidates.part_no, best.rows, best.headerRowIndex);

    // 선택 필드(있으면)
    const shipDateCol = candidates.shipment_date[0] ?? -1;
    const customerCol = candidates.customer[0] ?? -1;
    const invoiceNoCol = candidates.invoice_no[0] ?? -1;
    const invoiceDateCol = candidates.invoice_date[0] ?? -1;

    const missingRequired: string[] = [];
    if (itemNameCol < 0) missingRequired.push('item_name');
    if (partNoCol < 0) missingRequired.push('part_no');
    if (changeSeqCol < 0) missingRequired.push('change_seq');
    if (qtyCol < 0) missingRequired.push('shipment_qty');

    if (missingRequired.length > 0) {
      console.warn('[Shipment Excel Preprocess] 필수 컬럼 누락 → 원본 업로드', { missingRequired });
      return file;
    }

    // ✅ 표준 헤더(서버가 어떤 로직이든 거의 확실히 인식하도록 “한국어/영문 혼합”)
    const outHeader = ['품명', '품번', 'LOT/No', '출하수량', '출하일자', '고객사', 'Invoice No', 'Invoice Date'];

    const outRows: any[][] = [outHeader];

    const dataRows = best.rows.slice(best.headerRowIndex + 1);
    for (const r of dataRows) {
      const itemName = String(r[itemNameCol] ?? '').trim();
      const partNo = String(r[partNoCol] ?? '').trim();
      const changeSeq = String(r[changeSeqCol] ?? '').trim();
      const qtyRaw = r[qtyCol];

      const shipDate = shipDateCol >= 0 ? excelDateToISO(r[shipDateCol]) : '';
      const customer = customerCol >= 0 ? String(r[customerCol] ?? '').trim() : '';
      const invoiceNo = invoiceNoCol >= 0 ? String(r[invoiceNoCol] ?? '').trim() : '';
      const invoiceDate = invoiceDateCol >= 0 ? excelDateToISO(r[invoiceDateCol]) : '';

      // ✅ 빈 행 제거(필수 4개 기준)
      const hasAnyRequired = itemName || partNo || changeSeq || String(qtyRaw ?? '').trim();
      if (!hasAnyRequired) continue;

      // 수량 정리(숫자면 숫자로)
      let qty: any = qtyRaw;
      if (typeof qtyRaw === 'string') {
        const cleaned = qtyRaw.replace(/,/g, '').trim();
        const n = Number(cleaned);
        qty = Number.isFinite(n) ? n : qtyRaw;
      }

      outRows.push([itemName, partNo, changeSeq, qty, shipDate, customer, invoiceNo, invoiceDate]);
    }

    // ✅ 새 워크북 생성
    const outWs = XLSX.utils.aoa_to_sheet(outRows);
    // 보기 좋게 폭(선택)
    outWs['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];

    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, outWs, '출하현황');

    const outArray = XLSX.write(outWb, { bookType: 'xlsx', type: 'array' });

    const newName = file.name.replace(/\.(xlsx|xls)$/i, '') + '_normalized.xlsx';
    const newFile = new File([outArray], newName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    console.log('[Shipment Excel Preprocess] 정규화 완료', {
      originalFile: file.name,
      normalizedFile: newName,
      pickedSheet: best.sheetName,
      headerRowIndex: best.headerRowIndex,
      headerRowExcel: best.headerRowIndex + 1,
      headerMatchScore: best.headerMatchScore,
      headerMatchedFields: best.headerMatchedFields,
      cols: { itemNameCol, partNoCol, changeSeqCol, qtyCol, shipDateCol, customerCol, invoiceNoCol, invoiceDateCol },
      outRowCount: outRows.length - 1,
    });

    return newFile;
  } catch (e) {
    console.warn('[Shipment Excel Preprocess] 실패 → 원본 업로드', e);
    return file;
  }
}

// =========================
// ✅ Service
// =========================

export const shipmentService = {
  getAll: async (params?: { year?: number; partNo?: string; sortBy?: string; sortOrder?: string }): Promise<Shipment[]> => {
    const response = await client.get<Shipment[]>('/api/shipments', { params });
    return response.data;
  },

  // ✅ signature 유지: ShipmentStatus에서 그대로 호출 가능
  importExcel: async (file: File, year?: number, skipDuplicate?: boolean): Promise<ImportResult> => {
    // ✅ 업로드 전에 정규화 시도(서버가 1행을 헤더로 착각해도 문제 없게)
    const normalizedFile = await preprocessShipmentExcel(file);

    const formData = new FormData();
    formData.append('file', normalizedFile);
    if (year) formData.append('year', year.toString());
    if (skipDuplicate) formData.append('skipDuplicate', 'true');

    const response = await client.post<ImportResult>('/api/shipments/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  create: async (data: CreateShipmentData): Promise<Shipment> => {
    const response = await client.post<Shipment>('/api/shipments', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/shipments/${id}`);
  },
};
