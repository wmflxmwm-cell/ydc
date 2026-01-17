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
      shipmentQty: row.shipment_qty !== null && row.shipment_qty !== undefined ? parseFloat(row.shipment_qty) : null,
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

// 엑셀 파일 업로드 및 Import
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const fileName = req.file.originalname;

    // ✅ 연도 정책 개선
    // - 프론트에서 year를 넘기면 그걸 최우선
    // - 아니면 parser가 시트/데이터에서 추론한 year 사용
    const yearParam = req.body.year ? parseInt(req.body.year) : null;

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

    // ✅ 엑셀 파싱
    const parseResult = parseShipmentExcel(req.file.buffer, yearParam);
    const { rows, errors, headerRow, headerMatchScore, headerMatchedFields, debugInfo, year: parsedYear } = parseResult;

    const year = yearParam || parsedYear || new Date().getFullYear();

    // 유효 데이터 없으면 400
    if (!rows || rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '엑셀 파일에서 유효한 출하 데이터를 찾을 수 없습니다.',
        headerRow,
        headerMatchScore,
        headerMatchedFields,
        debugInfo: debugInfo || null,
      });
    }

    const importId = `import-${Date.now()}-${uuidv4().slice(0, 8)}`;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const errorRows = [...(errors || [])];

    // ✅ 핵심: row 단위 SAVEPOINT로 트랜잭션 abort 방지
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + (headerRow || 2) + 1;

      const sp = `sp_row_${idx}`;
      await client.query(`SAVEPOINT ${sp}`);

      try {
        // Upsert 키: year + part_no + change_seq + invoice_no(optional)
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
              shipment_date = $1,
              customer_name = $2,
              item_name = $3,
              shipment_qty = $4,
              invoice_no = $5,
              invoice_seq = $6,
              invoice_date = $7,
              source_file_id = $8,
              updated_at = CURRENT_TIMESTAMP
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
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
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

        await client.query(`RELEASE SAVEPOINT ${sp}`);
      } catch (err) {
        // 이 row만 롤백하고 계속
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        await client.query(`RELEASE SAVEPOINT ${sp}`);

        errorRows.push({
          row: rowNum,
          error: err.message,
          data: row,
        });
        skippedCount++;
      }
    }

    // Import 로그 저장 (트랜잭션 살아있음)
    await client.query(
      `INSERT INTO shipment_imports
       (id, year, file_name, file_hash, row_count, inserted_count, updated_count, skipped_count, errors_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        importId,
        year,
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
      year,
      headerRow,
      headerMatchScore,
      headerMatchedFields,
      debugInfo: debugInfo || null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error importing shipments:', err);
    res.status(500).json({
      error: err.message,
      debugInfo: err.debugInfo || null,
    });
  } finally {
    client.release();
  }
});

router.post('/', async (req, res) => {
  const { shipmentDate, customerName, partNumber, partName, quantity, shippingMethod, remarks } = req.body;

  if (!shipmentDate || !customerName || !partNumber || !partName) {
    return res.status(400).json({ error: '필수 필드를 모두 입력하세요.' });
  }

  try {
    const id = `shipment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO shipments (id, shipment_date, customer_name, part_number, part_name, quantity, shipping_method, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
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
  } catch (err) {
    console.error('Error creating shipment:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM shipments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shipment:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
