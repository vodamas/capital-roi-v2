export const APP_CONFIG = {
  assumptions: {
    lendingMultiplier: 10,
    benchmarkPeerAvgSpendPerRwa: 0.059,
    roiBenchmarkRange: {
      low: 200,
      high: 500,
    },
    annualAnalyticsInflation: 0.03,
    scenarioFactors: {
      conservative: 0.7,
      optimistic: 1.3,
    },
    benchmarkDisclosure:
      'Benchmark figures are indicative reference points compiled from public filings and industry commentary; they are not embedded evidence for the model itself.',
  },
  inputs: {
    bankName: { defaultValue: 'Scotiabank (BNS)' },
    rwa: { defaultValue: 474.3, min: 0, max: 5000 },
    cet1: { defaultValue: 13.0, min: 0, max: 100 },
    analyticsCost: { defaultValue: 28, min: 0, max: 1000 },
    modernizationCost: { defaultValue: 20, min: 0, max: 1000 },
    coc: { defaultValue: 11, min: 0, max: 100 },
    crmCapture: { defaultValue: 0.5, min: 0, max: 2 },
    poolingGranularity: { defaultValue: 0.7, min: 0, max: 2 },
    modelRiskBuffer: { defaultValue: 0.3, min: 0, max: 2 },
    toolConsolidation: { defaultValue: 4.0, min: 0, max: 1000 },
    infraSavings: { defaultValue: 3.0, min: 0, max: 1000 },
    reportingAutomation: { defaultValue: 2.0, min: 0, max: 1000 },
    modelDeployment: { defaultValue: 3.0, min: 0, max: 1000 },
    validationReduction: { defaultValue: 10, min: 0, max: 100 },
  },
  lenses: {
    cro: {
      intro:
        "This estimator quantifies the financial case for modernizing Scotiabank's capital analytics infrastructure, focusing on RWA precision and regulatory buffers. Adjust bank profile inputs and transformation assumptions to model two independent value streams: capital efficiency gains and operational cost savings. All outputs update live.",
      primaryKpiLabel: 'RWA Precision Gain',
      primaryKpiSub: 'Capital Velocity',
      roiLabel: 'Risk-Adjusted ROI',
      modernizationCostLabel: 'Risk Transform. Cost ($M)',
    },
    cfo: {
      intro:
        "This estimator quantifies the financial case for modernizing Scotiabank's capital analytics infrastructure, focusing on economic value add and released capital. Adjust bank profile inputs and transformation assumptions to model capital efficiency gains and operational cost savings in a finance-oriented view.",
      primaryKpiLabel: 'Economic Value Add',
      primaryKpiSub: 'Released Capital',
      roiLabel: 'Strategic ROI',
      modernizationCostLabel: 'Program Investment ($M)',
    },
    cio: {
      intro:
        "This estimator quantifies the financial case for modernizing Scotiabank's capital analytics infrastructure, focusing on TCO reduction, legacy debt, and operational resilience. Adjust bank profile inputs and transformation assumptions to model capital efficiency gains and operational cost savings through a technology and operations lens.",
      primaryKpiLabel: 'TCO Reduction',
      primaryKpiSub: 'Operational Resilience',
      roiLabel: 'Opex Efficiency',
      modernizationCostLabel: 'Modernization Capital ($M)',
    },
  },
};

export const INPUT_IDS = [
  'bankName',
  'rwa',
  'cet1',
  'analyticsCost',
  'modernizationCost',
  'coc',
  'crmCapture',
  'poolingGranularity',
  'modelRiskBuffer',
  'toolConsolidation',
  'infraSavings',
  'reportingAutomation',
  'modelDeployment',
  'validationReduction',
];
