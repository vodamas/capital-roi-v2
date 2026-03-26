import { APP_CONFIG } from './config.js';
import { computeSensitivityDrivers, fmtM } from './model.js';

const charts = {};

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

export function renderCharts(refs, inputs, results, config = APP_CONFIG) {
  const Chart = window.Chart;
  if (!Chart) {
    return;
  }

  renderChart1(Chart, refs, inputs, results);
  renderChart2(Chart, refs, inputs, results);
  renderChart3(Chart, refs, inputs, results, config);
  renderChart4(Chart, refs, results, config);
  renderChart5(Chart, refs, inputs, config);
}

function renderChart1(Chart, refs, inputs, results) {
  destroyChart('chart1');
  const years = [0, 1, 2, 3, 4, 5];
  const netData = years.map((year) => results.totalValue * year - inputs.modernizationCost);

  const breakEvenPlugin = {
    id: 'breakEvenLine',
    afterDraw(chart) {
      const { ctx, scales } = chart;
      if (!scales.y) {
        return;
      }

      const y0 = scales.y.getPixelForValue(0);
      const { left, right } = chart.chartArea;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#1F60AE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, y0);
      ctx.lineTo(right, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '10px IBM Plex Sans';
      ctx.fillStyle = '#1F60AE';
      ctx.textAlign = 'left';
      ctx.fillText('Break-even', left + 4, y0 - 5);
      ctx.restore();
    },
  };

  const ctx = refs.elements.chart1.getContext('2d');
  charts.chart1 = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years.map((year) => `Year ${year}`),
      datasets: [
        {
          label: 'Net Cumulative Benefit',
          data: netData,
          segment: {
            borderColor: (segmentCtx) => (segmentCtx.p1.parsed.y >= 0 ? '#007A35' : '#EC111A'),
          },
          backgroundColor: 'transparent',
          tension: 0.25,
          pointRadius: 5,
          pointBackgroundColor: netData.map((value) => (value >= 0 ? '#007A35' : '#EC111A')),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipCtx) =>
              ` Net: C$${tooltipCtx.parsed.y.toFixed(1)}M (${tooltipCtx.parsed.y >= 0 ? 'above' : 'below'} break-even)`,
          },
        },
      },
      scales: {
        x: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Sans', size: 11 } } },
        y: {
          grid: {
            color: (gridCtx) => (gridCtx.tick.value === 0 ? '#1F60AE' : '#eef0f6'),
            lineWidth: (gridCtx) => (gridCtx.tick.value === 0 ? 2 : 1),
          },
          ticks: {
            font: { family: 'IBM Plex Mono', size: 11 },
            callback: (value) => `C$${Number(value).toFixed(0)}M`,
          },
        },
      },
    },
    plugins: [breakEvenPlugin],
  });
}

function renderChart2(Chart, refs, inputs, results) {
  destroyChart('chart2');

  const items = [
    { label: 'Tool Consol.', value: inputs.toolConsolidation, color: '#007A35' },
    { label: 'Infra Savings', value: inputs.infraSavings, color: '#007A35' },
    { label: 'Reporting Auto', value: inputs.reportingAutomation, color: '#007A35' },
    { label: 'Model Deploy', value: inputs.modelDeployment, color: '#007A35' },
    { label: 'Validation', value: results.validationSavings, color: '#007A35' },
    { label: 'Capital Value', value: results.capitalValue, color: '#1F60AE' },
    { label: 'Total', value: results.totalValue, color: '#132144' },
  ];

  let running = 0;
  const floatData = items.map((item, index) => {
    if (index === items.length - 1) {
      return { x: item.label, y: [0, results.totalValue] };
    }

    const base = running;
    running += item.value;
    return { x: item.label, y: [base, running] };
  });

  const ctx = refs.elements.chart2.getContext('2d');
  charts.chart2 = new Chart(ctx, {
    type: 'bar',
    data: {
      datasets: [
        {
          label: 'Value ($M)',
          data: floatData,
          backgroundColor: items.map((item) => item.color),
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipCtx) => {
              const [low, high] = tooltipCtx.raw.y;
              return ` C$${(high - low).toFixed(1)}M`;
            },
          },
        },
      },
      scales: {
        x: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Sans', size: 10 } } },
        y: {
          grid: { color: '#eef0f6' },
          ticks: {
            font: { family: 'IBM Plex Mono', size: 10 },
            callback: (value) => `C$${Number(value).toFixed(0)}M`,
          },
        },
      },
    },
  });
}

