import { el } from './dom.js';
import { t, tStage } from '../i18n/index.js';
import { STAGES } from '../pipeline/stages.js';

// Left rail listing the 12 pipeline stages.
export function buildRail(state, actions) {
  const items = STAGES.map((_, i) => {
    const s = tStage(i);
    let cls = 'rail-item';
    if (i === state.currentStage) cls += ' active';
    else if (state.pipeline && i < state.currentStage) cls += ' done';
    return el('div', { class: cls, onclick: () => actions.goStage(i) }, [
      el('div', { class: 'num', text: String(i + 1) }),
      el('div', { class: 'label' }, [document.createTextNode(s.title.split('·')[1] ? s.title.split('·')[1].trim() : s.title), el('span', { class: 'stage-sub', text: s.short })]),
    ]);
  });
  return el('div', { class: 'rail' }, [el('div', { class: 'rail-title', text: t('stagesTitle') }), ...items]);
}

// Render the active stage panel into `content`. Returns the stage's hooks
// (e.g. { playhead(sec) }).
export function renderPanel(content, ctx, actions) {
  content.innerHTML = '';
  const i = ctx.state.currentStage;
  const s = tStage(i);

  content.append(
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'stage-no', text: `${i + 1}/${STAGES.length}` }),
      el('h2', { text: s.title }),
    ]),
    el('div', { class: 'panel-explain', html: s.explain })
  );

  const viz = el('div', {});
  content.append(viz);
  const hooks = STAGES[i].render(viz, ctx) || {};

  content.append(
    el('div', { class: 'stage-nav' }, [
      el('button', { text: t('prev'), disabled: i === 0 ? 'disabled' : null, onclick: () => actions.goStage(i - 1) }),
      el('button', {
        text: t('next'),
        disabled: i === STAGES.length - 1 ? 'disabled' : null,
        onclick: () => actions.goStage(i + 1),
      }),
    ])
  );

  return hooks;
}
