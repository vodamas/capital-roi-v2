import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_CONFIG } from '../src/config.js';
import {
  buildScenarioSet,
  compute,
  computeFiveYearTco,
  computeSensitivityDrivers,
  scaleScenarioInputs,
} from '../src/model.js';
import { normalizeInputs } from '../src/state.js';

function buildDefaultInputs() {
  const inputs = {
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

  inputs.capImprovement =
    inputs.crmCapture + inputs.poolingGranularity + inputs.modelRiskBuffer;

  return inputs;
}

function assertApprox(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
}

test('compute returns expected baseline metrics', () => {
  const inputs = buildDefaultInputs();
  const results = compute(inputs, APP_CONFIG.assumptions);

  assertApprox(results.advancedLineSavings, 12);
  assertApprox(results.validationSavings, 2.8);
  assertApprox(results.operationalSavings, 14.8);
  assertApprox(results.rwaReduction, 7.1145);
  assertApprox(results.capitalReleased, 0.924885);
  assertApprox(results.lendingCapacity, 9.24885);
  assertApprox(results.capitalValue, 101.73735);
  assertApprox(results.totalValue, 116.53735);
  assertApprox(results.roiPercent, 582.68675);
  assertApprox(results.paybackMonths, 2.059425583300118);
});

test('zero modernization cost forces ROI to zero and payback to infinity', () => {
  const inputs = buildDefaultInputs();
  inputs.modernizationCost = 0;

  const results = compute(inputs, APP_CONFIG.assumptions);

  assert.equal(results.roiPercent, 0);
  assert.equal(results.paybackMonths, Infinity);
});

test('scenario scaling preserves bank profile while scaling transformation assumptions', () => {
  const inputs = buildDefaultInputs();
  const scenarios = buildScenarioSet(inputs, APP_CONFIG);

  assert.equal(scenarios.conservative.inputs.rwa, inputs.rwa);
  assert.equal(scenarios.optimistic.inputs.rwa, inputs.rwa);
  assert.equal(scenarios.conservative.inputs.modernizationCost, inputs.modernizationCost);
  assert.equal(scenarios.optimistic.inputs.modernizationCost, inputs.modernizationCost);
  assert.ok(scenarios.conservative.inputs.capImprovement < scenarios.base.inputs.capImprovement);
  assert.ok(scenarios.optimistic.inputs.capImprovement > scenarios.base.inputs.capImprovement);
});

test('five-year TCO uses fixed bank profile and operating savings result', () => {
  const inputs = buildDefaultInputs();
  const results = compute(inputs, APP_CONFIG.assumptions);
  const tcoSavings = computeFiveYearTco(inputs, results, APP_CONFIG.assumptions);

  assertApprox(tcoSavings, 87.11547676040001);
});

test('normalizeInputs clamps numeric bounds and recomputes cap improvement', () => {
  const normalized = normalizeInputs(
    {
      bankName: '  ',
      rwa: '-10',
      cet1: '150',
      analyticsCost: '',
      modernizationCost: '5',
      coc: '11',
      crmCapture: '4',
      poolingGranularity: '1',
      modelRiskBuffer: '-1',
      toolConsolidation: '2',
      infraSavings: '3',
      reportingAutomation: '4',
      modelDeployment: '5',
      validationReduction: '101',
    },
    APP_CONFIG
  );

  assert.equal(normalized.bankName, APP_CONFIG.inputs.bankName.defaultValue);
  assert.equal(normalized.rwa, 0);
  assert.equal(normalized.cet1, 100);
  assert.equal(normalized.crmCapture, 2);
  assert.equal(normalized.modelRiskBuffer, 0);
  assert.equal(normalized.validationReduction, 100);
  assert.equal(normalized.capImprovement, 3);
});

test('sensitivity driver ranking returns four non-negative drivers', () => {
  const inputs = buildDefaultInputs();
  const drivers = computeSensitivityDrivers(inputs, APP_CONFIG);

  assert.equal(drivers.length, 4);
  drivers.forEach((driver) => assert.ok(driver.swing >= 0));
});

test('scaleScenarioInputs scales validation reduction and recomputes derived capital improvement', () => {
  const inputs = buildDefaultInputs();
  const scaled = scaleScenarioInputs(inputs, 1.3, APP_CONFIG);

  assert.equal(scaled.validationReduction, 13);
  assertApprox(scaled.capImprovement, 1.95);
});
