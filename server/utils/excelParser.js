const XLSX = require('xlsx');

/**
 * 문자열을 normalize하여 비교 (공백/특수문자/대소문자 제거)
 * 베트남어 특수문자 정확히 처리
 */
function normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .normalize('NFD') // 유니코드 분해 (ă -> a + ˘)
        .replace(/[\u0300-\u036f]/g, '') // 조합 문자 제거 (베트남어 악센트 제거)
        .replace(/đ/g, 'd') // 베트남어 đ -> d
        .replace(/Đ/g, 'd')
        .replace(/[\s\/#.,\-_()]/g, '') // 공백 및 특수문자 제거
        .trim();
}

/**
 * 컬럼명 매핑 (normalize 후 비교)
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
 * 엑셀 파일 파싱 (2줄 헤더 지원)
 */
function parseShipmentExcel(buffer, year) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 시트 선택: '2026출' 우선, 없으면 첫 번째 시트
    let sheetName = workbook.SheetNames.find(name => name.includes('출') || name.includes(year));
    if (!sheetName) {
        sheetName = workbook.SheetNames[0];
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    if (jsonData.length < 2) {
        throw new Error('엑셀 파일에 데이터가 부족합니다 (최소 2줄 헤더 필요)');
    }
    
    // 2행이 실제 컬럼명
    const headers = jsonData[1].map(h => h ? String(h).trim() : '');
    const dataRows = jsonData.slice(2); // 3행부터 데이터
    
    // 컬럼 인덱스 찾기 (다국어 alias 확장)
    const itemNameIdx = findColumnIndex(headers, [
        'Tên hàng', 'Tên hàng hóa', 'Ten hang', 'Ten hang hoa',
        '품명', '부품명', '품목명',
        'Item Name', 'Item', 'Product Name'
    ]);
    
    const partNoIdx = findColumnIndex(headers, [
        'Mã hàng', 'Mã hàng', 'Ma hàng', 'Ma hang', 'Mã hang',
        '품번', '부품번호', '품목번호',
        'Part No', 'Part Number', 'Part Code', 'Code'
    ]);
    
    const changeSeqIdx = findColumnIndex(headers, [
        'Số #', 'So #', 'Số', 'So',
        'LOT / No', 'LOT/No', 'Lot No', 'Lot Number',
        'LOT', '명칭변경차수', '차수'
    ]);
    
    const shipmentQtyIdx = findColumnIndex(headers, [
        'Số lượng bán', 'So luong ban', 'Số lượng', 'So luong',
        '출하수량', '수량',
        'Shipment Qty', 'Quantity', 'Qty', 'QTY'
    ]);
    
    const invoiceNoIdx = findColumnIndex(headers, [
        'Invoice No', 'Invoice Number', 'Invoice',
        'Hóa đơn', 'Hoa don', 'Số hóa đơn', 'So hoa don',
        '인보이스번호', '인보이스'
    ]);
    
    const invoiceSeqIdx = findColumnIndex(headers, [
        'Invoice Seq', 'Seq', 'STT', 'Sequence'
    ]);
    
    const invoiceDateIdx = findColumnIndex(headers, [
        'Invoice Date', 'Date', 'Ngày', 'Ngay',
        'Ngày hóa đơn', 'Ngay hoa don', '인보이스일자'
    ]);
    
    // 필수 필드 검증: item_name, part_no, change_seq, shipment_qty
    const missingFields = [];
    if (itemNameIdx === -1) missingFields.push('품명(Tên hàng)');
    if (partNoIdx === -1) missingFields.push('품번(Mã hàng)');
    if (changeSeqIdx === -1) missingFields.push('LOT/No(Số #)');
    if (shipmentQtyIdx === -1) missingFields.push('출하수량(Số lượng bán)');
    
    if (missingFields.length > 0) {
        throw new Error(`필수 컬럼을 찾을 수 없습니다: ${missingFields.join(', ')}`);
    }
    
    const parsedRows = [];
    const errorRows = [];
    
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 3; // 실제 엑셀 행 번호 (1행=헤더1, 2행=헤더2, 3행부터=데이터)
        
        // 빈 행 체크
        if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
            continue;
        }
        
        const itemName = row[itemNameIdx] ? String(row[itemNameIdx]).trim() : '';
        const partNo = row[partNoIdx] ? String(row[partNoIdx]).trim() : '';
        const changeSeqRaw = row[changeSeqIdx] ? String(row[changeSeqIdx]).trim() : '';
        const shipmentQtyRaw = row[shipmentQtyIdx] ? row[shipmentQtyIdx] : null;
        const invoiceNo = invoiceNoIdx !== -1 && row[invoiceNoIdx] ? String(row[invoiceNoIdx]).trim() : null;
        const invoiceSeq = invoiceSeqIdx !== -1 && row[invoiceSeqIdx] ? String(row[invoiceSeqIdx]).trim() : null;
        const invoiceDateRaw = invoiceDateIdx !== -1 && row[invoiceDateIdx] ? row[invoiceDateIdx] : null;
        
        // 필수 필드 검증: item_name, part_no, change_seq, shipment_qty
        const missingFields = [];
        if (!itemName) missingFields.push('품명');
        if (!partNo) missingFields.push('품번');
        if (!changeSeqRaw) missingFields.push('LOT/No');
        if (shipmentQtyRaw === null || shipmentQtyRaw === undefined) missingFields.push('출하수량');
        
        if (missingFields.length > 0) {
            errorRows.push({
                row: rowNum,
                error: `필수 필드가 없습니다: ${missingFields.join(', ')}`,
                data: { itemName, partNo, changeSeq: changeSeqRaw, shipmentQty: shipmentQtyRaw }
            });
            continue;
        }
        
        const changeSeq = changeSeqRaw;
        
        // shipment_qty 변환 (숫자) - 필수이므로 반드시 변환되어야 함
        let shipmentQty = null;
        if (typeof shipmentQtyRaw === 'number') {
            shipmentQty = shipmentQtyRaw;
        } else {
            const qtyStr = String(shipmentQtyRaw).replace(/[,\s]/g, '');
            const qtyNum = parseFloat(qtyStr);
            if (!isNaN(qtyNum)) {
                shipmentQty = qtyNum;
            } else {
                errorRows.push({
                    row: rowNum,
                    error: '출하수량이 유효한 숫자가 아닙니다',
                    data: { shipmentQty: shipmentQtyRaw }
                });
                continue;
            }
        }
        
        // invoice_date 변환 (날짜)
        let invoiceDate = null;
        if (invoiceDateRaw !== null && invoiceDateRaw !== undefined) {
            if (invoiceDateRaw instanceof Date) {
                invoiceDate = invoiceDateRaw;
            } else if (typeof invoiceDateRaw === 'number') {
                // Excel 날짜 (1900-01-01 기준 일수)
                const excelEpoch = new Date(1899, 11, 30);
                invoiceDate = new Date(excelEpoch.getTime() + invoiceDateRaw * 86400000);
            } else {
                const dateStr = String(invoiceDateRaw).trim();
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                    invoiceDate = parsed;
                }
            }
        }
        
        parsedRows.push({
            year,
            itemName,
            partNo,
            changeSeq: changeSeq || null,
            shipmentQty,
            invoiceNo,
            invoiceSeq,
            invoiceDate: invoiceDate ? invoiceDate.toISOString().split('T')[0] : null
        });
    }
    
    return {
        rows: parsedRows,
        errors: errorRows,
        sheetName
    };
}

module.exports = {
    parseShipmentExcel,
    normalizeString
};

