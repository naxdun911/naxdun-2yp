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

const summarizeSnapshot = (data) => {
  const totals = data.reduce((acc, item) => {
    const current = Number(item.current_crowd) || 0;
    const predicted = Number(item.predicted_count) || 0;
    const capacity = Number(item.building_capacity) || 0;

    return {
      totalCurrent: acc.totalCurrent + current,
      totalPredicted: acc.totalPredicted + predicted,
      totalCapacity: acc.totalCapacity + capacity
    };
  }, {
    totalCurrent: 0,
    totalPredicted: 0,
    totalCapacity: 0
  });

  const expectedChange = totals.totalPredicted - totals.totalCurrent;
  const changeDirection = expectedChange > 0 ? 'increase' : expectedChange < 0 ? 'decrease' : 'remain steady';
  const changeLabel = expectedChange > 0 ? 'Increase' : expectedChange < 0 ? 'Decrease' : 'No change';
  const changePercent = totals.totalCurrent > 0
    ? (expectedChange / totals.totalCurrent) * 100
    : 0;

  return {
    ...totals,
    expectedChange,
    changeDirection,
    changeLabel,
    changePercent
  };
};

const buildSummaryNarrative = (summary) => {
  if (!summary || Number.isNaN(summary.expectedChange)) {
    return 'Summary statistics could not be calculated for the current snapshot.';
  }

  if (summary.expectedChange === 0) {
    return 'Crowd levels are expected to remain steady in the next 15 minutes.';
  }

  const magnitude = Math.abs(summary.expectedChange);
  const percentText = `${Math.abs(summary.changePercent).toFixed(1)}%`;
  const direction = summary.changeDirection;

  return `Crowd levels are expected to ${direction} by ${magnitude.toLocaleString()} people (${percentText}) in the next 15 minutes.`;
};

const buildHistoryLeaders = (data) => data
  .map((item) => {
    const averageCrowd = Number(item.history_average_crowd);
    const sampleCount = Number(item.history_sample_count) || 0;
    if (!sampleCount || Number.isNaN(averageCrowd)) {
      return null;
    }

    return {
      buildingId: item.building_id,
      buildingName: item.building_name,
      averageCrowd: Math.round(averageCrowd),
      averagePercent: percentOfCapacity(averageCrowd, item.building_capacity),
      sampleCount
    };
  })
  .filter((item) => Boolean(item) && item.averagePercent > 0)
  .sort((a, b) => b.averagePercent - a.averagePercent)
  .slice(0, 5);

const padText = (value, width) => {
  const text = String(value ?? '');
  if (text.length === width) return text;
  if (text.length > width) {
    const sliceWidth = Math.max(0, width - 3);
    return `${text.slice(0, sliceWidth)}...`;
  }
  return text.padEnd(width, ' ');
};

const renderFixedWidthRow = (doc, values, widths, options = {}) => {
  const { bold = false, fontSize = 9, color = '#1f2937' } = options;
  doc.font(bold ? 'Courier-Bold' : 'Courier').fontSize(fontSize).fillColor(color).text(
    values.map((value, index) => padText(value, widths[index])).join('  ')
  );
};

const renderForecastSection = (doc, chartData) => {
  if (!chartData.length) {
    return;
  }

  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text('Predicted Occupancy Forecast');
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563')
    .text('Top buildings by predicted occupancy. Bars show current vs projected crowd levels as a percentage of capacity.');
  doc.moveDown(0.6);

  const startX = doc.x;
  const nameWidth = 210;
  const barWidth = 220;
  const barHeight = 10;
  const barGap = 5;
  const rowGap = barHeight * 2 + barGap + 24;
  const barX = startX + nameWidth + 16;
  let cursorY = doc.y;

  chartData.forEach((item) => {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827')
      .text(item.building_name, startX, cursorY, { width: nameWidth });

    const currentWidth = Math.round(Math.min(barWidth, (item.currentPct / 100) * barWidth));
    const predictedWidth = Math.round(Math.min(barWidth, (item.predictedPct / 100) * barWidth));
    const barY = cursorY + 16;

    doc.save();
    doc.rect(barX, barY, barWidth, barHeight).stroke('#e5e7eb');
    doc.rect(barX, barY + barHeight + barGap, barWidth, barHeight).stroke('#e5e7eb');
    doc.restore();

    doc.save();
    if (currentWidth > 0) {
      doc.fillColor('#2563eb').rect(barX, barY, currentWidth, barHeight).fill();
    }
    if (predictedWidth > 0) {
      doc.fillColor('#f97316').rect(barX, barY + barHeight + barGap, predictedWidth, barHeight).fill();
    }
    doc.restore();

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    doc.text(`${item.currentPct}% now`, barX + barWidth + 10, barY - 1);
    doc.text(`${item.predictedPct}% predicted`, barX + barWidth + 10, barY + barHeight + barGap - 1);

    cursorY += rowGap;
    doc.y = cursorY;
  });

  const legendY = cursorY;
  doc.fillColor('#2563eb').rect(barX, legendY, 10, 10).fill();
  doc.font('Helvetica').fontSize(9).fillColor('#111827').text('Current occupancy', barX + 16, legendY - 1);
  doc.fillColor('#f97316').rect(barX + 140, legendY, 10, 10).fill();
  doc.fillColor('#111827').text('Predicted occupancy', barX + 156, legendY - 1);
  doc.moveDown(1.2);
};

