const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { pool } = require('../db');
const { parseShipmentExcel } = require('../utils/shipmentExcelParser');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const isExcelMime =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel';

    const isExcelExt = file.originalname && file.originalname.match(/\.(xlsx|xls)$/i);

    if (isExcelMime || isExcelExt) cb(null, true);
    else cb(new Error('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'), false);
  },
});

// ✅ 여러 필드명 허용 (프론트가 file로 보내는 게 기본이지만, 혹시 다른 곳에서 excel/excelFile로 보낼 수 있음)
const uploadExcel = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'excel', maxCount: 1 },
  { name: 'excelFile', maxCount: 1 },
]);

const REQUIRED_FIELDS_COUNT = 4;

// Get all shipments
router.get('/', async (req, res) => {
  try {
    const { year, partNo, sortBy = 'updated_at', sortOrder = 'DESC' } = req.query;

    let query = 'SELECT * FROM shipments WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (year) {
      query += ` AND year = $${paramIndex++}`;
      params.push(parseInt(year));
    }

    if (partNo) {
      query += ` AND part_no ILIKE $${paramIndex++}`;
      params.push(`%${partNo}%`);
    }

    const validSortBy = ['updated_at', 'created_at', 'invoice_date', 'part_no', 'item_name'];
    const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'updated_at';

    const validSortOrder = ['ASC', 'DESC'];
    const order = validSortOrder.includes(String(sortOrder).toUpperCase()) ? String(sortOrder).toUpperCase() : 'DESC';

    query += ` ORDER BY ${sortColumn} ${order} LIMIT 1000`;

    const result = await pool.query(query, params);
    const shipments = result.rows.map((row) => ({
      id: row.id,
      year: row.year,
      shipmentDate: row.shipment_date ? row.shipment_date.toISOString().split('T')[0] : null,
      customerName: row.customer_name,
      itemName: row.item_name,
      partNo: row.part_no,
      changeSeq: row.change_seq,
      shipmentQty: row.shipment_qty ? parseFloat(row.shipment_qty) : null,
      invoiceNo: row.invoice_no,
      invoiceSeq: row.invoice_seq,
      invoiceDate: row.invoice_date ? row.invoice_date.toISOString().split('T')[0] : null,
      sourceFileId: row.source_file_id,
      createdAt: row.created_at ? row.created_at.toISOString() : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    }));

    res.json(shipments);
  } catch (err) {
    console.error('Error fetching shipments:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 엑셀 파일 업로드 및 Import (m ulter 에러/필수 컬럼 미매칭 등을 400 + debug로 반환)
router.post('/import', (req, res) => {
  uploadExcel(req, res, async (err) => {
    // 0) multer 에러 처리 (fileFilter / size limit / unexpected field 등)
    if (err) {
      const isMulter = err && err.name === 'MulterError';
      return res.status(400).json({
        error: isMulter ? 'MULTER_ERROR' : 'UPLOAD_ERROR',
        message: err.message || '업로드 처리 중 오류가 발생했습니다.',
        code: err.code,
        // 디버깅 도움
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(req.body || {}),
      });
    }

    // 1) 파일 꺼내기 (file/excel/excelFile 중 하나)
    const file =
      (req.files && req.files.file && req.files.file[0]) ||
      (req.files && req.files.excel && req.files.excel[0]) ||
      (req.files && req.files.excelFile && req.files.excelFile[0]);

    if (!file) {
      return res.status(400).json({
        error: 'NO_FILE',
        message: '파일이 업로드되지 않았습니다. (multipart field name 확인 필요: file)',
        receivedFiles: req.files ? Object.keys(req.files) : [],
        contentType: req.headers['content-type'],
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 파일 해시 생성
      const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      const fileName = file.originalname;

      /**
       * ✅ 연도 처리 정책(프론트와 동일하게 맞춤)
       * - 파일명에서 연도 추출 ❌ (위험)
       * - 요청 body.year가 있으면 그걸 사용
       * - 없으면 "파서가 데이터 기반으로 처리"하도록 null/undefined로 넘김
       */
      const yearParamRaw = req.body && req.body.year ? String(req.body.year) : '';
      const yearParam = yearParamRaw ? parseInt(yearParamRaw) : null;
      const yearForParser = Number.isFinite(yearParam) ? yearParam : undefined;

      // 동일 파일 재업로드 체크 (옵션)
      const existingImport = await client.query('SELECT id FROM shipment_imports WHERE file_hash = $1', [fileHash]);
      if (existingImport.rows.length > 0 && req.body.skipDuplicate === 'true') {
        await client.query('ROLLBACK');
        return res.json({
          insertedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorRows: [],
          message: '동일한 파일이 이미 업로드되었습니다.',
        });
      }

      // 2) 엑셀 파싱 (출하현황 전용 파서)
      const parseResult = parseShipmentExcel(file.buffer, yearForParser);
      const { rows = [], errors = [], headerRow, headerMatchScore, headerMatchedFields, debugInfo } = parseResult || {};

      // 3) 필수컬럼 매칭 실패/유효행 0이면 400으로 자세히 반환 (프론트에서 원인 확인 가능)
      const score = typeof headerMatchScore === 'number' ? headerMatchScore : 0;

      if (score < REQUIRED_FIELDS_COUNT || rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'INVALID_EXCEL_FORMAT',
          message:
            score < REQUIRED_FIELDS_COUNT
              ? `필수 컬럼 매칭 실패: ${score}/${REQUIRED_FIELDS_COUNT} (출하현황 파일 형식인지 확인하세요)`
              : '엑셀에서 유효한 출하 데이터 행을 찾을 수 없습니다.',
          insertedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorRows: errors.slice(0, 50),
          headerRow: headerRow || null,
          headerMatchScore: score,
          headerMatchedFields: headerMatchedFields || [],
          debugInfo: debugInfo || null,
          fileInfo: { name: fileName, size: file.size, mimetype: file.mimetype },
        });
      }

      // 4) Import 로그 ID 생성
      const importId = `import-${Date.now()}-${uuidv4().slice(0, 8)}`;

      let insertedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errorRows = [...errors];

      // year 확정: 파서가 각 row에 year를 넣었다고 가정. 없으면 yearParam/현재연도 fallback
      const resolvedYear =
        rows[0]?.year ||
        (Number.isFinite(yearParam) ? yearParam : new Date().getFullYear());

      // 5) Upsert
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const rowNum = idx + (headerRow || 2) + 1;

        try {
          let existing;
          if (row.invoiceNo) {
            existing = await client.query(
              `SELECT id FROM shipments
               WHERE year = $1 AND part_no = $2 AND change_seq = $3 AND invoice_no = $4`,
              [row.year, row.partNo, row.changeSeq, row.invoiceNo]
            );
          } else {
            existing = await client.query(
              `SELECT id FROM shipments
               WHERE year = $1 AND part_no = $2 AND change_seq = $3
               AND (invoice_no IS NULL OR invoice_no = '')`,
              [row.year, row.partNo, row.changeSeq]
            );
          }

          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE shipments SET
               shipment_date = $1, customer_name = $2, item_name = $3, shipment_qty = $4,
               invoice_no = $5, invoice_seq = $6, invoice_date = $7,
               source_file_id = $8, updated_at = CURRENT_TIMESTAMP
               WHERE id = $9`,
              [
                row.shipmentDate,
                row.customerName,
                row.itemName,
                row.shipmentQty,
                row.invoiceNo,
                row.invoiceSeq,
                row.invoiceDate,
                importId,
                existing.rows[0].id,
              ]
            );
            updatedCount++;
          } else {
            const id = `shipment-${Date.now()}-${uuidv4().slice(0, 8)}`;
            await client.query(
              `INSERT INTO shipments
               (id, year, shipment_date, customer_name, item_name, part_no, change_seq, shipment_qty, invoice_no, invoice_seq, invoice_date, source_file_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                id,
                row.year,
                row.shipmentDate,
                row.customerName,
                row.itemName,
                row.partNo,
                row.changeSeq,
                row.shipmentQty,
                row.invoiceNo,
                row.invoiceSeq,
                row.invoiceDate,
                importId,
              ]
            );
            insertedCount++;
          }
        } catch (e) {
          errorRows.push({ row: rowNum, error: e.message, data: row });
          skippedCount++;
        }
      }

      // 6) Import 로그 저장
      await client.query(
        `INSERT INTO shipment_imports
         (id, year, file_name, file_hash, row_count, inserted_count, updated_count, skipped_count, errors_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          importId,
          resolvedYear,
          fileName,
          fileHash,
          rows.length,
          insertedCount,
          updatedCount,
          skippedCount,
          JSON.stringify(errorRows.slice(0, 50)),
        ]
      );

      await client.query('COMMIT');

      return res.json({
        insertedCount,
        updatedCount,
        skippedCount,
        errorRows: errorRows.slice(0, 50),
        importId,
        year: resolvedYear,
        headerRow,
        headerMatchScore: score,
        headerMatchedFields,
        debugInfo: debugInfo || null,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error importing shipments:', e);
      return res.status(500).json({
        error: e.message,
        debugInfo: e.debugInfo || null,
      });
    } finally {
      client.release();
    }
  });
});

// Create a new shipment (기존 유지)
router.post('/', async (req, res) => {
  const { shipmentDate, customerName, partNumber, partName, quantity, shippingMethod, remarks } = req.body;

  if (!shipmentDate || !customerName || !partNumber || !partName) {
    return res.status(400).json({ error: '필수 필드를 모두 입력하세요.' });
  }

  try {
    const id = `shipment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO shipments (id, shipment_date, customer_name, part_number, part_name, quantity, shipping_method, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, shipmentDate, customerName, partNumber, partName, quantity || '', shippingMethod || '해운', remarks || '']
    );

    res.json({
      id,
      shipmentDate,
      customerName,
      partNumber,
      partName,
      quantity: quantity || '',
      shippingMethod: shippingMethod || '해운',
      remarks: remarks || '',
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error creating shipment:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM shipments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting shipment:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
