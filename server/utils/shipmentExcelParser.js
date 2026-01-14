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
 * 컬럼명 매핑 점수 계산 (normalize 후 비교)
 */
function calculateHeaderMatchScore(headers, requiredFields) {
    let score = 0;
    const matchedFields = [];
    
    for (const field of requiredFields) {
        const { name, aliases } = field;
        const normalizedHeaders = headers.map(h => normalizeString(h));
        
        for (const alias of aliases) {
            const normalizedAlias = normalizeString(alias);
            const index = normalizedHeaders.findIndex(h => h === normalizedAlias);
            if (index !== -1) {
                score += 1;
                matchedFields.push(name);
                break;
            }
        }
    }
    
    return { score, matchedFields, total: requiredFields.length };
}

/**
 * 헤더 행 찾기 (첫 10행 스캔)
 */
function findHeaderRow(jsonData, requiredFields) {
    const maxScanRows = Math.min(10, jsonData.length);
    let bestRow = 1; // 기본값: 2행 (인덱스 1)
    let bestScore = 0;
    let bestMatchedFields = [];
    
    for (let i = 0; i < maxScanRows; i++) {
        const headers = jsonData[i].map(h => h ? String(h).trim() : '');
        const { score, matchedFields } = calculateHeaderMatchScore(headers, requiredFields);
        
        if (score > bestScore) {
            bestScore = score;
            bestRow = i;
            bestMatchedFields = matchedFields;
        }
    }
    
    return {
        rowIndex: bestRow,
        score: bestScore,
        matchedFields: bestMatchedFields,
        total: requiredFields.length
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
    
    // 시트 선택: '2026출' 우선, 없으면 첫 번째 시트
    let sheetName = workbook.SheetNames.find(name => name.includes('출') || name.includes(String(year)));
    if (!sheetName) {
        sheetName = workbook.SheetNames[0];
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    if (jsonData.length < 2) {
        throw new Error('엑셀 파일에 데이터가 부족합니다 (최소 2행 필요)');
    }
    
    // 필수 필드 정의 (출하현황용: 출하일자, 고객사, 품번, 품명, 수량)
    const requiredFields = [
        {
            name: 'shipment_date',
            aliases: [
                'Ngày hóa đơn', 'Ngay hoa don', 'Ngày kiểm tra', 'Ngay kiem tra',
                'Invoice Date', 'Invoice date', 'Date', 'Ngày', 'Ngay',
                '출하일자', '출하일', '일자',
                'Shipment Date', 'Delivery Date'
            ]
        },
        {
            name: 'customer_name',
            aliases: [
                'Tên công ty', 'Ten cong ty', 'Tên khách hàng', 'Ten khach hang',
                'Customer', 'Customer Name', '고객사', '고객사명',
                'Company Name', 'Client'
            ]
        },
        {
            name: 'part_no',
            aliases: [
                'Mã hàng', 'Mã hàng', 'Ma hàng', 'Ma hang', 'Mã hang',
                '품번', '부품번호', '품목번호',
                'Part No', 'Part Number', 'Part Code', 'Code'
            ]
        },
        {
            name: 'item_name',
            aliases: [
                'Tên hàng', 'Tên hàng hóa', 'Ten hang', 'Ten hang hoa',
                '품명', '부품명', '품목명',
                'Item Name', 'Item', 'Product Name', 'Part Name'
            ]
        },
        {
            name: 'shipment_qty',
            aliases: [
                'Số lượng bán', 'So luong ban', 'Số lượng', 'So luong',
                '출하수량', '수량',
                'Shipment Qty', 'Quantity', 'Qty', 'QTY'
            ]
        }
    ];
    
    // 헤더 행 찾기 (첫 10행 스캔)
    const headerResult = findHeaderRow(jsonData, requiredFields);
    const headerRowIndex = headerResult.rowIndex;
    const headers = jsonData[headerRowIndex].map(h => h ? String(h).trim() : '');
    const dataRows = jsonData.slice(headerRowIndex + 1); // 헤더 다음 행부터 데이터
    
    // 컬럼 인덱스 찾기 (출하현황 필수 필드: 출하일자, 고객사, 품번, 품명, 수량)
    const shipmentDateIdx = findColumnIndex(headers, requiredFields[0].aliases);
    const customerNameIdx = findColumnIndex(headers, requiredFields[1].aliases);
    const partNoIdx = findColumnIndex(headers, requiredFields[2].aliases);
    const itemNameIdx = findColumnIndex(headers, requiredFields[3].aliases);
    const shipmentQtyIdx = findColumnIndex(headers, requiredFields[4].aliases);
    
    // 선택 필드
    const changeSeqIdx = findColumnIndex(headers, [
        'Số #', 'So #', 'Số', 'So',
        'LOT / No', 'LOT/No', 'Lot No', 'Lot Number',
        'LOT', '명칭변경차수', '차수'
    ]);
    const invoiceNoIdx = findColumnIndex(headers, [
        'Invoice No', 'Invoice Number', 'Invoice',
        'Hóa đơn', 'Hoa don', 'Số hóa đơn', 'So hoa don',
        '인보이스번호', '인보이스'
    ]);
    const invoiceSeqIdx = findColumnIndex(headers, [
        'Invoice Seq', 'Seq', 'STT', 'Sequence'
    ]);
    
    // 필수 필드 검증 및 구체적인 오류 메시지
    const missingFields = [];
    const foundFields = [];
    
    if (shipmentDateIdx === -1) {
        missingFields.push('출하일자 (Ngày hóa đơn / Invoice Date)');
    } else {
        foundFields.push(`출하일자: "${headers[shipmentDateIdx]}"`);
    }
    
    if (customerNameIdx === -1) {
        missingFields.push('고객사 (Tên công ty / Customer)');
    } else {
        foundFields.push(`고객사: "${headers[customerNameIdx]}"`);
    }
    
    if (partNoIdx === -1) {
        missingFields.push('품번 (Mã hàng / Part No)');
    } else {
        foundFields.push(`품번: "${headers[partNoIdx]}"`);
    }
    
    if (itemNameIdx === -1) {
        missingFields.push('품명 (Tên hàng / Item Name)');
    } else {
        foundFields.push(`품명: "${headers[itemNameIdx]}"`);
    }
    
    if (shipmentQtyIdx === -1) {
        missingFields.push('수량 (Số lượng bán / Qty)');
    } else {
        foundFields.push(`수량: "${headers[shipmentQtyIdx]}"`);
    }
    
    if (missingFields.length > 0) {
        const errorMsg = `필수 컬럼을 찾을 수 없습니다:\n\n누락된 컬럼:\n${missingFields.map(f => `  - ${f}`).join('\n')}\n\n인식된 컬럼:\n${foundFields.map(f => `  - ${f}`).join('\n')}\n\n헤더 행: ${headerRowIndex + 1}행`;
        throw new Error(errorMsg);
    }
    
    const parsedRows = [];
    const errorRows = [];
    
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + headerRowIndex + 2; // 실제 엑셀 행 번호
        
        // 빈 행 체크
        if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
            continue;
        }
        
        const shipmentDateRaw = row[shipmentDateIdx] ? row[shipmentDateIdx] : null;
        const customerName = row[customerNameIdx] ? String(row[customerNameIdx]).trim() : '';
        const partNo = row[partNoIdx] ? String(row[partNoIdx]).trim() : '';
        const itemName = row[itemNameIdx] ? String(row[itemNameIdx]).trim() : '';
        const shipmentQtyRaw = row[shipmentQtyIdx] ? row[shipmentQtyIdx] : null;
        const changeSeqRaw = changeSeqIdx !== -1 && row[changeSeqIdx] ? String(row[changeSeqIdx]).trim() : null;
        const invoiceNo = invoiceNoIdx !== -1 && row[invoiceNoIdx] ? String(row[invoiceNoIdx]).trim() : null;
        const invoiceSeq = invoiceSeqIdx !== -1 && row[invoiceSeqIdx] ? String(row[invoiceSeqIdx]).trim() : null;
        
        // 필수 필드 검증: 출하일자, 고객사, 품번, 품명, 수량
        const rowMissingFields = [];
        if (!shipmentDateRaw) rowMissingFields.push('출하일자');
        if (!customerName) rowMissingFields.push('고객사');
        if (!partNo) rowMissingFields.push('품번');
        if (!itemName) rowMissingFields.push('품명');
        if (shipmentQtyRaw === null || shipmentQtyRaw === undefined) rowMissingFields.push('수량');
        
        if (rowMissingFields.length > 0) {
            errorRows.push({
                row: rowNum,
                error: `필수 필드가 없습니다: ${rowMissingFields.join(', ')}`,
                data: { shipmentDate: shipmentDateRaw, customerName, partNo, itemName, shipmentQty: shipmentQtyRaw }
            });
            continue;
        }
        
        // 출하일자 변환 (날짜)
        let shipmentDate = null;
        if (shipmentDateRaw !== null && shipmentDateRaw !== undefined) {
            if (shipmentDateRaw instanceof Date) {
                shipmentDate = shipmentDateRaw;
            } else if (typeof shipmentDateRaw === 'number') {
                // Excel 날짜 (1900-01-01 기준 일수)
                const excelEpoch = new Date(1899, 11, 30);
                shipmentDate = new Date(excelEpoch.getTime() + shipmentDateRaw * 86400000);
            } else {
                const dateStr = String(shipmentDateRaw).trim();
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                    shipmentDate = parsed;
                }
            }
        }
        
        if (!shipmentDate) {
            errorRows.push({
                row: rowNum,
                error: '출하일자가 유효한 날짜가 아닙니다',
                data: { shipmentDate: shipmentDateRaw }
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
            shipmentDate: shipmentDate.toISOString().split('T')[0],
            customerName,
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
        sheetName,
        headerRow: headerRowIndex + 1, // 실제 엑셀 행 번호 (1부터 시작)
        headerMatchScore: headerResult.score,
        headerMatchedFields: headerResult.matchedFields
    };
}

module.exports = {
    parseShipmentExcel,
    normalizeString
};

