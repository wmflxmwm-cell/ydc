const XLSX = require('xlsx');

const REQUIRED = ['itemName', 'partNo', 'changeSeq', 'qty'];

function stripDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function norm(s) {
  return stripDiacritics(String(s || ''))
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣#/_-]/g, '');
}

function hasLetter(s) {
  return /[a-z가-힣]/i.test(String(s || ''));
}

function toStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// 날짜 파싱 (dd-mm-yyyy / dd/mm/yyyy / yyyy-mm-dd / Date 객체)
function parseDateAny(v) {
  if (!v) return null;

  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const s = String(v).trim();
  const m1 = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (m1) {
    const yyyy = parseInt(m1[1], 10);
    const mm = String(parseInt(m1[2], 10)).padStart(2, '0');
    const dd = String(parseInt(m1[3], 10)).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const m2 = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m2) {
    // 베트남/한국은 보통 dd-mm-yyyy
    const dd = String(parseInt(m2[1], 10)).padStart(2, '0');
    const mm = String(parseInt(m2[2], 10)).padStart(2, '0');
    const yyyy = parseInt(m2[3], 10);
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

// 후보 컬럼들 중 “데이터 샘플” 보고 최적 컬럼 선택
function chooseBestCol(candidates, dataRows, type) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const sample = dataRows.slice(0, 30);

  const scoreCol = (col) => {
    let score = 0;

    for (const r of sample) {
      const v = r[col];
      const s = toStr(v);

      if (!s) continue;

      if (type === 'letters') {
        if (hasLetter(s)) score += 2;
        if (/[a-z]/i.test(s)) score += 1;
      } else if (type === 'number') {
        const n = Number(String(s).replace(/,/g, ''));
        if (!isNaN(n)) score += 2;
      } else if (type === 'mixed') {
        if (hasLetter(s)) score += 1;
        if (/\d/.test(s)) score += 1;
      }
    }

    return score;
  };

  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const sc = scoreCol(c);
    if (sc > bestScore) {
      best = c;
      bestScore = sc;
    }
  }
  return best;
}

function buildHeaderMapping(headerRow) {
  // ✅ 동의어 (베트남어/한국어/영어)
  const synonyms = {
    itemName: ['tenhang', 'itemname', '품명', 'tenhang', 'tênhang', 'tenhang'],
    partNo: ['partno', '품번', 'mahang', 'mahàng', 'mahang', 'mahang'],
    changeSeq: ['so#', 'số#', 'lot/no', 'lotno', 'lot', 'change', '차수', '명칭변경차수'],
    qty: ['soluongban', 'soluong', 'shipmentqty', '출하수량', '수량'],
    customer: ['tencongty', 'customer', '고객사', 'tencongty'],
    date: ['ngayhoadon', 'shipmentdate', '출하일자', 'date', 'invoicedate'],
    invoiceNo: ['invoiceno', 'invoice no', 'sohoadon', 'sốhóađơn'],
    invoiceSeq: ['invoiceseq', 'invoice seq'],
    invoiceDate: ['invoicedate', 'ngayhoadon', 'ngay', 'date'],
  };

  const cand = {
    itemName: [],
    partNo: [],
    changeSeq: [],
    qty: [],
    customer: [],
    date: [],
    invoiceNo: [],
    invoiceSeq: [],
    invoiceDate: [],
  };

  for (let i = 0; i < headerRow.length; i++) {
    const h = norm(headerRow[i]);

    if (!h) continue;

    const pushIfMatch = (key, words) => {
      for (const w of words) {
        const wn = norm(w);
        if (wn && h.includes(wn)) {
          cand[key].push(i);
          break;
        }
      }
    };

    pushIfMatch('itemName', synonyms.itemName);
    pushIfMatch('partNo', synonyms.partNo);
    pushIfMatch('changeSeq', synonyms.changeSeq);
    pushIfMatch('qty', synonyms.qty);

    pushIfMatch('customer', synonyms.customer);
    pushIfMatch('date', synonyms.date);

    pushIfMatch('invoiceNo', synonyms.invoiceNo);
    pushIfMatch('invoiceSeq', synonyms.invoiceSeq);
    pushIfMatch('invoiceDate', synonyms.invoiceDate);
  }

  return cand;
}

