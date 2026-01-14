const XLSX = require('xlsx');

/**
 * 문자열 normalize (공백/특수문자/대소문자 제거 + 베트남어 악센트 제거)
 * - 악센트 제거 + đ -> d
 * - 비교용으로만 사용
 */
function normalizeString(str) {
  if (str === null || str === undefined) return '';
  const s = String(str).trim().toLowerCase();

  return s
    .normalize('NFD')                 // 유니코드 분해
    .replace(/[\u0300-\u036f]/g, '')  // 조합(악센트) 제거
    .replace(/đ/g, 'd')               // 베트남어 đ 처리
    .replace(/[^a-z0-9가-힣]/g, '');  // 공백/특수문자 전부 제거
}

/**
 * 컬럼명 매핑 점수 계산
 */
function calculateHeaderMatchScore(headers, requiredFields) {
  const normalizedHeaders = headers.map(h => normalizeString(h));
  let score = 0;
  const matchedFields = [];

  for (const field of requiredFields) {
    const { name, aliases } = field;

    let found = false;
    for (const alias of aliases) {
      const normalizedAlias = normalizeString(alias);
      const index = normalizedHeaders.findIndex(h => h === normalizedAlias);
      if (index !== -1) {
        score += 1;
        matchedFields.push(name);
        found = true;
        break;
      }
    }
    // found가 false여도 계속
  }

  return { score, matchedFields, total: requiredFields.length };
}

/**
 * 안전하게 행을 headers로 변환
 */
function rowToHeaders(row) {
  if (!Array.isArray(row)) return [];
  return row.map(v => (v === null || v === undefined) ? '' : String(v).trim());
}

/**
 * 헤더 행 찾기 (첫 15행 스캔)
 * - 점수 가장 높은 row 선택
 */
function findHeaderRow(table2d, requiredFields) {
  const maxScanRows = Math.min(15, table2d.length);
  let bestRow = 0;
  let bestScore = -1;
  let bestMatchedFields = [];

  for (let i = 0; i < maxScanRows; i++) {
    const headers = rowToHeaders(table2d[i]);
    const { score, matchedFields } = calculateHeaderMatchScore(headers, requiredFields);

    // 점수 높은 것 우선. 동점이면 더 아래 행(i가 큰 것) 우선(2줄 헤더에서 2행 선택 확률↑)
    if (score > bestScore || (score === bestScore && i > bestRow)) {
      bestScore = score;
      bestRow = i;
      bestMatchedFields = matchedFields;
    }
  }

  return {
    rowIndex: bestRow,
    score: bestScore,
    matchedFields: bestMatchedFields,
    total: requiredFields.length,
  };
}

/**
 * 컬럼 인덱스 찾기 (normalize 후 비교)
 */