function renderChart3(Chart, refs, inputs, results, config) {
  destroyChart('chart3');

  const years = [1, 2, 3, 4, 5];
  const costWithModernization = Math.max(0, inputs.analyticsCost - results.operationalSavings);
  const savingsData = years.map(
    (year) =>
      inputs.analyticsCost * Math.pow(1 + config.assumptions.annualAnalyticsInflation, year) -
      costWithModernization
  );

  const labelPlugin = {
    id: 'savingsLabels',
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      const dataset = chart.getDatasetMeta(0);
      dataset.data.forEach((bar, index) => {
        const value = data.datasets[0].data[index];
        ctx.save();
        ctx.font = 'bold 11px IBM Plex Mono';
        ctx.fillStyle = '#007A35';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`C$${value.toFixed(1)}M`, bar.x, bar.y - 3);
        ctx.restore();
      });
    },
  };

  const ctx = refs.elements.chart3.getContext('2d');
  charts.chart3 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years.map((year) => `Year ${year}`),
      datasets: [
        {
          label: 'Annual Savings',
          data: savingsData,
          backgroundColor: 'rgba(0,122,53,.7)',
          borderRadius: 4,
          barPercentage: 0.55,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipCtx) => ` Savings: C$${tooltipCtx.parsed.y.toFixed(1)}M`,
          },
        },
      },
      scales: {
        x: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Sans', size: 11 } } },
        y: {
          beginAtZero: true,
          grid: { color: '#eef0f6' },
          ticks: {
            font: { family: 'IBM Plex Mono', size: 11 },
            callback: (value) => `C$${Number(value).toFixed(0)}M`,
          },
        },
      },
    },
    plugins: [labelPlugin],
  });
}

function renderChart4(Chart, refs, results, config) {
  destroyChart('chart4');

  const maxGauge = config.assumptions.roiBenchmarkRange.high;
  const roi = Math.min(results.roiPercent, maxGauge);
  const ctx = refs.elements.chart4.getContext('2d');

  charts.chart4 = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ROI', 'Remaining'],
      datasets: [
        {
          data: [roi, maxGauge - roi],
          backgroundColor: [results.roiPercent >= 200 ? '#007A35' : '#E06C00', '#F1F5F9'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
          weight: 1,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      cutout: '82%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
    plugins: [
      {
        id: 'centerText',
        afterDraw(chart) {
          const {
            ctx: chartCtx,
            chartArea: { bottom, left, right },
          } = chart;
          const centerX = (left + right) / 2;
          const centerY = bottom - 10;

          chartCtx.save();
          chartCtx.textAlign = 'center';
          chartCtx.textBaseline = 'middle';
          chartCtx.font = '800 28px IBM Plex Mono';
          chartCtx.fillStyle = results.roiPercent >= 200 ? '#007A35' : '#132144';
          chartCtx.fillText(`${Math.round(results.roiPercent)}%`, centerX, centerY - 25);
          chartCtx.font = '700 10px IBM Plex Sans';
          chartCtx.fillStyle = '#64748B';
          chartCtx.fillText('RETURN ON INVESTMENT', centerX, centerY + 5);
          chartCtx.restore();
        },
      },
    ],
  });
}

function renderChart5(Chart, refs, inputs, config) {
  destroyChart('chart5');
  const drivers = computeSensitivityDrivers(inputs, config);
  const ctx = refs.elements.chart5.getContext('2d');

  charts.chart5 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: drivers.map((driver) => driver.label),
      datasets: [
        {
          data: drivers.map((driver) => driver.swing),
          backgroundColor: (barCtx) => (barCtx.raw > 50 ? '#1F60AE' : '#60A5FA'),
          borderRadius: 6,
          barPercentage: 0.5,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipCtx) => ` ±${tooltipCtx.parsed.x.toFixed(1)}% ROI impact`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#F1F5F9' },
          title: { display: true, text: 'ROI Sensitivity (± pp)', font: { size: 10 } },
        },
        y: { grid: { display: false } },
      },
    },
  });
}