function inferYearFromSheetName(sheetName) {
  const m = String(sheetName || '').match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

function parseShipmentExcel(buffer, yearParam) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  // 시트 선택: "출"/shipment/OQC 우선, 없으면 첫 시트
  const sheetNames = workbook.SheetNames || [];
  let sheetName =
    sheetNames.find((n) => /출|shipment|oqc|outgoing/i.test(n)) ||
    sheetNames[0];

  const ws = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

  // ✅ 0~60행에서 “헤더 점수”로 최적 헤더 탐지
  const scanMax = Math.min(60, matrix.length - 1);

  let best = {
    headerRowIndex: null,
    headerRow: null,
    mapping: null,
    matchScore: -1,
    matchedFields: [],
    dataStartIndex: null,
  };

  for (let r = 0; r <= scanMax; r++) {
    const header1 = matrix[r] || [];
    const header2 = matrix[r + 1] || [];

    // 단일행 헤더
    const cand1 = buildHeaderMapping(header1);
    const score1 = REQUIRED.filter((k) => cand1[k] && cand1[k].length > 0).length;

    if (score1 > best.matchScore) {
      best = {
        headerRowIndex: r,
        headerRow: header1,
        mapping: cand1,
        matchScore: score1,
        matchedFields: REQUIRED.filter((k) => cand1[k] && cand1[k].length > 0),
        dataStartIndex: r + 1,
      };
    }

    // 2행 헤더 (r + r+1 결합)
    if (r + 1 <= scanMax) {
      const merged = [];
      const maxLen = Math.max(header1.length, header2.length);
      for (let i = 0; i < maxLen; i++) {
        const a = toStr(header1[i]);
        const b = toStr(header2[i]);
        merged[i] = (a && b) ? `${a} ${b}` : (a || b || '');
      }
      const cand2 = buildHeaderMapping(merged);
      const score2 = REQUIRED.filter((k) => cand2[k] && cand2[k].length > 0).length;

      if (score2 > best.matchScore) {
        best = {
          headerRowIndex: r,
          headerRow: merged,
          mapping: cand2,
          matchScore: score2,
          matchedFields: REQUIRED.filter((k) => cand2[k] && cand2[k].length > 0),
          dataStartIndex: r + 2,
        };
      }
    }
  }

  const headerRowIndex = best.headerRowIndex ?? 0;
  const headerRow = best.headerRow || [];
  const dataStartIndex = best.dataStartIndex ?? (headerRowIndex + 1);

  // 데이터 샘플(컬럼 선택 최적화용)
  const dataRows = matrix.slice(dataStartIndex, dataStartIndex + 200);

  // 후보 컬럼들 중 “데이터 성격”으로 최종 컬럼 결정
  const m = best.mapping || {};
  const itemNameCol = chooseBestCol(m.itemName, dataRows, 'letters');
  const partNoCol = chooseBestCol(m.partNo, dataRows, 'letters');         // 숫자-only 컬럼보다 알파 포함 컬럼 우선
  const changeSeqCol = chooseBestCol(m.changeSeq, dataRows, 'mixed');
  const qtyCol = chooseBestCol(m.qty, dataRows, 'number');

  const customerCol = chooseBestCol(m.customer, dataRows, 'letters');
  const dateCol = chooseBestCol(m.date, dataRows, 'mixed');

  const invoiceNoCol = chooseBestCol(m.invoiceNo, dataRows, 'letters');   // YDCK-... 같은 값 우선
  const invoiceSeqCol = chooseBestCol(m.invoiceSeq, dataRows, 'mixed');
  const invoiceDateCol = chooseBestCol(m.invoiceDate, dataRows, 'mixed');

  const mappingResult = {
    itemNameCol,
    partNoCol,
    changeSeqCol,
    qtyCol,
    dateCol,
    customerCol,
    invoiceNoCol,
    invoiceSeqCol,
    invoiceDateCol,
  };

  const headerMatchScore = REQUIRED.filter((k) => mappingResult[`${k}Col`] !== null && mappingResult[`${k}Col`] !== undefined).length;
  const missingFields = REQUIRED.filter((k) => mappingResult[`${k}Col`] === null || mappingResult[`${k}Col`] === undefined);

  const headersOriginal = headerRow.map((v) => toStr(v)).slice(0, 30);
  const headersNormalized = headerRow.map((v) => norm(v)).slice(0, 30);

  // year 추론
  let year = (typeof yearParam === 'number' ? yearParam : null);
  if (!year) year = inferYearFromSheetName(sheetName);
  if (!year) year = new Date().getFullYear();

  const rows = [];
  const errors = [];

  for (let i = dataStartIndex; i < matrix.length; i++) {
    const r = matrix[i] || [];

    const itemName = itemNameCol != null ? toStr(r[itemNameCol]) : '';
    const partNo = partNoCol != null ? toStr(r[partNoCol]) : '';
    const changeSeq = changeSeqCol != null ? toStr(r[changeSeqCol]) : '';
    const qtyRaw = qtyCol != null ? r[qtyCol] : '';

    // 빈 줄 스킵
    if (!itemName && !partNo && !changeSeq && !toStr(qtyRaw)) continue;

    // 필수값 체크
    if (!itemName || !partNo || !changeSeq || !toStr(qtyRaw)) {
      errors.push({
        row: i + 1,
        error: '필수값 누락(품명/품번/LOT/출하수량)',
        data: { itemName, partNo, changeSeq, shipmentQty: toStr(qtyRaw) },
      });
      continue;
    }

    const qtyNum = Number(String(qtyRaw).replace(/,/g, ''));
    if (Number.isNaN(qtyNum)) {
      errors.push({
        row: i + 1,
        error: '출하수량이 숫자가 아닙니다.',
        data: { itemName, partNo, changeSeq, shipmentQty: toStr(qtyRaw) },
      });
      continue;
    }

    const customerName = customerCol != null ? toStr(r[customerCol]) : '';
    const d1 = dateCol != null ? parseDateAny(r[dateCol]) : null;
    const invoiceDate = invoiceDateCol != null ? parseDateAny(r[invoiceDateCol]) : null;

    // shipmentDate가 별도 없으면 invoiceDate/날짜 컬럼을 shipmentDate로 사용
    const shipmentDate = d1 || invoiceDate;

    // year가 아직 없으면 날짜에서 추론
    if (!year && shipmentDate) year = parseInt(shipmentDate.slice(0, 4), 10);

    const invoiceNo = invoiceNoCol != null ? toStr(r[invoiceNoCol]) : '';
    const invoiceSeq = invoiceSeqCol != null ? toStr(r[invoiceSeqCol]) : '';

    rows.push({
      year,
      shipmentDate,
      customerName,
      itemName,
      partNo,
      changeSeq,
      shipmentQty: qtyNum,
      invoiceNo: invoiceNo || null,
      invoiceSeq: invoiceSeq || null,
      invoiceDate: invoiceDate || shipmentDate || null,
    });
  }

  const debugInfo = {
    importType: 'Shipment',
    sheetName,
    headerRowIndex,
    headersOriginal,
    headersNormalized,
    mappingResult,
    missingFields,
    dataStartIndex,
  };

  return {
    rows,
    errors,
    headerRow: headerRowIndex + 1, // Excel 기준 1부터
    headerMatchScore,
    headerMatchedFields: REQUIRED.filter((k) => !missingFields.includes(k)),
    debugInfo,
    missingFields,
  };
}

module.exports = { parseShipmentExcel };
