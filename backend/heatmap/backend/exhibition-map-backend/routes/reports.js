const express = require('express');
const PDFDocument = require('pdfkit');
const { getCurrentSnapshot } = require('../utils/buildingSnapshot');

const router = express.Router();

const percentOfCapacity = (count, capacity) => {
  if (!capacity || capacity <= 0) {
    return 0;
  }
  return Math.round((count / capacity) * 100);
};

const buildChartSeries = (data) => data
  .map((item) => ({
    ...item,
    currentPct: percentOfCapacity(item.current_crowd, item.building_capacity),
    predictedPct: percentOfCapacity(item.predicted_count, item.building_capacity)
  }))
  .sort((a, b) => b.predictedPct - a.predictedPct)
  .slice(0, 6);

const sendCsv = (res, data) => {
  const header = 'Building ID,Building Name,Current Count,Predicted Count,Capacity,Timestamp';
  const rows = data.map((item) => [
    item.building_id,
    item.building_name,
    item.current_crowd,
    item.predicted_count,
    item.building_capacity,
    new Date(item.status_timestamp).toISOString()
  ]);

  const escape = (value) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
  };

  const body = rows.map((row) => row.map(escape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="crowd-report-${Date.now()}.csv"`);
  res.send(`${header}\n${body}`);
};

const sendPdf = (res, data) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="crowd-report-${Date.now()}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text('Crowd Snapshot Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  const headers = ['Building', 'Name', 'Current', 'Predicted', 'Capacity'];
  const widths = [10, 32, 10, 10, 10];
  const pad = (value, width) => {
    const text = String(value ?? '');
    if (text.length === width) return text;
    if (text.length > width) {
      const sliceWidth = Math.max(0, width - 3);
      return `${text.slice(0, sliceWidth)}...`;
    }
    return text.padEnd(width, ' ');
  };

  const renderRow = (values, bold = false) => {
    doc.font(bold ? 'Courier-Bold' : 'Courier').fontSize(10).text(
      values.map((value, index) => pad(value, widths[index])).join('  ')
    );
  };

  renderRow(headers, true);
  doc.moveDown(0.2);
  data.forEach((item) => {
    renderRow([
      item.building_id,
      item.building_name,
      item.current_crowd,
      item.predicted_count,
      item.building_capacity
    ]);
  });

  const chartData = buildChartSeries(data);

  if (chartData.length) {
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text('Predicted Occupancy Forecast');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).text('Top buildings by predicted occupancy. Bars show current vs projected crowd levels as a percentage of capacity.');

    const labelWidth = 180;
    const barWidth = 220;
    const barHeight = 8;
    const barGap = 10;
    let y = doc.y + 10;
    const startX = doc.x;

    doc.fontSize(8).font('Helvetica');

    chartData.forEach((item) => {
      const currentWidth = Math.round(Math.min(barWidth, (item.currentPct / 100) * barWidth));
      const predictedWidth = Math.round(Math.min(barWidth, (item.predictedPct / 100) * barWidth));

      doc.fillColor('#1f2937').text(item.building_name, startX, y - 2, { width: labelWidth });

      const barX = startX + labelWidth + 10;
      doc.fillColor('#2563eb').rect(barX, y, currentWidth, barHeight).fill();
      doc.fillColor('#f97316').rect(barX, y + barHeight + 2, predictedWidth, barHeight).fill();

      doc.fillColor('#1f2937').text(`${item.currentPct}% now`, barX + currentWidth + 6, y - 1);
      doc.text(`${item.predictedPct}% predicted`, barX + predictedWidth + 6, y + barHeight + 1);

      y += barHeight * 2 + barGap;
    });

    const legendY = y + 4;
    const legendX = startX + labelWidth + 10;
    doc.fillColor('#2563eb').rect(legendX, legendY, 10, 10).fill();
    doc.fillColor('#1f2937').text('Current occupancy', legendX + 16, legendY);
    doc.fillColor('#f97316').rect(legendX + 140, legendY, 10, 10).fill();
    doc.fillColor('#1f2937').text('Predicted occupancy', legendX + 156, legendY);
  }

  doc.end();
};

router.get('/building-occupancy', async (req, res) => {
  try {
  const snapshot = (await getCurrentSnapshot()).filter((item) => item.building_id !== '999');

    if (!snapshot.length) {
      return res.status(503).json({
        success: false,
        error: 'No building occupancy data available. Ensure the data generator is running.'
      });
    }

    const format = String(req.query.format || 'pdf').toLowerCase();

    if (format === 'csv') {
      return sendCsv(res, snapshot);
    }

    return sendPdf(res, snapshot);
  } catch (error) {
    console.error('Report generation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


