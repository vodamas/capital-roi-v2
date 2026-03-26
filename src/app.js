(function () {
  'use strict';

  // ─── CONFIG ──────────────────────────────────────────────────────────────
  var APP_CONFIG = {
    assumptions: {
      lendingMultiplier: 10,
      benchmarkPeerAvgSpendPerRwa: 0.059,
      roiBenchmarkRange: { low: 200, high: 500 },
      annualAnalyticsInflation: 0.03,
      scenarioFactors: { conservative: 0.7, optimistic: 1.3 },
      bnsSharesMillions: 900,
      benchmarkDisclosure:
        'Benchmark figures are indicative reference points compiled from public filings and industry commentary; they are not embedded evidence for the model itself.',
    },
    inputs: {
      bankName:            { defaultValue: 'Scotiabank (BNS)' },
      rwa:                 { defaultValue: 474.3, min: 0, max: 5000 },
      cet1:                { defaultValue: 13.0,  min: 0, max: 100 },
      platformCost:        { defaultValue: 28,    min: 0, max: 1000 },
      modernizationCost:   { defaultValue: 20,    min: 0, max: 1000 },
      coc:                 { defaultValue: 11,    min: 0, max: 100 },
      crmCapture:          { defaultValue: 0.5,   min: 0, max: 2 },
      poolingGranularity:  { defaultValue: 0.7,   min: 0, max: 2 },
      modelRiskBuffer:     { defaultValue: 0.3,   min: 0, max: 2 },
      toolConsolidation:   { defaultValue: 4.0,   min: 0, max: 1000 },
      infraSavings:        { defaultValue: 3.0,   min: 0, max: 1000 },
      reportingAutomation: { defaultValue: 2.0,   min: 0, max: 1000 },
      modelDeployment:     { defaultValue: 3.0,   min: 0, max: 1000 },
      validationReduction: { defaultValue: 10,    min: 0, max: 100 },
    },
    lenses: {
      cro: {
        intro: "This estimator quantifies the financial case for modernizing Scotiabank's capital analytics infrastructure, focusing on RWA Precision and Regulatory Buffers. Adjust bank profile inputs and transformation assumptions to model two independent value streams — capital efficiency gains and operational cost savings — that together define the ROI and payback period of the modernization program. Start with the Bank Profile, then tune the Transformation Assumptions; all charts and tables update live.",
        primaryKpiLabel:      'RWA Precision Gain',
        primaryKpiSub:        'Capital Velocity',
        roiLabel:             'Risk-Adjusted ROI',
        modernizationCostLabel: 'Risk Transform. Cost ($M)',
        rwaRedLabel:          'RWA Reduction',
        capRelLabel:          'Capital Released',
        opSavLabel:           'Operational Savings ($M)',
        roiKpiLabel:          'Return on Investment',
      },
      cfo: {
        intro: "This estimator quantifies the financial case for modernizing Scotiabank's capital analytics infrastructure, focusing on Economic Value, Capital Deployment, and Shareholder Impact. Adjust bank profile inputs and transformation assumptions to model capital efficiency gains and operational cost savings. All outputs update live.",
        primaryKpiLabel:      'Economic Value Add',
        primaryKpiSub:        'Released Capital',
        roiLabel:             'Strategic Return on Investment',
        modernizationCostLabel: 'Program Investment ($M)',
        rwaRedLabel:          'Capital Release',
        capRelLabel:          'Capital Released (CET1)',
        opSavLabel:           'Cost Efficiency ($M)',
        roiKpiLabel:          'Strategic Return on Investment',
      },
    },
  };

  var INPUT_IDS = [
    'bankName', 'rwa', 'cet1', 'platformCost', 'modernizationCost', 'coc',
    'crmCapture', 'poolingGranularity', 'modelRiskBuffer',
    'toolConsolidation', 'infraSavings', 'reportingAutomation',
    'modelDeployment', 'validationReduction',
  ];

  // ─── MODEL ───────────────────────────────────────────────────────────────
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function computeCapImprovement(inputs) {
    return inputs.crmCapture + inputs.poolingGranularity + inputs.modelRiskBuffer;
  }

  function compute(inputs) {
    var advancedLineSavings = inputs.toolConsolidation + inputs.infraSavings +
      inputs.reportingAutomation + inputs.modelDeployment;
    var validationSavings   = inputs.platformCost * (inputs.validationReduction / 100);
    var operationalSavings  = advancedLineSavings + validationSavings;
    var rwaReduction        = inputs.rwa * (inputs.capImprovement / 100);
    var capitalReleased     = rwaReduction * (inputs.cet1 / 100);
    var lendingCapacity     = capitalReleased * APP_CONFIG.assumptions.lendingMultiplier;
    var capitalValue        = capitalReleased * (inputs.coc / 100) * 1000;
    var totalValue          = capitalValue + operationalSavings;
    var roiPercent          = inputs.modernizationCost > 0 ? (totalValue / inputs.modernizationCost) * 100 : 0;
    var paybackMonths       = (totalValue > 0 && inputs.modernizationCost > 0)
      ? inputs.modernizationCost / (totalValue / 12) : Infinity;

    return {
      advancedLineSavings: advancedLineSavings,
      validationSavings:   validationSavings,
      operationalSavings:  operationalSavings,
      rwaReduction:        rwaReduction,
      capitalReleased:     capitalReleased,
      lendingCapacity:     lendingCapacity,
      capitalValue:        capitalValue,
      totalValue:          totalValue,
      roiPercent:          roiPercent,
      paybackMonths:       paybackMonths,
    };
  }

  function computeNpvIrr(inputs, results) {
    var npv = -inputs.modernizationCost;
    for (var t = 1; t <= 5; t++) {
      npv += results.totalValue / Math.pow(1 + inputs.coc / 100, t);
    }
    var lo = 0, hi = 50, irr = 0;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      var trial = -inputs.modernizationCost;
      for (var t2 = 1; t2 <= 5; t2++) trial += results.totalValue / Math.pow(1 + mid / 100, t2);
      if (trial > 0) { lo = mid; } else { hi = mid; }
      irr = mid;
    }
    return { npv: npv, irr: irr };
  }

  function computePlMetrics(inputs, results) {
    var shares = APP_CONFIG.assumptions.bnsSharesMillions;
    var rotceBps = results.capitalReleased > 0
      ? (results.capitalValue / (results.capitalReleased * 1000)) * 10000 : 0;
    return {
      rotceBps:       rotceBps,
      epsAccretion:   results.totalValue / shares,
      opLeveragePct:  inputs.platformCost > 0 ? (results.operationalSavings / inputs.platformCost) * 100 : 0,
    };
  }

  function computeFiveYearTco(inputs, results) {
    var total = 0;
    var costWithModernization = Math.max(0, inputs.platformCost - results.operationalSavings);
    for (var year = 1; year <= 5; year++) {
      var costWithout = inputs.platformCost * Math.pow(1 + APP_CONFIG.assumptions.annualAnalyticsInflation, year);
      total += costWithout - costWithModernization;
    }
    return total;
  }

  function scaleScenarioInputs(baseInputs, factor) {
    var scaled = Object.assign({}, baseInputs, {
      crmCapture:          clamp(baseInputs.crmCapture          * factor, 0, 2),
      poolingGranularity:  clamp(baseInputs.poolingGranularity  * factor, 0, 2),
      modelRiskBuffer:     clamp(baseInputs.modelRiskBuffer      * factor, 0, 2),
      toolConsolidation:   clamp(baseInputs.toolConsolidation   * factor, 0, 1000),
      infraSavings:        clamp(baseInputs.infraSavings         * factor, 0, 1000),
      reportingAutomation: clamp(baseInputs.reportingAutomation * factor, 0, 1000),
      modelDeployment:     clamp(baseInputs.modelDeployment      * factor, 0, 1000),
      validationReduction: clamp(baseInputs.validationReduction * factor, 0, 100),
    });
    scaled.capImprovement = computeCapImprovement(scaled);
    return scaled;
  }

  function buildScenarioSet(baseInputs) {
    var cons = scaleScenarioInputs(baseInputs, APP_CONFIG.assumptions.scenarioFactors.conservative);
    var opti = scaleScenarioInputs(baseInputs, APP_CONFIG.assumptions.scenarioFactors.optimistic);
    return {
      conservative: { inputs: cons, results: compute(cons) },
      base:         { inputs: baseInputs, results: compute(baseInputs) },
      optimistic:   { inputs: opti, results: compute(opti) },
    };
  }

  function computeSensitivityDrivers(inputs) {
    var delta = 0.2;
    function roiWith(overrides) {
      var candidate = Object.assign({}, inputs, overrides);
      candidate.capImprovement = computeCapImprovement(candidate);
      return compute(candidate).roiPercent;
    }
    var drivers = [
      {
        label: 'RWA Precision',
        up: roiWith({ crmCapture: clamp(inputs.crmCapture*(1+delta),0,2), poolingGranularity: clamp(inputs.poolingGranularity*(1+delta),0,2), modelRiskBuffer: clamp(inputs.modelRiskBuffer*(1+delta),0,2) }),
        dn: roiWith({ crmCapture: clamp(inputs.crmCapture*(1-delta),0,2), poolingGranularity: clamp(inputs.poolingGranularity*(1-delta),0,2), modelRiskBuffer: clamp(inputs.modelRiskBuffer*(1-delta),0,2) }),
      },
      {
        label: 'Program Cost',
        up: roiWith({ modernizationCost: clamp(inputs.modernizationCost*(1+delta),0,1000) }),
        dn: roiWith({ modernizationCost: clamp(inputs.modernizationCost*(1-delta),0,1000) }),
      },
      {
        label: 'Hurdle Rate',
        up: roiWith({ coc: clamp(inputs.coc*(1+delta),0,100) }),
        dn: roiWith({ coc: clamp(inputs.coc*(1-delta),0,100) }),
      },
      {
        label: 'Op Savings',
        up: roiWith({ toolConsolidation: clamp(inputs.toolConsolidation*(1+delta),0,1000), infraSavings: clamp(inputs.infraSavings*(1+delta),0,1000), reportingAutomation: clamp(inputs.reportingAutomation*(1+delta),0,1000), modelDeployment: clamp(inputs.modelDeployment*(1+delta),0,1000), validationReduction: clamp(inputs.validationReduction*(1+delta),0,100) }),
        dn: roiWith({ toolConsolidation: clamp(inputs.toolConsolidation*(1-delta),0,1000), infraSavings: clamp(inputs.infraSavings*(1-delta),0,1000), reportingAutomation: clamp(inputs.reportingAutomation*(1-delta),0,1000), modelDeployment: clamp(inputs.modelDeployment*(1-delta),0,1000), validationReduction: clamp(inputs.validationReduction*(1-delta),0,100) }),
      },
    ];
    drivers.forEach(function(d) { d.swing = Math.abs(d.up - d.dn); });
    drivers.sort(function(a,b){ return b.swing - a.swing; });
    return drivers;
  }

  // ─── FORMATTERS ──────────────────────────────────────────────────────────
  function fmt(value, digits) {
    var d = (digits == null) ? 2 : digits;
    return value.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtM(v)   { return 'C$' + fmt(v, 1) + 'M'; }
  function fmtB(v)   { return 'C$' + fmt(v, 2) + 'B'; }
  function fmtPct(v) { return fmt(v, 1) + '%'; }

  // ─── DOM ─────────────────────────────────────────────────────────────────
  function cacheDom(doc) {
    var ids = INPUT_IDS.concat([
      'intro-narrative-text',
      'es-primary-label', 'es-total', 'es-lending', 'es-roi-label', 'es-roi',
      'es-primary-sub',
      'cfo-summary-card', 'cfo-npv', 'cfo-irr', 'cfo-payback',
      'crmCaptureBadge', 'poolingGranularityBadge', 'modelRiskBufferBadge',
      'capImpBadge', 'capValPreview', 'opSavPreview',
      'ki-rwaRed-label', 'ki-rwaRed', 'ki-capRel-label', 'ki-capRel',
      'ki-lending', 'ki-capVal', 'ki-opSav-label', 'ki-opSav',
      'ki-total', 'ki-roi-label', 'ki-roi', 'ki-payback',
      'takeaway',
      'inaction-monthly', 'inaction-annual', 'inaction-text', 'inaction-extended',
      'chart1', 'chart2', 'chart2-title', 'chart3', 'chart4', 'chart5',
      'chart4-cro-wrap', 'chart4-cfo-wrap', 'chart4-gauge-legend',
      'chart4-title', 'chart4-subtitle',
      'chart5-title', 'chart5-subtitle',
      'cfo-rotce-bar', 'cfo-rotce-val',
      'cfo-eps-bar',   'cfo-eps-val',
      'cfo-oplev-bar', 'cfo-oplev-val',
      'gaugeBenchmarkCallout', 'tornadoCallout',
      'scenarioTableBody', 'auditTableBody',
      'benchTrigger', 'benchChevron', 'benchBody',
      'bench-bns-spend-rwa', 'bench-bns-opp-roi',
      'benchPositionSummary',
      'modernizationCostLabel',
    ]);
    var elements = {};
    ids.forEach(function(id) { elements[id] = doc.getElementById(id); });
    return {
      elements: elements,
      lensButtons: {
        cro: doc.getElementById('lens-cro'),
        cfo: doc.getElementById('lens-cfo'),
      },
    };
  }

  function normalizeInputs(raw) {
    var normalized = {
      bankName: (typeof raw.bankName === 'string' && raw.bankName.trim())
        ? raw.bankName.trim()
        : APP_CONFIG.inputs.bankName.defaultValue,
    };
    Object.keys(APP_CONFIG.inputs).forEach(function(id) {
      if (id === 'bankName') return;
      var rules = APP_CONFIG.inputs[id];
      var parsed = parseFloat(raw[id]);
      var fallback = isFinite(parsed) ? parsed : rules.defaultValue;
      normalized[id] = clamp(fallback, rules.min, rules.max);
    });
    normalized.capImprovement = computeCapImprovement(normalized);
    return normalized;
  }

  function readInputs(refs) {
    var raw = {};
    INPUT_IDS.forEach(function(id) {
      raw[id] = refs.elements[id] ? refs.elements[id].value : '';
    });
    return normalizeInputs(raw);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  function renderLens(refs, activeLens) {
    var lensContent = APP_CONFIG.lenses[activeLens];
    Object.keys(refs.lensButtons).forEach(function(lens) {
      var btn = refs.lensButtons[lens];
      if (!btn) return;
      var active = (lens === activeLens);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    var el = refs.elements;
    el['intro-narrative-text'].textContent = lensContent.intro;
    el['es-primary-label'].textContent     = lensContent.primaryKpiLabel;
    el['es-primary-sub'].textContent       = lensContent.primaryKpiSub;
    el['es-roi-label'].textContent         = lensContent.roiLabel;
    if (el['modernizationCostLabel'] && el['modernizationCostLabel'].childNodes[0]) {
      el['modernizationCostLabel'].childNodes[0].nodeValue = lensContent.modernizationCostLabel + ' ';
    }
    el['ki-rwaRed-label'].textContent      = lensContent.rwaRedLabel;
    el['ki-capRel-label'].textContent      = lensContent.capRelLabel;
    el['ki-opSav-label'].textContent       = lensContent.opSavLabel;
    el['ki-roi-label'].textContent         = lensContent.roiKpiLabel;

    var isCfo = (activeLens === 'cfo');
    el['cfo-summary-card'].style.display = isCfo ? '' : 'none';

    // Chart 4: gauge (CRO) / P&L bars (CFO)
    el['chart4-cro-wrap'].style.display   = isCfo ? 'none' : 'flex';
    el['chart4-cfo-wrap'].style.display   = isCfo ? '' : 'none';
    el['chart4-gauge-legend'].style.display = isCfo ? 'none' : 'flex';
    if (isCfo) {
      el['chart4-title'].textContent    = 'P&L Impact Summary';
      el['chart4-subtitle'].textContent = 'Horizontal bars show shareholder-level impact: ROTCE improvement, EPS accretion, and operational leverage gain.';
    } else {
      el['chart4-title'].textContent    = 'ROI Gauge';
      el['chart4-subtitle'].textContent = 'Speedometer arc — colored zones: gray <100%, amber 100-200%, green 200-500%, deep green >500%.';
    }

    // Chart 5: tornado (CRO) / budget reallocation (CFO)
    if (isCfo) {
      el['chart5-title'].textContent    = 'Budget Reallocation Potential';
      el['chart5-subtitle'].textContent = 'Illustrative — shows how total annual value could be deployed across strategic priorities.';
    } else {
      el['chart5-title'].textContent    = 'Impact Driver Ranking — ROI Sensitivity';
      el['chart5-subtitle'].textContent = 'Butterfly chart — left bar = downside (-20%), right bar = upside (+20%). Width = ROI swing.';
    }
  }

  function renderSliderState(refs, inputs) {
    [
      ['crmCapture',         'crmCaptureBadge'],
      ['poolingGranularity', 'poolingGranularityBadge'],
      ['modelRiskBuffer',    'modelRiskBufferBadge'],
    ].forEach(function(pair) {
      var inputId = pair[0], badgeId = pair[1];
      var slider = refs.elements[inputId];
      var badge  = refs.elements[badgeId];
      var rules  = APP_CONFIG.inputs[inputId];
      var value  = inputs[inputId];
      var pct    = ((value - rules.min) / (rules.max - rules.min)) * 100;
      if (slider) slider.style.setProperty('--pct', pct.toFixed(1) + '%');
      if (badge)  badge.textContent = value.toFixed(1) + '%';
    });
    refs.elements.capImpBadge.textContent = inputs.capImprovement.toFixed(1) + '%';
  }

  function renderSummary(refs, inputs, results, activeLens) {
    var el = refs.elements;
    el.capValPreview.textContent   = fmtM(results.capitalValue);
    el.opSavPreview.textContent    = fmtM(results.operationalSavings);
    el['es-total'].textContent     = fmtM(results.totalValue);
    el['es-lending'].textContent   = fmtB(results.lendingCapacity);
    el['es-roi'].textContent       = fmtPct(results.roiPercent);
    el['ki-rwaRed'].textContent    = fmtB(results.rwaReduction);
    el['ki-capRel'].textContent    = fmtB(results.capitalReleased);
    el['ki-lending'].textContent   = fmtB(results.lendingCapacity);
    el['ki-capVal'].textContent    = fmtM(results.capitalValue);
    el['ki-opSav'].textContent     = fmtM(results.operationalSavings);
    el['ki-total'].textContent     = fmtM(results.totalValue);
    el['ki-roi'].textContent       = fmtPct(results.roiPercent);
    el['ki-payback'].textContent   = isFinite(results.paybackMonths)
      ? 'Payback: ' + results.paybackMonths.toFixed(1) + ' months'
      : 'Payback: N/A';

    var bankName = inputs.bankName || 'The bank';
    el.takeaway.textContent =
      bankName + ' is modeled at ' + fmtM(results.totalValue) + ' in annual value: ' +
      fmtM(results.capitalValue) + ' from capital efficiency and ' +
      fmtM(results.operationalSavings) + ' from operational savings. That implies ' +
      fmtPct(results.roiPercent) + ' ROI and ' +
      (isFinite(results.paybackMonths)
        ? results.paybackMonths.toFixed(1) + ' months to payback.'
        : 'no defined payback under the current inputs.');

    var monthly = results.totalValue / 12;
    el['inaction-monthly'].textContent = fmtM(monthly);
    el['inaction-annual'].textContent  = fmtM(results.totalValue) + ' lost in 12 months';
    el['inaction-text'].textContent    = 'At ' + fmtM(results.totalValue) +
      ' of modeled annual value, each month of delay defers about ' + fmtM(monthly) +
      ' in combined capital efficiency and operational savings.';
    el['inaction-extended'].textContent = 'Over a 3-year deferral, the indicative opportunity cost reaches ' +
      fmtM(results.totalValue * 3) + ' against a one-time modernization cost of ' +
      fmtM(inputs.modernizationCost) + '. Regulatory timing and execution risk still require separate validation.';
    el['chart2-title'].textContent = 'Annual Value Build-Up: What Drives the ' + fmtM(results.totalValue) + ' Total';
  }

  function renderCfoCard(refs, inputs, results) {
    var el = refs.elements;
    var fin = computeNpvIrr(inputs, results);
    el['cfo-npv'].textContent     = fmtM(fin.npv);
    el['cfo-irr'].textContent     = fmt(fin.irr, 0) + '%';
    el['cfo-payback'].textContent = isFinite(results.paybackMonths)
      ? results.paybackMonths.toFixed(1) + ' mo' : 'N/A';
  }

  function renderCfoPl(refs, inputs, results) {
    var el = refs.elements;
    var pl = computePlMetrics(inputs, results);
    var rotcePct = Math.min(pl.rotceBps / 300 * 100, 100);
    var epsPct   = Math.min((pl.epsAccretion / 0.5) * 100, 100);
    var levPct   = Math.min(pl.opLeveragePct, 100);
    el['cfo-rotce-bar'].style.width  = rotcePct.toFixed(1) + '%';
    el['cfo-eps-bar'].style.width    = epsPct.toFixed(1)   + '%';
    el['cfo-oplev-bar'].style.width  = levPct.toFixed(1)   + '%';
    el['cfo-rotce-val'].textContent  = '+' + fmt(pl.rotceBps, 0) + ' bps ROTCE';
    el['cfo-eps-val'].textContent    = '+C$' + fmt(pl.epsAccretion, 2) + '/share';
    el['cfo-oplev-val'].textContent  = fmt(pl.opLeveragePct, 0) + '% efficiency gain';
  }

  function renderAuditTable(refs, inputs, results) {
    function sh(label) {
      return '<tr class="audit-section-header"><td colspan="4">' + label + '</td></tr>';
    }
    function row(name, expr, meaning, result) {
      return '<tr><td>' + name + '</td><td>' + expr + '</td><td>' + meaning + '</td><td>' + result + '</td></tr>';
    }
    refs.elements.auditTableBody.innerHTML =
      sh('Capital Stream') +
      row('Cap Improvement',
        'CRM(' + fmt(inputs.crmCapture,1) + '%) + Pool(' + fmt(inputs.poolingGranularity,1) + '%) + MRB(' + fmt(inputs.modelRiskBuffer,1) + '%)',
        'Sum of the three capital-efficiency levers', fmt(inputs.capImprovement,1) + '%') +
      row('RWA Reduction',
        fmt(inputs.rwa,1) + 'B × ' + fmt(inputs.capImprovement,1) + '% ÷ 100',
        'Risk-weighted assets freed by the modeled improvement', fmtB(results.rwaReduction)) +
      row('Capital Released',
        fmt(results.rwaReduction,2) + 'B × ' + fmt(inputs.cet1,1) + '% ÷ 100',
        'CET1 capital no longer tied up against reduced RWA', fmtB(results.capitalReleased)) +
      row('Lending Capacity',
        fmt(results.capitalReleased,2) + 'B × ' + APP_CONFIG.assumptions.lendingMultiplier,
        'Indicative lending proxy using a ' + APP_CONFIG.assumptions.lendingMultiplier + 'x multiplier', fmtB(results.lendingCapacity)) +
      row('Capital Value',
        fmt(results.capitalReleased,2) + 'B × ' + fmt(inputs.coc,1) + '% ÷ 100 × 1000',
        'Indicative annual return on released capital at the hurdle rate', fmtM(results.capitalValue)) +
      sh('Operational Stream') +
      row('Advanced Line Savings',
        fmt(inputs.toolConsolidation,1) + ' + ' + fmt(inputs.infraSavings,1) + ' + ' + fmt(inputs.reportingAutomation,1) + ' + ' + fmt(inputs.modelDeployment,1),
        'Direct savings line items entered above', fmtM(results.advancedLineSavings)) +
      row('Validation Savings',
        fmt(inputs.platformCost,1) + ' × ' + fmt(inputs.validationReduction,1) + '% ÷ 100',
        'Validation effort reduction applied to current platform costs', fmtM(results.validationSavings)) +
      row('Operational Savings', 'advancedLineSavings + validationSavings', 'Combined annual operating benefit', fmtM(results.operationalSavings)) +
      sh('Summary') +
      row('Total Annual Value', 'capitalValue + operationalSavings', 'Combined annual value from both streams', fmtM(results.totalValue)) +
      row('ROI',
        inputs.modernizationCost > 0 ? 'totalValue ÷ ' + fmt(inputs.modernizationCost,1) + 'M × 100' : 'modernizationCost = 0',
        'Simple annualized ROI against one-time modernization cost', fmtPct(results.roiPercent)) +
      row('Payback',
        isFinite(results.paybackMonths) ? fmt(inputs.modernizationCost,1) + 'M ÷ (totalValue ÷ 12)' : 'No positive payback under current inputs',
        'Months until modeled annual value repays the investment',
        isFinite(results.paybackMonths) ? results.paybackMonths.toFixed(1) + ' months' : 'N/A');
  }

  function renderScenarioTable(refs, scenarios) {
    function pb(v) { return isFinite(v) ? v.toFixed(1) : 'N/A'; }
    var rows = [
      ['Cap Efficiency %', fmtPct(scenarios.conservative.inputs.capImprovement), fmtPct(scenarios.base.inputs.capImprovement), fmtPct(scenarios.optimistic.inputs.capImprovement)],
      ['Op Savings ($M)',  fmtM(scenarios.conservative.results.operationalSavings), fmtM(scenarios.base.results.operationalSavings), fmtM(scenarios.optimistic.results.operationalSavings)],
      ['Capital Value ($M)', fmtM(scenarios.conservative.results.capitalValue), fmtM(scenarios.base.results.capitalValue), fmtM(scenarios.optimistic.results.capitalValue)],
      ['Total Value ($M)', fmtM(scenarios.conservative.results.totalValue), fmtM(scenarios.base.results.totalValue), fmtM(scenarios.optimistic.results.totalValue)],
      ['ROI (%)',          fmtPct(scenarios.conservative.results.roiPercent), fmtPct(scenarios.base.results.roiPercent), fmtPct(scenarios.optimistic.results.roiPercent)],
      ['Payback (months)', pb(scenarios.conservative.results.paybackMonths), pb(scenarios.base.results.paybackMonths), pb(scenarios.optimistic.results.paybackMonths)],
      ['5-yr TCO Savings ($M)',
        fmtM(computeFiveYearTco(scenarios.conservative.inputs, scenarios.conservative.results)),
        fmtM(computeFiveYearTco(scenarios.base.inputs, scenarios.base.results)),
        fmtM(computeFiveYearTco(scenarios.optimistic.inputs, scenarios.optimistic.results))],
    ];
    refs.elements.scenarioTableBody.innerHTML = rows.map(function(r) {
      return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="base">' + r[2] + '</td><td>' + r[3] + '</td></tr>';
    }).join('');
  }

  function renderBenchmarkPanel(refs, inputs, results) {
    var bankName    = inputs.bankName || 'The bank';
    var spendPerRwa = inputs.rwa > 0 ? inputs.platformCost / inputs.rwa : 0;
    var peerAverage = APP_CONFIG.assumptions.benchmarkPeerAvgSpendPerRwa;
    var range       = APP_CONFIG.assumptions.roiBenchmarkRange;
    var roiPos      = results.roiPercent >= range.high ? 'above' : results.roiPercent >= range.low ? 'within' : 'below';
    var el          = refs.elements;

    el['bench-bns-spend-rwa'].textContent = '$' + spendPerRwa.toFixed(3) + 'M/$B';
    el['bench-bns-opp-roi'].textContent   = '~' + Math.round(results.roiPercent) + '%';
    el['gaugeBenchmarkCallout'].textContent =
      'Indicative external case studies often cite ' + range.low + '-' + range.high + '% ROI for large-scale platform modernization. This estimate sits ' + roiPos + ' that reference range.';
    el['tornadoCallout'].textContent =
      'Sensitivity ranking is illustrative: it shows which modeled levers move ROI the most under a ±20% assumption swing.';

    var pos = spendPerRwa > peerAverage * 1.05 ? 'above' : spendPerRwa < peerAverage * 0.95 ? 'below' : 'near';
    el['benchPositionSummary'].textContent =
      'At $' + spendPerRwa.toFixed(3) + 'M/B RWA, ' + bankName + ' is ' + pos + ' peer average ($' + peerAverage.toFixed(3) + 'M/B), meaning efficiency gains are achievable without being an outlier. ' +
      'The C$70–90M opportunity at ' + Math.round(results.roiPercent) + '% ROI compares favorably to peers RBC (~550%) and TD (~463%).';
  }

  function renderDashboard(refs, inputs, results, scenarios, activeLens) {
    renderLens(refs, activeLens);
    renderSliderState(refs, inputs);
    renderSummary(refs, inputs, results, activeLens);
    if (activeLens === 'cfo') {
      renderCfoCard(refs, inputs, results);
      renderCfoPl(refs, inputs, results);
    }
    renderAuditTable(refs, inputs, results);
    renderScenarioTable(refs, scenarios);
    renderBenchmarkPanel(refs, inputs, results);
  }

  // ─── CHARTS ──────────────────────────────────────────────────────────────
  var charts = {};
  function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  function renderCharts(refs, inputs, results, activeLens) {
    var Chart = window.Chart;
    if (!Chart) return;
    renderChart1(Chart, refs, inputs, results);
    renderChart2(Chart, refs, inputs, results);
    renderChart3(Chart, refs, inputs, results);
    if (activeLens === 'cfo') {
      destroyChart('chart4');
      renderChart5Cfo(Chart, refs, results);
    } else {
      renderChart4Cro(Chart, refs, results);
      renderChart5Cro(Chart, refs, inputs);
    }
  }

  function renderChart1(Chart, refs, inputs, results) {
    destroyChart('chart1');
    var years   = [0,1,2,3,4,5];
    var netData = years.map(function(y) { return results.totalValue * y - inputs.modernizationCost; });
    charts.chart1 = new Chart(refs.elements.chart1.getContext('2d'), {
      type: 'line',
      data: {
        labels: years.map(function(y) { return 'Year ' + y; }),
        datasets: [{
          label: 'Net Cumulative Benefit',
          data: netData,
          segment: { borderColor: function(ctx) { return ctx.p1.parsed.y >= 0 ? '#007A35' : '#EC111A'; } },
          backgroundColor: 'transparent',
          tension: 0.25,
          pointRadius: 5,
          pointBackgroundColor: netData.map(function(v) { return v >= 0 ? '#007A35' : '#EC111A'; }),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function(ctx) { return ' Net: C$' + ctx.parsed.y.toFixed(1) + 'M (' + (ctx.parsed.y >= 0 ? 'above' : 'below') + ' break-even)'; } } },
        },
        scales: {
          x: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Sans', size: 11 } } },
          y: {
            grid: { color: function(ctx) { return ctx.tick.value === 0 ? '#1F60AE' : '#eef0f6'; }, lineWidth: function(ctx) { return ctx.tick.value === 0 ? 2 : 1; } },
            ticks: { font: { family: 'IBM Plex Mono', size: 11 }, callback: function(v) { return 'C$' + Number(v).toFixed(0) + 'M'; } },
          },
        },
      },
      plugins: [{
        id: 'breakEvenLine',
        afterDraw: function(chart) {
          var s = chart.scales.y;
          if (!s) return;
          var y0 = s.getPixelForValue(0);
          var ctx = chart.ctx;
          ctx.save();
          ctx.setLineDash([6,4]);
          ctx.strokeStyle = '#1F60AE'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(chart.chartArea.left, y0); ctx.lineTo(chart.chartArea.right, y0); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '10px IBM Plex Sans'; ctx.fillStyle = '#1F60AE'; ctx.textAlign = 'left';
          ctx.fillText('Break-even', chart.chartArea.left + 4, y0 - 5);
          ctx.restore();
        },
      }],
    });
  }

  function renderChart2(Chart, refs, inputs, results) {
    destroyChart('chart2');
    var items = [
      { label: 'Tool Consol.',    value: inputs.toolConsolidation,     color: '#007A35' },
      { label: 'Infra Savings',   value: inputs.infraSavings,          color: '#007A35' },
      { label: 'Reporting Auto',  value: inputs.reportingAutomation,   color: '#007A35' },
      { label: 'Model Deploy',    value: inputs.modelDeployment,       color: '#007A35' },
      { label: 'Validation',      value: results.validationSavings,    color: '#007A35' },
      { label: 'Capital Value',   value: results.capitalValue,         color: '#1F60AE' },
      { label: 'Total',           value: results.totalValue,           color: '#132144' },
    ];
    var running = 0;
    var data = items.map(function(item, i) {
      if (i === items.length - 1) return { x: item.label, y: [0, results.totalValue] };
      var base = running; running += item.value;
      return { x: item.label, y: [base, running] };
    });
    charts.chart2 = new Chart(refs.elements.chart2.getContext('2d'), {
      type: 'bar',
      data: { datasets: [{ label: 'Value ($M)', data: data, backgroundColor: items.map(function(i) { return i.color; }), borderRadius: 4, barPercentage: 0.7 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function(ctx) { return ' C$' + (ctx.raw.y[1] - ctx.raw.y[0]).toFixed(1) + 'M'; } } },
        },
        scales: {
          x: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Sans', size: 10 } } },
          y: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 }, callback: function(v) { return 'C$' + Number(v).toFixed(0) + 'M'; } } },
        },
      },
    });
  }

  function renderChart3(Chart, refs, inputs, results) {
    destroyChart('chart3');
    var years = [1,2,3,4,5];
    var inf   = APP_CONFIG.assumptions.annualAnalyticsInflation;
    var costWithMod = Math.max(0, inputs.platformCost - results.operationalSavings);

    // Without modernization: inflated baseline each year
    var withoutData = years.map(function(y) { return inputs.platformCost * Math.pow(1+inf, y); });
    // With modernization: constant reduced cost
    var withData    = years.map(function() { return costWithMod; });
    // Savings = gap between the two
    var savingsData = years.map(function(y, i) { return withoutData[i] - withData[i]; });

    // Trend line on top of 'with modernization' bars
    charts.chart3 = new Chart(refs.elements.chart3.getContext('2d'), {
      type: 'bar',
      data: {
        labels: years.map(function(y) { return 'Year ' + y; }),
        datasets: [
          {
            label: 'Without Modernization',
            data: withoutData,
            backgroundColor: 'rgba(100,116,139,0.25)',
            borderColor: 'rgba(100,116,139,0.5)',
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.75,
            categoryPercentage: 0.55,
          },
          {
            label: 'With Modernization',
            data: withData,
            backgroundColor: 'rgba(0,122,53,0.75)',
            borderColor: '#007A35',
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.75,
            categoryPercentage: 0.55,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { font: { family: 'IBM Plex Sans', size: 10 }, boxWidth: 12, padding: 10 },
          },
          tooltip: {
            callbacks: {
              afterBody: function(ctx) {
                var i = ctx[0].dataIndex;
                return ['', 'Annual saving: C$' + savingsData[i].toFixed(1) + 'M'];
              },
            },
          },
        },
        scales: {
          x: { grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Sans', size: 11 } } },
          y: { beginAtZero: true, grid: { color: '#eef0f6' }, ticks: { font: { family: 'IBM Plex Mono', size: 11 }, callback: function(v) { return 'C$' + Number(v).toFixed(0) + 'M'; } } },
        },
      },
      plugins: [{
        id: 'deltaLabels',
        afterDatasetsDraw: function(chart) {
          var meta0 = chart.getDatasetMeta(0);
          var meta1 = chart.getDatasetMeta(1);
          var cctx  = chart.ctx;
          meta0.data.forEach(function(barA, i) {
            var barB = meta1.data[i];
            var gap  = savingsData[i];
            if (gap <= 0) return;
            var x    = (barA.x + barB.x) / 2;
            var y    = Math.min(barA.y, barB.y) - 6;
            cctx.save();
            cctx.font = 'bold 10px IBM Plex Mono';
            cctx.fillStyle = '#007A35';
            cctx.textAlign = 'center';
            cctx.textBaseline = 'bottom';
            cctx.fillText('+C$' + gap.toFixed(1) + 'M', x, y);
            cctx.restore();
          });
        },
      }],
    });
  }

  function renderChart4Cro(Chart, refs, results) {
    destroyChart('chart4');
    var roi       = results.roiPercent;
    var maxArc    = 700; // full arc represents 700% for visual clarity
    var clamped   = Math.min(roi, maxArc);
    var color     = roi < 100 ? '#94A3B8' : roi < 200 ? '#E06C00' : roi < 500 ? '#007A35' : '#004d20';

    charts.chart4 = new Chart(refs.elements.chart4.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['ROI', 'Benchmark', 'Remaining'],
        datasets: [{
          data: [
            Math.min(clamped, 100),                        // gray: 0-100
            Math.max(0, Math.min(clamped-100, 100)),       // amber: 100-200
            Math.max(0, Math.min(clamped-200, 300)),       // green: 200-500
            Math.max(0, Math.min(clamped-500, 200)),       // dark green: 500+
            Math.max(0, maxArc - clamped),                 // empty
          ],
          backgroundColor: ['#94A3B8', '#E06C00', '#007A35', '#004d20', '#F1F5F9'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
          weight: 1,
        }],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
      plugins: [{
        id: 'gaugeText',
        afterDraw: function(chart) {
          var cctx = chart.ctx;
          var left = chart.chartArea.left, right = chart.chartArea.right, bottom = chart.chartArea.bottom;
          var cx = (left + right) / 2, cy = bottom - 8;
          cctx.save();
          cctx.textAlign = 'center'; cctx.textBaseline = 'middle';
          cctx.font = '800 30px IBM Plex Mono';
          cctx.fillStyle = color;
          cctx.fillText(Math.round(roi) + '%', cx, cy - 26);
          cctx.font = '600 10px IBM Plex Sans';
          cctx.fillStyle = '#64748B';
          cctx.fillText('STRATEGIC ROI', cx, cy - 4);
          cctx.font = '500 9px IBM Plex Sans';
          cctx.fillStyle = '#94A3B8';
          cctx.fillText('200\u2013500% industry range', cx, cy + 10);
          cctx.restore();
        },
      }],
    });
  }

  function renderChart5Cro(Chart, refs, inputs) {
    destroyChart('chart5');
    var drivers  = computeSensitivityDrivers(inputs);
    var base     = drivers.map(function(d) { return (d.up + d.dn) / 2; });
    var upSwings = drivers.map(function(d) { return d.up - (d.up + d.dn) / 2; });
    var dnSwings = drivers.map(function(d) { return -((d.up + d.dn) / 2 - d.dn); });
    var labels   = drivers.map(function(d) { return d.label; });

    charts.chart5 = new Chart(refs.elements.chart5.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Downside (−20%)',
            data: dnSwings,
            backgroundColor: 'rgba(236,17,26,0.65)',
            borderRadius: 4,
            barPercentage: 0.55,
          },
          {
            label: 'Upside (+20%)',
            data: upSwings,
            backgroundColor: 'rgba(0,122,53,0.70)',
            borderRadius: 4,
            barPercentage: 0.55,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { family: 'IBM Plex Sans', size: 10 }, boxWidth: 12, padding: 10 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + (ctx.raw > 0 ? '+' : '') + ctx.parsed.x.toFixed(1) + ' pp ROI'; } } },
        },
        scales: {
          x: {
            grid: { color: '#F1F5F9' },
            title: { display: true, text: 'ROI Swing (pp)', font: { size: 10 } },
          },
          y: { grid: { display: false } },
        },
      },
    });
  }

  function renderChart5Cfo(Chart, refs, results) {
    destroyChart('chart5');
    var total   = results.totalValue;
    var lending = total * 0.40;
    var tech    = total * 0.30;
    var div     = total * 0.30;

    charts.chart5 = new Chart(refs.elements.chart5.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Capital Deployment'],
        datasets: [
          {
            label: 'Risk Capacity / Lending (' + fmtM(lending) + ')',
            data: [lending],
            backgroundColor: '#1F60AE',
            borderRadius: 4,
          },
          {
            label: 'Technology Reinvestment (' + fmtM(tech) + ')',
            data: [tech],
            backgroundColor: '#007A35',
            borderRadius: 4,
          },
          {
            label: 'Shareholder Return / Dividend (' + fmtM(div) + ')',
            data: [div],
            backgroundColor: '#EC111A',
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { family: 'IBM Plex Sans', size: 10 }, boxWidth: 12, padding: 8 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label; } } },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: '#F1F5F9' },
            ticks: { font: { family: 'IBM Plex Mono', size: 10 }, callback: function(v) { return 'C$' + Number(v).toFixed(0) + 'M'; } },
          },
          y: { stacked: true, grid: { display: false } },
        },
      },
    });

    refs.elements['tornadoCallout'].textContent =
      'Illustrative capital deployment scenario based on total annual value of ' + fmtM(total) +
      '. Actual allocation decisions require board-level approval and strategic planning.';
  }

  // ─── ACCORDIONS ───────────────────────────────────────────────────────────
  function initAccordions(doc) {
    var toggles = doc.querySelectorAll('.accordion-toggle');
    toggles.forEach(function(toggle) {
      toggle.addEventListener('click', function() {
        var targetId = toggle.getAttribute('data-target');
        var panel    = doc.getElementById(targetId);
        if (!panel) return;
        var open = panel.classList.contains('open');
        panel.classList.toggle('open', !open);
        toggle.innerHTML = (open ? '&#9658;' : '&#9660;') + ' Why this number?';
      });
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  var refs       = cacheDom(document);
  var activeLens = 'cro';

  function update() {
    var inputs    = readInputs(refs);
    var results   = compute(inputs);
    var scenarios = buildScenarioSet(inputs);
    renderDashboard(refs, inputs, results, scenarios, activeLens);
    renderCharts(refs, inputs, results, activeLens);
  }

  function toggleBenchmarks() {
    var isOpen = refs.elements.benchTrigger.getAttribute('aria-expanded') === 'true';
    refs.elements.benchTrigger.setAttribute('aria-expanded', String(!isOpen));
    refs.elements.benchBody.style.maxHeight   = isOpen ? '0px' : '900px';
    refs.elements.benchChevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  }

  INPUT_IDS.forEach(function(id) {
    var el = refs.elements[id];
    if (el) el.addEventListener('input', update);
  });

  Object.keys(refs.lensButtons).forEach(function(lens) {
    var btn = refs.lensButtons[lens];
    if (!btn) return;
    btn.addEventListener('click', function() {
      activeLens = lens;
      update();
    });
  });

  if (refs.elements.benchTrigger) {
    refs.elements.benchTrigger.addEventListener('click', toggleBenchmarks);
  }

  initAccordions(document);
  update();

  // ─── PDF EXPORT ──────────────────────────────────────────────────────────
  var exportBtn = document.getElementById('exportPdfBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      if (exportBtn.classList.contains('exporting')) return;
      exportBtn.classList.add('exporting');
      exportBtn.textContent = 'Generating…';

      try { generatePdfReport(); } catch(e) { console.error('PDF export error:', e); }

      exportBtn.classList.remove('exporting');
      exportBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>' +
        ' Export PDF';
    });
  }

  function generatePdfReport() {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297; // A4 mm
    var ml = 15, mr = 15, mt = 15;
    var cw = pw - ml - mr; // content width
    var y = mt;

    var inputs    = readInputs(refs);
    var results   = compute(inputs);
    var scenarios = buildScenarioSet(inputs);
    var bankName  = inputs.bankName || 'Capital ROI';
    var fileName  = bankName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + '_ROI_Report.pdf';

    // Colors
    var DARK   = [19, 33, 68];    // #132144
    var BLUE   = [31, 96, 174];   // #1F60AE
    var GREEN  = [0, 122, 53];    // #007A35
    var RED    = [236, 17, 26];   // #EC111A
    var ORANGE = [224, 108, 0];
    var GRAY   = [100, 116, 139];
    var LGRAY  = [240, 243, 250];
    var WHITE  = [255, 255, 255];

    function setColor(c) { doc.setTextColor(c[0], c[1], c[2]); }
    function setFill(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function checkPage(need) { if (y + need > ph - 15) { doc.addPage(); y = mt; return true; } return false; }

    // ── HEADER BANNER ──
    setFill(DARK);
    doc.roundedRect(ml, y, cw, 28, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); setColor(WHITE);
    doc.text('Capital ROI Estimator', ml + 8, y + 11);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(168, 196, 234);
    doc.text(bankName + '  ·  SAS Viya + Risk Solutions', ml + 8, y + 18);
    doc.setFontSize(8); doc.setTextColor(122, 155, 200);
    doc.text('OSFI · Basel IV  |  Confidential  |  Generated: ' + new Date().toLocaleDateString('en-CA'), ml + 8, y + 24);
    y += 34;

    // ── EXECUTIVE SUMMARY KPIs ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Executive Summary', ml, y); y += 6;

    var kpiBoxW = (cw - 8) / 3;
    var kpis = [
      { label: 'Total Annual Value', value: fmtM(results.totalValue), color: GREEN },
      { label: 'New Lending Capacity', value: fmtB(results.lendingCapacity), color: BLUE },
      { label: 'Return on Investment', value: fmtPct(results.roiPercent), color: GREEN },
    ];
    kpis.forEach(function(kpi, i) {
      var bx = ml + i * (kpiBoxW + 4);
      setFill(LGRAY);
      doc.roundedRect(bx, y, kpiBoxW, 18, 2, 2, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); setColor(GRAY);
      doc.text(kpi.label.toUpperCase(), bx + 4, y + 6);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); setColor(kpi.color);
      doc.text(kpi.value, bx + 4, y + 14);
    });
    y += 24;

    // ── BANK PROFILE TABLE ──
    checkPage(40);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Bank Profile', ml, y); y += 2;

    doc.autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [['Parameter', 'Value']],
      body: [
        ['Bank Name', inputs.bankName],
        ['Risk-Weighted Assets', 'C$' + fmt(inputs.rwa, 1) + 'B'],
        ['CET1 Ratio', fmt(inputs.cet1, 1) + '%'],
        ['Current Platform Costs', 'C$' + fmt(inputs.platformCost, 1) + 'M/yr'],
        ['Modernization Cost', 'C$' + fmt(inputs.modernizationCost, 1) + 'M'],
        ['Cost of Capital', fmt(inputs.coc, 1) + '%'],
      ],
      styles: { fontSize: 9, cellPadding: 2.5, font: 'helvetica' },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── TRANSFORMATION ASSUMPTIONS ──
    checkPage(50);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Transformation Assumptions', ml, y); y += 2;

    doc.autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [['Lever', 'Value', 'Stream']],
      body: [
        ['CRM & Collateral Capture', fmt(inputs.crmCapture, 1) + '%', 'Capital Efficiency'],
        ['Pooling & Granularity', fmt(inputs.poolingGranularity, 1) + '%', 'Capital Efficiency'],
        ['Model Risk Buffer Reduction', fmt(inputs.modelRiskBuffer, 1) + '%', 'Capital Efficiency'],
        ['Total Capital Improvement', fmt(inputs.capImprovement, 1) + '%', 'Capital Efficiency'],
        ['Tool Consolidation', 'C$' + fmt(inputs.toolConsolidation, 1) + 'M', 'Operational Savings'],
        ['Infrastructure Savings', 'C$' + fmt(inputs.infraSavings, 1) + 'M', 'Operational Savings'],
        ['Reporting Automation', 'C$' + fmt(inputs.reportingAutomation, 1) + 'M', 'Operational Savings'],
        ['Model Deployment', 'C$' + fmt(inputs.modelDeployment, 1) + 'M', 'Operational Savings'],
        ['Validation Reduction', fmt(inputs.validationReduction, 1) + '%', 'Operational Savings'],
      ],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 2) {
          data.cell.styles.textColor = data.cell.raw === 'Capital Efficiency' ? BLUE : GREEN;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8;
        }
        // Bold the total row
        if (data.section === 'body' && data.row.index === 3) {
          data.cell.styles.fillColor = [235, 240, 250];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── ECONOMIC IMPACT ──
    checkPage(60);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Economic Impact', ml, y); y += 2;

    doc.autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [['Metric', 'Value', 'Description']],
      body: [
        ['RWA Reduction', fmtB(results.rwaReduction), 'Risk-weighted assets freed by improved IRB model granularity'],
        ['Capital Released', fmtB(results.capitalReleased), 'CET1 capital no longer required to back reduced RWA'],
        ['New Lending Capacity', fmtB(results.lendingCapacity), '10x leverage on released capital'],
        ['Capital Value', fmtM(results.capitalValue), 'Annual return on released capital at hurdle rate'],
        ['Operational Savings', fmtM(results.operationalSavings), 'Combined tool, infra, reporting, model & validation savings'],
        ['Total Annual Value', fmtM(results.totalValue), 'Capital value + operational savings'],
        ['ROI', fmtPct(results.roiPercent), 'Total Annual Value / Modernization Cost x 100'],
        ['Payback Period', isFinite(results.paybackMonths) ? results.paybackMonths.toFixed(1) + ' months' : 'N/A', 'Months until value repays the investment'],
      ],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 }, 1: { cellWidth: 30, halign: 'right' }, 2: { fontSize: 8, textColor: GRAY } },
      didParseCell: function(data) {
        if (data.section === 'body' && (data.row.index === 5 || data.row.index === 6)) {
          data.cell.styles.fillColor = [240, 250, 245];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ── COST OF INACTION ──
    checkPage(20);
    setFill([255, 243, 224]);
    doc.roundedRect(ml, y, cw, 16, 2, 2, 'F');
    doc.setDrawColor(224, 108, 0); doc.setLineWidth(0.8);
    doc.line(ml, y, ml, y + 16);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setColor(ORANGE);
    doc.text('Cost of Inaction — 12-Month Delay', ml + 5, y + 5.5);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setColor(GRAY);
    var monthly = results.totalValue / 12;
    doc.text('Each month of delay defers ~' + fmtM(monthly) + ' in value. Over 12 months: ' + fmtM(results.totalValue) + ' foregone.', ml + 5, y + 11);
    doc.setDrawColor(0);
    y += 22;

    // ── CHARTS ──
    var chartIds = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5'];
    var chartTitles = [
      'Net Cumulative Benefit — 5-Year Payback View',
      'Annual Value Build-Up (Waterfall)',
      'Annual Cost Savings Generated (Year 1–5)',
      activeLens === 'cfo' ? 'P&L Impact Summary' : 'ROI Gauge',
      activeLens === 'cfo' ? 'Budget Reallocation Potential' : 'Impact Driver Ranking — ROI Sensitivity',
    ];

    chartIds.forEach(function(id, idx) {
      var canvas = refs.elements[id];
      if (!canvas) return;
      var imgData;
      try { imgData = canvas.toDataURL('image/png'); } catch(e) { return; }

      var chartH = (id === 'chart4') ? 45 : 55;
      checkPage(chartH + 12);

      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setColor(DARK);
      doc.text(chartTitles[idx], ml, y + 4);
      y += 6;

      setFill(WHITE);
      doc.roundedRect(ml, y, cw, chartH, 2, 2, 'FD');

      var imgW = cw - 6;
      var imgH = chartH - 4;
      doc.addImage(imgData, 'PNG', ml + 3, y + 2, imgW, imgH);
      y += chartH + 6;
    });

    // ── SCENARIO COMPARISON ──
    checkPage(50);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Scenario Comparison', ml, y); y += 2;

    function pb(v) { return isFinite(v) ? v.toFixed(1) : 'N/A'; }
    doc.autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [['Metric', 'Conservative (−30%)', 'Base Case', 'Optimistic (+30%)']],
      body: [
        ['Cap Efficiency %', fmtPct(scenarios.conservative.inputs.capImprovement), fmtPct(scenarios.base.inputs.capImprovement), fmtPct(scenarios.optimistic.inputs.capImprovement)],
        ['Op Savings ($M)', fmtM(scenarios.conservative.results.operationalSavings), fmtM(scenarios.base.results.operationalSavings), fmtM(scenarios.optimistic.results.operationalSavings)],
        ['Capital Value ($M)', fmtM(scenarios.conservative.results.capitalValue), fmtM(scenarios.base.results.capitalValue), fmtM(scenarios.optimistic.results.capitalValue)],
        ['Total Value ($M)', fmtM(scenarios.conservative.results.totalValue), fmtM(scenarios.base.results.totalValue), fmtM(scenarios.optimistic.results.totalValue)],
        ['ROI (%)', fmtPct(scenarios.conservative.results.roiPercent), fmtPct(scenarios.base.results.roiPercent), fmtPct(scenarios.optimistic.results.roiPercent)],
        ['Payback (months)', pb(scenarios.conservative.results.paybackMonths), pb(scenarios.base.results.paybackMonths), pb(scenarios.optimistic.results.paybackMonths)],
        ['5-yr TCO Savings', fmtM(computeFiveYearTco(scenarios.conservative.inputs, scenarios.conservative.results)), fmtM(computeFiveYearTco(scenarios.base.inputs, scenarios.base.results)), fmtM(computeFiveYearTco(scenarios.optimistic.inputs, scenarios.optimistic.results))],
      ],
      styles: { fontSize: 9, cellPadding: 2.5, halign: 'center' },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 }, 2: { fillColor: [235, 240, 250] } },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── CALCULATION AUDIT TRAIL ──
    checkPage(50);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Calculation Details — Audit Trail', ml, y); y += 2;

    doc.autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [['Formula', 'Expression', 'Meaning', 'Result']],
      body: [
        ['Cap Improvement', 'CRM(' + fmt(inputs.crmCapture,1) + '%) + Pool(' + fmt(inputs.poolingGranularity,1) + '%) + MRB(' + fmt(inputs.modelRiskBuffer,1) + '%)', 'Sum of capital levers', fmt(inputs.capImprovement,1) + '%'],
        ['RWA Reduction', fmt(inputs.rwa,1) + 'B × ' + fmt(inputs.capImprovement,1) + '% ÷ 100', 'Risk-weighted assets freed', fmtB(results.rwaReduction)],
        ['Capital Released', fmt(results.rwaReduction,2) + 'B × ' + fmt(inputs.cet1,1) + '% ÷ 100', 'CET1 freed from RWA reduction', fmtB(results.capitalReleased)],
        ['Lending Capacity', fmt(results.capitalReleased,2) + 'B × 10', '10x leverage proxy', fmtB(results.lendingCapacity)],
        ['Capital Value', fmt(results.capitalReleased,2) + 'B × ' + fmt(inputs.coc,1) + '% × 1000', 'Annual return at hurdle rate', fmtM(results.capitalValue)],
        ['Op Savings', fmt(inputs.toolConsolidation,1) + '+' + fmt(inputs.infraSavings,1) + '+' + fmt(inputs.reportingAutomation,1) + '+' + fmt(inputs.modelDeployment,1) + '+val', 'Combined operating benefit', fmtM(results.operationalSavings)],
        ['Total Value', 'capitalValue + opSavings', 'Combined annual value', fmtM(results.totalValue)],
        ['ROI', inputs.modernizationCost > 0 ? 'total ÷ ' + fmt(inputs.modernizationCost,1) + 'M × 100' : 'N/A', 'Annualized ROI', fmtPct(results.roiPercent)],
        ['Payback', isFinite(results.paybackMonths) ? fmt(inputs.modernizationCost,1) + 'M ÷ (total÷12)' : 'N/A', 'Months to repay investment', isFinite(results.paybackMonths) ? results.paybackMonths.toFixed(1) + ' mo' : 'N/A'],
      ],
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, 1: { cellWidth: 52, fontSize: 7 }, 2: { fontSize: 7, textColor: GRAY }, 3: { halign: 'right', fontStyle: 'bold', cellWidth: 24 } },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── PEER BENCHMARKS ──
    checkPage(40);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setColor(DARK);
    doc.text('Peer Benchmarks — Canadian Big 5', ml, y); y += 2;

    var spendPerRwa = inputs.rwa > 0 ? inputs.platformCost / inputs.rwa : 0;
    doc.autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      head: [['Bank', 'RWA ($B)', 'Platform Spend', 'Opportunity', 'Spend/RWA', 'Opp. ROI']],
      body: [
        ['BNS (Scotiabank)', fmt(inputs.rwa, 1), 'C$' + fmt(inputs.platformCost, 0) + 'M/yr', 'C$70–90M', '$' + spendPerRwa.toFixed(3) + 'M/$B', '~' + Math.round(results.roiPercent) + '%'],
        ['TD Bank', '~520', '~$30M/yr', '~$80–105M', '$0.058M/$B', '~463%'],
        ['RBC', '~610', '~$38M/yr', '~$95–125M', '$0.062M/$B', '~550%'],
        ['BMO', '~380', '~$22M/yr', '~$58–75M', '$0.058M/$B', '~333%'],
        ['CIBC', '~310', '~$18M/yr', '~$46–62M', '$0.058M/$B', '~270%'],
      ],
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      didParseCell: function(data) {
        if (data.section === 'body' && data.row.index === 0) {
          data.cell.styles.fillColor = [235, 240, 250];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── FOOTER ON EVERY PAGE ──
    var totalPages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
      doc.text('Capital ROI Estimator  ·  ' + bankName + '  ·  Confidential  ·  Page ' + p + '/' + totalPages, pw / 2, ph - 8, { align: 'center' });
      // Red line at top of each page (after first)
      if (p > 1) {
        doc.setDrawColor(236, 17, 26); doc.setLineWidth(0.5);
        doc.line(ml, 8, pw - mr, 8);
        doc.setDrawColor(0);
      }
    }

    doc.save(fileName);
  }
})();