const renderHistoryTable = (doc, leaders) => {
  if (!leaders.length) {
    return;
  }

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827')
    .text('High Average Crowd History (Last 6 Hours)');
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563')
    .text('Buildings with the highest recent average occupancy—useful for pre-emptive balancing.');
  doc.moveDown(0.3);

  const widths = [8, 28, 12, 10, 9];
  renderFixedWidthRow(doc, ['ID', 'Building', 'Avg Crowd', 'Avg %', 'Samples'], widths, { bold: true });
  doc.moveDown(0.1);

  leaders.forEach((item) => {
    renderFixedWidthRow(doc, [
      item.buildingId,
      item.buildingName,
      item.averageCrowd,
      `${item.averagePercent}%`,
      item.sampleCount
    ], widths);
  });

  doc.moveDown(0.6);
};

const renderSnapshotTable = (doc, data) => {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827')
    .text('Building Snapshot Detail');
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563')
    .text('Current vs predicted counts for every monitored building. Values reflect the most recent ingest.');
  doc.moveDown(0.4);

  const widths = [8, 28, 9, 9, 9, 12];
  renderFixedWidthRow(doc, ['ID', 'Building', 'Current', 'Predicted', 'Capacity', 'Timestamp'], widths, { bold: true });
  doc.moveDown(0.1);

  data.forEach((item) => {
    const timestamp = item.status_timestamp
      ? new Date(item.status_timestamp).toISOString().slice(11, 16)
      : '';

    renderFixedWidthRow(doc, [
      item.building_id,
      item.building_name,
      item.current_crowd,
      item.predicted_count,
      item.building_capacity,
      timestamp
    ], widths);
  });
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
  const summary = summarizeSnapshot(data);
  const narrative = buildSummaryNarrative(summary);
  const generatedAt = new Date().toISOString();
  const header = 'Building ID,Building Name,Current Count,Predicted Count,Capacity,Timestamp';
  const rows = data.map((item) => [
    item.building_id,
    item.building_name,
    item.current_crowd,
    item.predicted_count,
    item.building_capacity,
    new Date(item.status_timestamp).toISOString()
  ]);

  const summaryRows = [
    [
      'TOTAL',
      'All Buildings',
      summary.totalCurrent,
      summary.totalPredicted,
      summary.totalCapacity || '',
      generatedAt
    ],
    [
      'CHANGE',
      `Expected Change (Next 15 min) - ${summary.changeLabel}`,
      summary.expectedChange,
      '',
      '',
      `${Math.abs(summary.changePercent).toFixed(1)}%`
    ],
    [
      'NOTE',
      narrative,
      '',
      '',
      '',
      ''
    ]
  ];

  const escape = (value) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
  };

  const body = [...summaryRows, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="crowd-report-${Date.now()}.csv"`);
  res.send(`${header}\n${body}`);
};

const sendPdf = (res, data) => {
  const summary = summarizeSnapshot(data);
  const narrative = buildSummaryNarrative(summary);
  const historyLeaders = buildHistoryLeaders(data);
  const chartData = buildChartSeries(data);
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="crowd-report-${Date.now()}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text('Crowd Snapshot Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f2937').text('Summary Statistics');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(11).fillColor('#1f2937').text(`Total Current Count: ${summary.totalCurrent.toLocaleString()}`);
  doc.text(`Total Predicted Count (Next 15 min): ${summary.totalPredicted.toLocaleString()}`);

  const expectedChangeDisplay = summary.expectedChange > 0
    ? `+${summary.expectedChange.toLocaleString()}`
    : summary.expectedChange.toLocaleString();

  const changeColor = summary.expectedChange > 0
    ? '#047857'
    : summary.expectedChange < 0
      ? '#b91c1c'
      : '#1f2937';

  doc.fillColor(changeColor).text(`Expected Change: ${expectedChangeDisplay} (${summary.changeLabel})`);
  doc.moveDown(0.2);
  doc.fillColor('#1f2937').fontSize(10).text(narrative);
  doc.moveDown();

  renderForecastSection(doc, chartData);

  doc.addPage();

  renderHistoryTable(doc, historyLeaders);
  renderSnapshotTable(doc, data);

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


