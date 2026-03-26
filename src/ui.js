import { APP_CONFIG } from './config.js';
import { computeFiveYearTco, fmt, fmtB, fmtM, fmtPct } from './model.js';

export function renderLens(refs, activeLens, config = APP_CONFIG) {
  const lensContent = config.lenses[activeLens];

  Object.entries(refs.lensButtons).forEach(([lens, button]) => {
    if (!button) {
      return;
    }

    const isActive = lens === activeLens;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  refs.elements['intro-narrative-text'].textContent = lensContent.intro;
  refs.labels.primaryKpi.textContent = lensContent.primaryKpiLabel;
  refs.labels.primaryKpiSub.textContent = lensContent.primaryKpiSub;
  refs.labels.roiKpi.textContent = lensContent.roiLabel;
  refs.labels.modernizationCost.textContent = lensContent.modernizationCostLabel;
}

export function renderDashboard(refs, inputs, results, scenarios, activeLens, config = APP_CONFIG) {
  renderLens(refs, activeLens, config);
  renderSliderState(refs, inputs, config);
  renderSummary(refs, inputs, results, config);
  renderAuditTable(refs, inputs, results, config);
  renderScenarioTable(refs, scenarios, config);
  renderBenchmarkPanel(refs, inputs, results, config);
  renderAccessibilityDescriptions(refs, inputs, results, scenarios);
}

function renderSliderState(refs, inputs, config) {
  const sliderConfig = [
    ['crmCapture', 'crmCaptureBadge'],
    ['poolingGranularity', 'poolingGranularityBadge'],
    ['modelRiskBuffer', 'modelRiskBufferBadge'],
  ];

  sliderConfig.forEach(([inputId, badgeId]) => {
    const slider = refs.elements[inputId];
    const badge = refs.elements[badgeId];
    const rules = config.inputs[inputId];
    const value = inputs[inputId];
    const pct = ((value - rules.min) / (rules.max - rules.min)) * 100;

    if (slider) {
      slider.style.setProperty('--pct', `${pct.toFixed(1)}%`);
    }
    if (badge) {
      badge.textContent = `${value.toFixed(1)}%`;
    }
  });

  refs.elements.capImpBadge.textContent = `${inputs.capImprovement.toFixed(1)}%`;
}

function renderSummary(refs, inputs, results, config) {
  refs.elements.capValPreview.textContent = fmtM(results.capitalValue);
  refs.elements.opSavPreview.textContent = fmtM(results.operationalSavings);

  refs.elements['es-total'].textContent = fmtM(results.totalValue);
  refs.elements['es-lending'].textContent = fmtB(results.lendingCapacity);
  refs.elements['es-roi'].textContent = fmtPct(results.roiPercent);

  refs.elements['ki-rwaRed'].textContent = fmtB(results.rwaReduction);
  refs.elements['ki-capRel'].textContent = fmtB(results.capitalReleased);
  refs.elements['ki-lending'].textContent = fmtB(results.lendingCapacity);
  refs.elements['ki-capVal'].textContent = fmtM(results.capitalValue);
  refs.elements['ki-opSav'].textContent = fmtM(results.operationalSavings);
  refs.elements['ki-total'].textContent = fmtM(results.totalValue);
  refs.elements['ki-roi'].textContent = fmtPct(results.roiPercent);
  refs.elements['ki-payback'].textContent = Number.isFinite(results.paybackMonths)
    ? `Payback: ${results.paybackMonths.toFixed(1)} months`
    : 'Payback: N/A';

  const bankName = inputs.bankName || 'The bank';
  refs.elements.takeaway.textContent =
    `${bankName} is modeled at ${fmtM(results.totalValue)} in annual value: ` +
    `${fmtM(results.capitalValue)} from capital efficiency and ${fmtM(results.operationalSavings)} from operational savings. ` +
    `That implies ${fmtPct(results.roiPercent)} ROI and ` +
    (Number.isFinite(results.paybackMonths)
      ? `${results.paybackMonths.toFixed(1)} months to payback.`
      : 'no defined payback under the current inputs.');

  const monthly = results.totalValue / 12;
  const threeYearDeferral = results.totalValue * 3;
  refs.elements['inaction-monthly'].textContent = fmtM(monthly);
  refs.elements['inaction-annual'].textContent = `${fmtM(results.totalValue)} lost in 12 months`;
  refs.elements['inaction-text'].textContent =
    `At ${fmtM(results.totalValue)} of modeled annual value, each month of delay defers about ${fmtM(monthly)} in combined capital efficiency and operational savings.`;
  refs.elements['inaction-extended'].textContent =
    `Over a 3-year deferral, the indicative opportunity cost reaches ${fmtM(threeYearDeferral)} against a one-time modernization cost of ${fmtM(inputs.modernizationCost)}. Regulatory timing and execution risk still require separate validation outside this estimator.`;

  refs.elements['chart2-title'].textContent =
    `Annual Value Build-Up: What Drives the ${fmtM(results.totalValue)} Total`;
}

function renderAuditTable(refs, inputs, results, config) {
  const rows = [
    sectionHeader('Capital Stream'),
    dataRow([
      'Cap Improvement',
      `CRM(${fmt(inputs.crmCapture, 1)}%) + Pool(${fmt(inputs.poolingGranularity, 1)}%) + MRB(${fmt(inputs.modelRiskBuffer, 1)}%)`,
      'Sum of the three capital-efficiency levers',
      `${fmt(inputs.capImprovement, 1)}%`,
    ]),
    dataRow([
      'RWA Reduction',
      `${fmt(inputs.rwa, 1)}B × ${fmt(inputs.capImprovement, 1)}% ÷ 100`,
      'Risk-weighted assets freed by the modeled improvement',
      fmtB(results.rwaReduction),
    ]),
    dataRow([
      'Capital Released',
      `${fmt(results.rwaReduction, 2)}B × ${fmt(inputs.cet1, 1)}% ÷ 100`,
      'CET1 capital no longer tied up against reduced RWA',
      fmtB(results.capitalReleased),
    ]),
    dataRow([
      'Lending Capacity',
      `${fmt(results.capitalReleased, 2)}B × ${config.assumptions.lendingMultiplier}`,
      `Indicative lending proxy using a ${config.assumptions.lendingMultiplier}x multiplier`,
      fmtB(results.lendingCapacity),
    ]),
    dataRow([
      'Capital Value',
      `${fmt(results.capitalReleased, 2)}B × ${fmt(inputs.coc, 1)}% ÷ 100 × 1000`,
      'Indicative annual return on released capital at the hurdle rate',
      fmtM(results.capitalValue),
    ]),
    sectionHeader('Operational Stream'),
    dataRow([
      'Advanced Line Savings',
      `${fmt(inputs.toolConsolidation, 1)} + ${fmt(inputs.infraSavings, 1)} + ${fmt(inputs.reportingAutomation, 1)} + ${fmt(inputs.modelDeployment, 1)}`,
      'Direct savings line items entered above',
      fmtM(results.advancedLineSavings),
    ]),
    dataRow([
      'Validation Savings',
      `${fmt(inputs.analyticsCost, 1)} × ${fmt(inputs.validationReduction, 1)}% ÷ 100`,
      'Validation effort reduction applied to current analytics cost',
      fmtM(results.validationSavings),
    ]),
    dataRow([
      'Operational Savings',
      'advancedLineSavings + validationSavings',
      'Combined annual operating benefit',
      fmtM(results.operationalSavings),
    ]),
    sectionHeader('Summary'),
    dataRow([
      'Total Annual Value',
      'capitalValue + operationalSavings',
      'Combined annual value from both streams',
      fmtM(results.totalValue),
    ]),
    dataRow([
      'ROI',
      inputs.modernizationCost > 0
        ? `totalValue ÷ ${fmt(inputs.modernizationCost, 1)}M × 100`
        : 'modernizationCost = 0',
      'Simple annualized ROI against one-time modernization cost',
      fmtPct(results.roiPercent),
    ]),
    dataRow([
      'Payback',
      Number.isFinite(results.paybackMonths)
        ? `${fmt(inputs.modernizationCost, 1)}M ÷ (totalValue ÷ 12)`
        : 'No positive payback under current inputs',
      'Months until modeled annual value repays the investment',
      Number.isFinite(results.paybackMonths) ? `${results.paybackMonths.toFixed(1)} months` : 'N/A',
    ]),
  ];

  refs.elements.auditTableBody.innerHTML = rows.join('');
}

function renderScenarioTable(refs, scenarios, config) {
  const rows = [
    [
      'Cap Efficiency %',
      fmtPct(scenarios.conservative.inputs.capImprovement),
      fmtPct(scenarios.base.inputs.capImprovement),
      fmtPct(scenarios.optimistic.inputs.capImprovement),
    ],
    [
      'Op Savings ($M)',
      fmtM(scenarios.conservative.results.operationalSavings),
      fmtM(scenarios.base.results.operationalSavings),
      fmtM(scenarios.optimistic.results.operationalSavings),
    ],
    [
      'Capital Value ($M)',
      fmtM(scenarios.conservative.results.capitalValue),
      fmtM(scenarios.base.results.capitalValue),
      fmtM(scenarios.optimistic.results.capitalValue),
    ],
    [
      'Total Value ($M)',
      fmtM(scenarios.conservative.results.totalValue),
      fmtM(scenarios.base.results.totalValue),
      fmtM(scenarios.optimistic.results.totalValue),
    ],
    [
      'ROI (%)',
      fmtPct(scenarios.conservative.results.roiPercent),
      fmtPct(scenarios.base.results.roiPercent),
      fmtPct(scenarios.optimistic.results.roiPercent),
    ],
    [
      'Payback (months)',
      formatPayback(scenarios.conservative.results.paybackMonths),
      formatPayback(scenarios.base.results.paybackMonths),
      formatPayback(scenarios.optimistic.results.paybackMonths),
    ],
    [
      '5-yr TCO Savings ($M)',
      fmtM(computeFiveYearTco(scenarios.conservative.inputs, scenarios.conservative.results, config.assumptions)),
      fmtM(computeFiveYearTco(scenarios.base.inputs, scenarios.base.results, config.assumptions)),
      fmtM(computeFiveYearTco(scenarios.optimistic.inputs, scenarios.optimistic.results, config.assumptions)),
    ],
  ];

  refs.elements.scenarioTableBody.innerHTML = rows
    .map(
      ([label, conservative, base, optimistic]) =>
        `<tr><td>${label}</td><td>${conservative}</td><td class="base">${base}</td><td>${optimistic}</td></tr>`
    )
    .join('');
}

function renderBenchmarkPanel(refs, inputs, results, config) {
  const bankName = inputs.bankName || 'The bank';
  const spendPerRwa = inputs.rwa > 0 ? inputs.analyticsCost / inputs.rwa : 0;
  const peerAverage = config.assumptions.benchmarkPeerAvgSpendPerRwa;
  const roiRange = config.assumptions.roiBenchmarkRange;
  const roiPosition =
    results.roiPercent >= roiRange.high
      ? 'above'
      : results.roiPercent >= roiRange.low
        ? 'within'
        : 'below';

  refs.elements['bench-bns-spend-rwa'].textContent = `$${spendPerRwa.toFixed(3)}M/$B`;
  refs.elements['bench-bns-opp-roi'].textContent = `~${Math.round(results.roiPercent)}%`;
  refs.elements.gaugeBenchmarkCallout.textContent =
    `Indicative external case studies often cite ${roiRange.low}-${roiRange.high}% ROI for large-scale platform modernization. This estimate sits ${roiPosition} that reference range.`;
  refs.elements.tornadoCallout.textContent =
    `Sensitivity ranking is illustrative only: it shows which modeled levers move ROI the most under a +/-20% assumption swing.`;

  const position =
    spendPerRwa > peerAverage * 1.05 ? 'above' : spendPerRwa < peerAverage * 0.95 ? 'below' : 'near';
  refs.elements.benchPositionSummary.textContent =
    `${bankName} is modeled at $${spendPerRwa.toFixed(3)}M of analytics spend per $B RWA versus an indicative peer reference of $${peerAverage.toFixed(3)}M/$B, placing it ${position} that reference point.`;

  if (refs.labels.benchmarkNote) {
    refs.labels.benchmarkNote.textContent = config.assumptions.benchmarkDisclosure;
  }
}

function renderAccessibilityDescriptions(refs, inputs, results, scenarios) {
  const descriptions = {
    chart1:
      `Net cumulative benefit starts at negative ${fmtM(inputs.modernizationCost)} in year 0 and reaches ${fmtM(results.totalValue * 5 - inputs.modernizationCost)} by year 5.`,
    chart2:
      `Waterfall chart shows operational savings and capital value building to ${fmtM(results.totalValue)} in modeled annual value.`,
    chart3:
      `Annual savings chart shows the operating-cost savings trend over five years from the current analytics cost baseline.`,
    chart4:
      `ROI gauge reads ${fmtPct(results.roiPercent)} using annual value against one-time modernization cost.`,
    chart5:
      `Sensitivity ranking compares the modeled ROI swing across capital-efficiency, modernization cost, hurdle rate, and operational savings levers.`,
  };

  Object.entries(descriptions).forEach(([id, label]) => {
    const canvas = refs.elements[id];
    if (!canvas) {
      return;
    }

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  });

  refs.elements.scenarioTableBody.closest('table')?.setAttribute(
    'aria-label',
    `Scenario comparison with conservative, base, and optimistic cases derived from the same bank profile. Base-case total annual value is ${fmtM(scenarios.base.results.totalValue)}.`
  );
}

function sectionHeader(label) {
  return `<tr class="audit-section-header"><td colspan="4">${label}</td></tr>`;
}

function dataRow([name, expression, meaning, result]) {
  return `<tr><td>${name}</td><td>${expression}</td><td>${meaning}</td><td>${result}</td></tr>`;
}

function formatPayback(value) {
  return Number.isFinite(value) ? value.toFixed(1) : 'N/A';
}
