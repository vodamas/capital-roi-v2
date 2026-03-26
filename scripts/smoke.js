import assert from 'node:assert/strict';

import { APP_CONFIG } from '../src/config.js';
import { buildScenarioSet, compute } from '../src/model.js';

const defaults = {
  bankName: APP_CONFIG.inputs.bankName.defaultValue,
  rwa: APP_CONFIG.inputs.rwa.defaultValue,
  cet1: APP_CONFIG.inputs.cet1.defaultValue,
  analyticsCost: APP_CONFIG.inputs.analyticsCost.defaultValue,
  modernizationCost: APP_CONFIG.inputs.modernizationCost.defaultValue,
  coc: APP_CONFIG.inputs.coc.defaultValue,
  crmCapture: APP_CONFIG.inputs.crmCapture.defaultValue,
  poolingGranularity: APP_CONFIG.inputs.poolingGranularity.defaultValue,
  modelRiskBuffer: APP_CONFIG.inputs.modelRiskBuffer.defaultValue,
  toolConsolidation: APP_CONFIG.inputs.toolConsolidation.defaultValue,
  infraSavings: APP_CONFIG.inputs.infraSavings.defaultValue,
  reportingAutomation: APP_CONFIG.inputs.reportingAutomation.defaultValue,
  modelDeployment: APP_CONFIG.inputs.modelDeployment.defaultValue,
  validationReduction: APP_CONFIG.inputs.validationReduction.defaultValue,
};

defaults.capImprovement =
  defaults.crmCapture + defaults.poolingGranularity + defaults.modelRiskBuffer;

const results = compute(defaults, APP_CONFIG.assumptions);
const scenarios = buildScenarioSet(defaults, APP_CONFIG);

assert.ok(results.totalValue > 100 && results.totalValue < 130);
assert.ok(results.roiPercent > 500 && results.roiPercent < 700);
assert.equal(scenarios.base.inputs.rwa, defaults.rwa);
assert.equal(scenarios.conservative.inputs.rwa, defaults.rwa);
assert.equal(scenarios.optimistic.inputs.rwa, defaults.rwa);

console.log(
  `Smoke check passed. Base total value ${results.totalValue.toFixed(2)}M, ROI ${results.roiPercent.toFixed(1)}%.`
);
