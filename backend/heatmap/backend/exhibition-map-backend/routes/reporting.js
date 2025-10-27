const express = require('express');
const PDFDocument = require('pdfkit');

const router = express.Router();

// Use the central pool (heatmap_db.js) so env vars / connection are consistent and tested
const pool = require('../heatmap_db');

// Helper: parse date range from query
function parseRange(query) {
  const { date, start, end } = query;
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    if (!isNaN(s) && !isNaN(e)) return { start: s, end: e };
  }
  if (date) {
    // date in YYYY-MM-DD
    const s = new Date(date + 'T00:00:00Z');
    const e = new Date(s.getTime() + 24 * 60 * 60 * 1000);
    return { start: s, end: e };
  }
  // default last 24 hours
  const endD = new Date();
  const startD = new Date(endD.getTime() - 24 * 60 * 60 * 1000);
  return { start: startD, end: endD };
}

// Query aggregates
async function fetchAggregates(start, end) {
  const client = await pool.connect();
  try {
    const aggSql = `
      SELECT b.building_id AS id, b.building_name AS name, COUNT(*) AS samples, AVG(h.current_crowd) AS avg_count, MAX(h.current_crowd) AS max_count, MAX(h.timestamp) AS last_seen
      FROM building_history h
      JOIN buildings b ON b.building_id = h.building_id
      WHERE h.timestamp >= $1 AND h.timestamp < $2
      GROUP BY b.building_id, b.building_name
      ORDER BY avg_count DESC
    `;

    const hourlySql = `
      SELECT date_trunc('hour', timestamp) AS hour, SUM(current_crowd) AS total
      FROM building_history
      WHERE timestamp >= $1 AND timestamp < $2
      GROUP BY hour
      ORDER BY hour
    `;

    const aggRes = await client.query(aggSql, [start.toISOString(), end.toISOString()]);
    const hourlyRes = await client.query(hourlySql, [start.toISOString(), end.toISOString()]);

    return { aggRows: aggRes.rows, hourlyRows: hourlyRes.rows };
  } finally {
    client.release();
  }
}

function buildCSV(aggRows, hourlyRows, label) {
  const lines = [];
  lines.push(`Report: ${label}`);
  lines.push('');
  lines.push('Building ID,Building Name,Samples,Avg Count,Max Count,Last Seen');
  aggRows.forEach(r => {
    lines.push([r.id, r.name, r.samples, Number(r.avg_count).toFixed(2), r.max_count, r.last_seen].join(','));
  });
  lines.push('');
  lines.push('Hour,Total');
  hourlyRows.forEach(h => {
    lines.push([h.hour.toISOString(), h.total].join(','));
  });
  return lines.join('\n');
}

function streamPDF(res, label, aggRows, hourlyRows, start, end) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${label}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(18).text(`Daily Report: ${label}`, { align: 'center' });
  doc.moveDown();

  // Summary
  const totalSamples = aggRows.reduce((s, r) => s + Number(r.samples), 0);
  const busiest = aggRows.slice(0, 5).map(r => `${r.name} (avg ${Number(r.avg_count).toFixed(1)})`).join(', ') || 'No data';
  doc.fontSize(12).text(`Range: ${start.toISOString()} to ${end.toISOString()}`);
  doc.text(`Total samples: ${totalSamples}`);
  doc.text(`Busiest buildings: ${busiest}`);
  doc.moveDown();

  // Hourly bar chart (simple)
  doc.fontSize(14).text('Hourly Totals', { underline: true });
  doc.moveDown(0.5);
  const chartTop = doc.y;
  const chartLeft = doc.x;
  const chartWidth = 480;
  const barHeight = 12;
  const gap = 6;
  const maxTotal = Math.max(1, ...hourlyRows.map(h => Number(h.total)));
  hourlyRows.forEach((h, i) => {
    const x = chartLeft;
    const y = chartTop + i * (barHeight + gap);
    const w = (Number(h.total) / maxTotal) * (chartWidth * 0.6);
    doc.rect(x, y, w, barHeight).fill('#4a90e2');
    doc.fillColor('black').fontSize(9).text(`${new Date(h.hour).toISOString()} - ${h.total}`, x + w + 6, y);
  });
  doc.moveDown(hourlyRows.length * 0.1 + 1);

  // Per-building details
  doc.addPage();
  doc.fontSize(14).text('Per-building details', { underline: true });
  doc.moveDown();
  aggRows.forEach(r => {
    doc.fontSize(11).text(`${r.name} (ID: ${r.id})`);
    doc.fontSize(10).list([
      `Samples: ${r.samples}`,
      `Average: ${Number(r.avg_count).toFixed(2)}`,
      `Max: ${r.max_count}`,
      `Last seen: ${r.last_seen}`
    ]);
    doc.moveDown();
  });

  doc.end();
}

// GET /reports/daily?date=YYYY-MM-DD or start & end or default last 24h
router.get('/daily', async (req, res) => {
  const { start, end } = parseRange(req.query);
  const label = req.query.date || `${start.toISOString().slice(0,10)}`;
  try {
    const { aggRows, hourlyRows } = await fetchAggregates(start, end);
    const format = (req.query.format || 'pdf').toLowerCase();
    if ((aggRows || []).length === 0 && (hourlyRows || []).length === 0) {
      // No data
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="report-${label}.csv"`);
        return res.send(`Report: ${label}\nNo data for range`);
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report-${label}.pdf"`);
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      doc.pipe(res);
      doc.fontSize(14).text(`Report: ${label}`);
      doc.moveDown();
      doc.text('No data for this range.');
      doc.end();
      return;
    }

    if (format === 'csv') {
      const csv = buildCSV(aggRows, hourlyRows, label);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${label}.csv"`);
      return res.send(csv);
    }

    // default PDF
    streamPDF(res, label, aggRows, hourlyRows, start, end);

  } catch (err) {
    console.error('Error generating report', err);
    res.status(500).json({ error: err.message });
  }
});

// Convenience CSV endpoint
router.get('/csv', (req, res, next) => {
  // delegate to /daily with format=csv
  req.query.format = 'csv';
  return router.handle(req, res, next);
});

module.exports = router;
