import { APP_CONFIG } from './config.js';

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function computeCapImprovement(inputs) {
  return inputs.crmCapture + inputs.poolingGranularity + inputs.modelRiskBuffer;
}

export function compute(inputs, assumptions = APP_CONFIG.assumptions) {
  const {
    rwa,
    cet1,
    analyticsCost,
    modernizationCost,
    coc,
    capImprovement,
    toolConsolidation,
    infraSavings,
    reportingAutomation,
    modelDeployment,
    validationReduction,
  } = inputs;

  const advancedLineSavings =
    toolConsolidation + infraSavings + reportingAutomation + modelDeployment;
  const validationSavings = analyticsCost * (validationReduction / 100);
  const operationalSavings = advancedLineSavings + validationSavings;

  const rwaReduction = rwa * (capImprovement / 100);
  const capitalReleased = rwaReduction * (cet1 / 100);
  const lendingCapacity = capitalReleased * assumptions.lendingMultiplier;
  const capitalValue = capitalReleased * (coc / 100) * 1000;
  const totalValue = capitalValue + operationalSavings;
  const roiPercent = modernizationCost > 0 ? (totalValue / modernizationCost) * 100 : 0;
  const paybackMonths =
    totalValue > 0 && modernizationCost > 0 ? modernizationCost / (totalValue / 12) : Infinity;

  return {
    advancedLineSavings,
    validationSavings,
    operationalSavings,
    rwaReduction,
    capitalReleased,
    lendingCapacity,
    capitalValue,
    totalValue,
    roiPercent,
    paybackMonths,
  };
}

export function computeFiveYearTco(inputs, results, assumptions = APP_CONFIG.assumptions) {
  let total = 0;
  const costWithModernization = Math.max(0, inputs.analyticsCost - results.operationalSavings);

  for (let year = 1; year <= 5; year += 1) {
    const costWithoutModernization =
      inputs.analyticsCost * Math.pow(1 + assumptions.annualAnalyticsInflation, year);
    total += costWithoutModernization - costWithModernization;
  }

  return total;
}

export function scaleScenarioInputs(baseInputs, factor, config = APP_CONFIG) {
  const scaled = {
    ...baseInputs,
    crmCapture: clamp(
      baseInputs.crmCapture * factor,
      config.inputs.crmCapture.min,
      config.inputs.crmCapture.max
    ),
    poolingGranularity: clamp(
      baseInputs.poolingGranularity * factor,
      config.inputs.poolingGranularity.min,
      config.inputs.poolingGranularity.max
    ),
    modelRiskBuffer: clamp(
      baseInputs.modelRiskBuffer * factor,
      config.inputs.modelRiskBuffer.min,
      config.inputs.modelRiskBuffer.max
    ),
    toolConsolidation: clamp(
      baseInputs.toolConsolidation * factor,
      config.inputs.toolConsolidation.min,
      config.inputs.toolConsolidation.max
    ),
    infraSavings: clamp(
      baseInputs.infraSavings * factor,
      config.inputs.infraSavings.min,
      config.inputs.infraSavings.max
    ),
    reportingAutomation: clamp(
      baseInputs.reportingAutomation * factor,
      config.inputs.reportingAutomation.min,
      config.inputs.reportingAutomation.max
    ),
    modelDeployment: clamp(
      baseInputs.modelDeployment * factor,
      config.inputs.modelDeployment.min,
      config.inputs.modelDeployment.max
    ),
    validationReduction: clamp(
      baseInputs.validationReduction * factor,
      config.inputs.validationReduction.min,
      config.inputs.validationReduction.max
    ),
  };

  scaled.capImprovement = computeCapImprovement(scaled);
  return scaled;
}

export function buildScenarioSet(baseInputs, config = APP_CONFIG) {
  const conservativeInputs = scaleScenarioInputs(
    baseInputs,
    config.assumptions.scenarioFactors.conservative,
    config
  );
  const optimisticInputs = scaleScenarioInputs(
    baseInputs,
    config.assumptions.scenarioFactors.optimistic,
    config
  );

  return {
    conservative: {
      inputs: conservativeInputs,
      results: compute(conservativeInputs, config.assumptions),
    },
    base: {
      inputs: baseInputs,
      results: compute(baseInputs, config.assumptions),
    },
    optimistic: {
      inputs: optimisticInputs,
      results: compute(optimisticInputs, config.assumptions),
    },
  };
}

