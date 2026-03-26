import { APP_CONFIG, INPUT_IDS } from './config.js';
import { renderCharts } from './charts.js';
import { buildScenarioSet, compute } from './model.js';
import { cacheDom, readInputs } from './state.js';
import { renderDashboard } from './ui.js';

const refs = cacheDom(document);
let activeLens = 'cro';

function update() {
  const inputs = readInputs(refs, APP_CONFIG);
  const results = compute(inputs, APP_CONFIG.assumptions);
  const scenarios = buildScenarioSet(inputs, APP_CONFIG);

  renderDashboard(refs, inputs, results, scenarios, activeLens, APP_CONFIG);
  renderCharts(refs, inputs, results, APP_CONFIG);
}

function toggleBenchmarks() {
  const isOpen = refs.elements.benchTrigger.getAttribute('aria-expanded') === 'true';
  refs.elements.benchTrigger.setAttribute('aria-expanded', String(!isOpen));
  refs.elements.benchBody.style.maxHeight = isOpen ? '0px' : '800px';
  refs.elements.benchChevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function bindEvents() {
  INPUT_IDS.forEach((id) => {
    const element = refs.elements[id];
    if (!element) {
      return;
    }

    element.addEventListener('input', update);
  });

  Object.entries(refs.lensButtons).forEach(([lens, button]) => {
    if (!button) {
      return;
    }

    button.addEventListener('click', () => {
      activeLens = lens;
      update();
    });
  });

  refs.elements.benchTrigger?.addEventListener('click', toggleBenchmarks);
}

bindEvents();
update();