function findColumnIndex(headers, candidates) {
  const normalizedHeaders = headers.map(h => normalizeString(h));
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeString(candidate);
    const index = normalizedHeaders.findIndex(h => h === normalizedCandidate);
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * 출하현황 엑셀 파일 파싱 (헤더 자동 감지, 2줄 헤더 지원)
 */
function parseShipmentExcel(buffer, year) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // 시트 선택: '출' 포함 or 연도 포함 우선, 없으면 첫 시트
  const yearStr = String(year);
  let sheetName =
    workbook.SheetNames.find(name => String(name).includes('출')) ||
    workbook.SheetNames.find(name => String(name).includes(yearStr)) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  const table2d = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  if (!Array.isArray(table2d) || table2d.length < 2) {
    throw new Error('엑셀 파일에 데이터가 부족합니다 (최소 2행 필요)');
  }

  // 필수 필드(4개만): 품명, 품번, LOT/No(차수), 출하수량
  const requiredFields = [
    {
      name: 'item_name',
      aliases: ['Tên hàng', 'Item Name', 'Part Name', '품명'],
    },
    {
      name: 'part_no',
      aliases: ['Mã hàng', 'Mã hàng', 'Ma hang', 'Part No', 'Part Number', '품번', '품번번호'],
    },
    {
      name: 'change_seq',
      aliases: ['Số #', 'So #', 'LOT / No', 'LOT/No', 'Lot No', 'LOT', '차수', '변경차수'],
    },
    {
      name: 'shipment_qty',
      aliases: ['Số lượng bán', 'So luong ban', 'Số lượng', 'So luong', 'Quantity', 'Qty', '출하수량', '수량'],
    },
  ];

  // 헤더 행 자동 탐지
  const headerResult = findHeaderRow(table2d, requiredFields);
  const headerRowIndex = headerResult.rowIndex;

  const headers = rowToHeaders(table2d[headerRowIndex]);
  const dataRows = table2d.slice(headerRowIndex + 1);

  // 필수 인덱스(4개)
  const idx = {
    itemName: findColumnIndex(headers, requiredFields[0].aliases),
    partNo: findColumnIndex(headers, requiredFields[1].aliases),
    changeSeq: findColumnIndex(headers, requiredFields[2].aliases),
    shipmentQty: findColumnIndex(headers, requiredFields[3].aliases),

    // 선택 컬럼들
    shipmentDate: findColumnIndex(headers, [
      'Ngày hóa đơn', 'Ngay hoa don',
      'Ngày kiểm tra', 'Ngay kiem tra',
      'Invoice Date', 'Date', 'Ngày', 'Ngay',
      '출하일자', '출하일', '일자',
      'Shipment Date', 'Delivery Date',
    ]),
    customerName: findColumnIndex(headers, [
      'Tên công ty', 'Ten cong ty',
      'Tên khách hàng', 'Ten khach hang',
      'Customer', 'Customer Name',
      '고객사', '고객사명',
      'Company Name', 'Client',
    ]),
    invoiceNo: findColumnIndex(headers, [
      'Số hóa đơn', 'So hoa don',
      'Invoice No', 'Invoice Number', 'Invoice',
      'Hóa đơn', 'Hoa don',
      '인보이스번호', '인보이스',
    ]),
    invoiceSeq: findColumnIndex(headers, [
      'Invoice Seq', 'Seq', 'STT', 'Sequence',
    ]),
    invoiceDate: findColumnIndex(headers, [
      'Ngày hóa đơn', 'Ngay hoa don',
      'Invoice Date', 'Date', 'Ngày', 'Ngay',
      '인보이스일자',
    ]),
  };

  // 디버그 로그
  const headersOriginal = headers.slice(0, 30);
  const headersNormalized = headersOriginal.map(h => normalizeString(h));

  const mappingResult = {
    itemNameCol: idx.itemName !== -1 ? idx.itemName : null,
    partNoCol: idx.partNo !== -1 ? idx.partNo : null,
    changeSeqCol: idx.changeSeq !== -1 ? idx.changeSeq : null,
    qtyCol: idx.shipmentQty !== -1 ? idx.shipmentQty : null,
    dateCol: idx.shipmentDate !== -1 ? idx.shipmentDate : null,
    customerCol: idx.customerName !== -1 ? idx.customerName : null,
    invoiceNoCol: idx.invoiceNo !== -1 ? idx.invoiceNo : null,
    invoiceSeqCol: idx.invoiceSeq !== -1 ? idx.invoiceSeq : null,
    invoiceDateCol: idx.invoiceDate !== -1 ? idx.invoiceDate : null,
  };

  const missingFields = [];
  const foundFields = [];

  if (idx.itemName === -1) missingFields.push('품명 (item_name)');
  else foundFields.push(`품명: "${headers[idx.itemName]}"`);

  if (idx.partNo === -1) missingFields.push('품번 (part_no)');
  else foundFields.push(`품번: "${headers[idx.partNo]}"`);

  if (idx.changeSeq === -1) missingFields.push('명칭변경차수/LOT (change_seq)');
  else foundFields.push(`명칭변경차수/LOT: "${headers[idx.changeSeq]}"`);

  if (idx.shipmentQty === -1) missingFields.push('출하수량 (shipment_qty)');
  else foundFields.push(`출하수량: "${headers[idx.shipmentQty]}"`);

  console.log('========================================');
  console.log('[Excel Parsing Debug Info]');
  console.log('========================================');
  console.log(`Import Type: Shipment`);
  console.log(`Selected Sheet: ${sheetName}`);
  console.log(`Header Row Index: ${headerRowIndex + 1} (0-based: ${headerRowIndex})`);
  console.log('Header match score:', headerResult.score, '/', headerResult.total, 'matched:', headerResult.matchedFields);
  console.log('Headers (Original, first 30):', headersOriginal);
  console.log('Headers (Normalized, first 30):', headersNormalized);
  console.log('Column Mapping Result:', JSON.stringify(mappingResult, null, 2));
  console.log('Missing Required Columns:', missingFields);
  console.log('Found Columns:', foundFields);
  console.log('========================================');

  if (missingFields.length > 0) {
    const error = new Error(`누락된 컬럼: ${missingFields.join(', ')}`);
    error.debugInfo = {
      importType: 'Shipment',
      sheetName,
      headerRowIndex: headerRowIndex + 1,
      headerMatchScore: headerResult.score,
      headerMatchedFields: headerResult.matchedFields,
      headersOriginal,
      headersNormalized,
      mappingResult,
      missingFields,
    };
    throw error;
  }

  const parsedRows = [];
  const errorRows = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + headerRowIndex + 2; // 실제 엑셀 행 번호

    if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    // 필수 4개
    const itemName = row[idx.itemName] ? String(row[idx.itemName]).trim() : '';
    const partNo = row[idx.partNo] ? String(row[idx.partNo]).trim() : '';
    const changeSeqRaw = row[idx.changeSeq] ? String(row[idx.changeSeq]).trim() : '';
    const shipmentQtyRaw = row[idx.shipmentQty];

    // 선택
    const shipmentDateRaw = (idx.shipmentDate !== -1) ? row[idx.shipmentDate] : null;
    const customerName = (idx.customerName !== -1 && row[idx.customerName]) ? String(row[idx.customerName]).trim() : null;
    const invoiceNo = (idx.invoiceNo !== -1 && row[idx.invoiceNo]) ? String(row[idx.invoiceNo]).trim() : null;
    const invoiceSeq = (idx.invoiceSeq !== -1 && row[idx.invoiceSeq]) ? String(row[idx.invoiceSeq]).trim() : null;
    const invoiceDateRaw = (idx.invoiceDate !== -1) ? row[idx.invoiceDate] : null;

    // row 필수 검증
    const rowMissing = [];
    if (!itemName) rowMissing.push('품명');
    if (!partNo) rowMissing.push('품번');
    if (!changeSeqRaw) rowMissing.push('명칭변경차수/LOT');
    if (shipmentQtyRaw === null || shipmentQtyRaw === undefined || String(shipmentQtyRaw).trim() === '') rowMissing.push('출하수량');

    if (rowMissing.length > 0) {
      errorRows.push({
        row: rowNum,
        error: `필수 필드가 없습니다: ${rowMissing.join(', ')}`,
        data: { itemName, partNo, changeSeq: changeSeqRaw, shipmentQty: shipmentQtyRaw },
      });
      continue;
    }

    // 날짜 변환(엑셀 숫자 날짜 지원)
    const toDateISO = (raw) => {
      if (raw === null || raw === undefined || String(raw).trim() === '') return null;
      if (raw instanceof Date) return raw.toISOString().split('T')[0];
      if (typeof raw === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + raw * 86400000);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      }
      const parsed = new Date(String(raw).trim());
      return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
    };

    // 수량 변환
    let shipmentQty = null;
    if (typeof shipmentQtyRaw === 'number') shipmentQty = shipmentQtyRaw;
    else {
      const qtyStr = String(shipmentQtyRaw).replace(/[,\s]/g, '');
      const qtyNum = parseFloat(qtyStr);
      if (!isNaN(qtyNum)) shipmentQty = qtyNum;
      else {
        errorRows.push({ row: rowNum, error: '출하수량이 유효한 숫자가 아닙니다', data: { shipmentQty: shipmentQtyRaw } });
        continue;
      }
    }

    parsedRows.push({
      year,
      shipmentDate: toDateISO(shipmentDateRaw),
      customerName,
      itemName,
      partNo,
      changeSeq: changeSeqRaw,
      shipmentQty,
      invoiceNo,
      invoiceSeq,
      invoiceDate: toDateISO(invoiceDateRaw),
    });
  }

  return {
    rows: parsedRows,
    errors: errorRows,
    sheetName,
    headerRow: headerRowIndex + 1,
    headerMatchScore: headerResult.score,
    headerMatchedFields: headerResult.matchedFields,
    debugInfo: {
      importType: 'Shipment',
      sheetName,
      headerRowIndex: headerRowIndex + 1,
      headerMatchScore: headerResult.score,
      headerMatchedFields: headerResult.matchedFields,
      headersOriginal,
      headersNormalized,
      mappingResult,
      missingFields: [],
    },
  };
}

module.exports = {
  parseShipmentExcel,
  normalizeString,
};
