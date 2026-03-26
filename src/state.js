import { APP_CONFIG, INPUT_IDS } from './config.js';
import { clamp, computeCapImprovement } from './model.js';

const DOM_IDS = [
  ...INPUT_IDS,
  'intro-narrative-text',
  'es-total',
  'es-lending',
  'es-roi',
  'crmCaptureBadge',
  'poolingGranularityBadge',
  'modelRiskBufferBadge',
  'capImpBadge',
  'capValPreview',
  'opSavPreview',
  'ki-rwaRed',
  'ki-capRel',
  'ki-lending',
  'ki-capVal',
  'ki-opSav',
  'ki-total',
  'ki-roi',
  'ki-payback',
  'takeaway',
  'inaction-monthly',
  'inaction-annual',
  'inaction-text',
  'inaction-extended',
  'chart1',
  'chart2',
  'chart2-title',
  'chart3',
  'chart4',
  'chart5',
  'gaugeBenchmarkCallout',
  'tornadoCallout',
  'scenarioTableBody',
  'auditTableBody',
  'benchTrigger',
  'benchChevron',
  'benchBody',
  'bench-bns-spend-rwa',
  'bench-bns-opp-roi',
  'benchPositionSummary',
];

export function cacheDom(doc = document) {
  const elements = Object.fromEntries(DOM_IDS.map((id) => [id, doc.getElementById(id)]));

  return {
    elements,
    lensButtons: {
      cro: doc.getElementById('lens-cro'),
      cfo: doc.getElementById('lens-cfo'),
      cio: doc.getElementById('lens-cio'),
    },
    labels: {
      primaryKpi: doc.querySelector('.exec-strip .exec-kpi:first-child .exec-kpi-label'),
      primaryKpiSub: doc.querySelector('.exec-strip .exec-kpi:first-child .exec-kpi-sub'),
      roiKpi: doc.querySelector('.exec-strip .exec-kpi:last-child .exec-kpi-label'),
      modernizationCost: doc.querySelector('label[for="modernizationCost"]'),
      benchmarkNote: doc.querySelector('.bench-note'),
    },
  };
}

export function readInputs(refs, config = APP_CONFIG) {
  const raw = {};

  for (const id of INPUT_IDS) {
    const element = refs.elements[id];
    raw[id] = element ? element.value : '';
  }

  return normalizeInputs(raw, config);
}

export function normalizeInputs(raw, config = APP_CONFIG) {
  const normalized = {
    bankName:
      typeof raw.bankName === 'string' && raw.bankName.trim()
        ? raw.bankName.trim()
        : config.inputs.bankName.defaultValue,
  };

  for (const [id, rules] of Object.entries(config.inputs)) {
    if (id === 'bankName') {
      continue;
    }

    const parsed = Number.parseFloat(raw[id]);
    const fallback = Number.isFinite(parsed) ? parsed : rules.defaultValue;
    normalized[id] = clamp(fallback, rules.min, rules.max);
  }

  normalized.capImprovement = computeCapImprovement(normalized);
  return normalized;
}
