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
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.match(/\.(xlsx|xls)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.'), false);
    }
  },
});

// Get all shipments
router.get('/', async (req, res) => {
  try {
    const { year, partNo, sortBy = 'updated_at', sortOrder = 'DESC' } = req.query;

    let query = 'SELECT * FROM shipments WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (year) {
      query += ` AND year = $${paramIndex++}`;
      params.push(parseInt(year, 10));
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

/**
 * ✅ Import
 * - 파일 필드명: file / excel / excelFile 모두 허용 (프론트/과거버전 혼재 대비)
 * - year: 프론트에서 선택한 값만 신뢰. 없으면 undefined로 넘기고 파서가 시트/날짜로 추론
 * - 파싱 실패(헤더/필수컬럼/row 0)면 400으로 debugInfo 포함 반환
 */
router.post(
  '/import',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'excel', maxCount: 1 },
    { name: 'excelFile', maxCount: 1 },
  ]),
  async (req, res) => {
    const uploaded =
      (req.files?.file && req.files.file[0]) ||
      (req.files?.excel && req.files.excel[0]) ||
      (req.files?.excelFile && req.files.excelFile[0]);

    if (!uploaded) {
      return res.status(400).json({
        error: 'NO_FILE',
        message: '파일이 업로드되지 않았습니다.',
        receivedFields: Object.keys(req.files || {}),
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const fileHash = crypto.createHash('sha256').update(uploaded.buffer).digest('hex');
      const fileName = uploaded.originalname;

      // ✅ year 정책: 프론트에서 선택한 값만 사용. (파일명에서 4자리 연도 추출 금지)
      const yearParam = req.body.year ? parseInt(req.body.year, 10) : undefined;

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

      // 엑셀 파싱
      const parseResult = parseShipmentExcel(uploaded.buffer, yearParam);
      const { rows, errors, headerRow, headerMatchScore, headerMatchedFields, debugInfo, missingFields } = parseResult;

      // ✅ 파싱 자체가 실패한 케이스는 400으로 반환 (프론트에서 바로 원인 확인 가능)
      if (missingFields?.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'MISSING_REQUIRED_COLUMNS',
          message: `필수 컬럼 누락: ${missingFields.join(', ')}`,
          debugInfo: debugInfo || null,
        });
      }

      if (!rows || rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'NO_DATA_ROWS',
          message: '데이터 행을 찾지 못했습니다. (헤더 행 인식 실패 가능)',
          debugInfo: debugInfo || null,
        });
      }

      const importId = `import-${Date.now()}-${uuidv4().substr(0, 8)}`;

      let insertedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errorRows = [...(errors || [])];

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
            const id = `shipment-${Date.now()}-${uuidv4().substr(0, 8)}`;
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
        } catch (err) {
          errorRows.push({ row: rowNum, error: err.message, data: row });
          skippedCount++;
        }
      }

      // Import 로그 저장
      const finalYear = rows?.[0]?.year || yearParam || new Date().getFullYear();

      await client.query(
        `INSERT INTO shipment_imports 
         (id, year, file_name, file_hash, row_count, inserted_count, updated_count, skipped_count, errors_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          importId,
          finalYear,
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

      res.json({
        insertedCount,
        updatedCount,
        skippedCount,
        errorRows: errorRows.slice(0, 50),
        importId,
        year: finalYear,
        headerRow,
        headerMatchScore,
        headerMatchedFields,
        debugInfo: debugInfo || null,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error importing shipments:', err);
      res.status(500).json({ error: err.message, debugInfo: err.debugInfo || null });
    } finally {
      client.release();
    }
  }
);

// ✅ multer 에러를 JSON으로 내려서 프론트에서 원인 확인 가능하게
router.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'MULTER_ERROR', code: err.code, message: err.message });
  }
  if (err) {
    return res.status(400).json({ error: 'UPLOAD_ERROR', message: err.message || String(err) });
  }
  next();
});

module.exports = router;