export function computeSensitivityDrivers(inputs, config = APP_CONFIG) {
  const delta = 0.2;
  const bounds = config.inputs;

  function roiWith(overrides) {
    const candidate = {
      ...inputs,
      ...overrides,
    };
    candidate.capImprovement = computeCapImprovement(candidate);
    return compute(candidate, config.assumptions).roiPercent;
  }

  return [
    {
      label: 'RWA Precision',
      swing: Math.abs(
        roiWith({
          crmCapture: clamp(inputs.crmCapture * (1 + delta), bounds.crmCapture.min, bounds.crmCapture.max),
          poolingGranularity: clamp(
            inputs.poolingGranularity * (1 + delta),
            bounds.poolingGranularity.min,
            bounds.poolingGranularity.max
          ),
          modelRiskBuffer: clamp(
            inputs.modelRiskBuffer * (1 + delta),
            bounds.modelRiskBuffer.min,
            bounds.modelRiskBuffer.max
          ),
        }) -
          roiWith({
            crmCapture: clamp(inputs.crmCapture * (1 - delta), bounds.crmCapture.min, bounds.crmCapture.max),
            poolingGranularity: clamp(
              inputs.poolingGranularity * (1 - delta),
              bounds.poolingGranularity.min,
              bounds.poolingGranularity.max
            ),
            modelRiskBuffer: clamp(
              inputs.modelRiskBuffer * (1 - delta),
              bounds.modelRiskBuffer.min,
              bounds.modelRiskBuffer.max
            ),
          })
      ),
    },
    {
      label: 'Modernization Cost',
      swing: Math.abs(
        roiWith({
          modernizationCost: clamp(
            inputs.modernizationCost * (1 + delta),
            bounds.modernizationCost.min,
            bounds.modernizationCost.max
          ),
        }) -
          roiWith({
            modernizationCost: clamp(
              inputs.modernizationCost * (1 - delta),
              bounds.modernizationCost.min,
              bounds.modernizationCost.max
            ),
          })
      ),
    },
    {
      label: 'Hurdle Rate (CoC)',
      swing: Math.abs(
        roiWith({
          coc: clamp(inputs.coc * (1 + delta), bounds.coc.min, bounds.coc.max),
        }) -
          roiWith({
            coc: clamp(inputs.coc * (1 - delta), bounds.coc.min, bounds.coc.max),
          })
      ),
    },
    {
      label: 'Operational Savings',
      swing: Math.abs(
        roiWith({
          toolConsolidation: clamp(
            inputs.toolConsolidation * (1 + delta),
            bounds.toolConsolidation.min,
            bounds.toolConsolidation.max
          ),
          infraSavings: clamp(inputs.infraSavings * (1 + delta), bounds.infraSavings.min, bounds.infraSavings.max),
          reportingAutomation: clamp(
            inputs.reportingAutomation * (1 + delta),
            bounds.reportingAutomation.min,
            bounds.reportingAutomation.max
          ),
          modelDeployment: clamp(
            inputs.modelDeployment * (1 + delta),
            bounds.modelDeployment.min,
            bounds.modelDeployment.max
          ),
          validationReduction: clamp(
            inputs.validationReduction * (1 + delta),
            bounds.validationReduction.min,
            bounds.validationReduction.max
          ),
        }) -
          roiWith({
            toolConsolidation: clamp(
              inputs.toolConsolidation * (1 - delta),
              bounds.toolConsolidation.min,
              bounds.toolConsolidation.max
            ),
            infraSavings: clamp(
              inputs.infraSavings * (1 - delta),
              bounds.infraSavings.min,
              bounds.infraSavings.max
            ),
            reportingAutomation: clamp(
              inputs.reportingAutomation * (1 - delta),
              bounds.reportingAutomation.min,
              bounds.reportingAutomation.max
            ),
            modelDeployment: clamp(
              inputs.modelDeployment * (1 - delta),
              bounds.modelDeployment.min,
              bounds.modelDeployment.max
            ),
            validationReduction: clamp(
              inputs.validationReduction * (1 - delta),
              bounds.validationReduction.min,
              bounds.validationReduction.max
            ),
          })
      ),
    },
  ].sort((a, b) => b.swing - a.swing);
}

export function fmt(value, digits = 2) {
  return value.toLocaleString('en-CA', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtM(value) {
  return `C$${fmt(value, 1)}M`;
}

export function fmtB(value) {
  return `C$${fmt(value, 2)}B`;
}

export function fmtPct(value) {
  return `${fmt(value, 1)}%`;
}
