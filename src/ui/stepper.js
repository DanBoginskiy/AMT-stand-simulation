import { el } from './dom.js';
import { t, tStage } from '../i18n/index.js';
import { STAGES } from '../pipeline/stages.js';

// Level definitions: which stage indices belong to each level, color, UA/EN label
const LEVELS = [
  {
    indices: [0, 1, 2],
    color: '#58a6ff',   // blue — frame level
    labelUA: 'Фреймовий рівень',
    labelEN:  'Frame level',
  },
  {
    indices: [3, 4, 5],
    color: '#d29922',   // amber — note level
    labelUA: 'Нотний рівень',
    labelEN:  'Note level',
  },
  {
    indices: [6, 7, 8],
    color: '#3fb950',   // green — stream level
    labelUA: 'Стримовий рівень',
    labelEN:  'Stream level',
  },
  {
    indices: [9, 10, 11],
    color: '#f778ba',   // pink — notation level
    labelUA: 'Рівень нотації',
    labelEN:  'Notation level',
  },
];

// Map stage index → level info
function levelFor(i) {
  return LEVELS.find((lv) => lv.indices.includes(i));
}

// Left rail listing the 12 pipeline stages grouped into levels.
export function buildRail(state, actions) {
  const isUA = state.lang !== 'en';

  // Build level groups
  const groups = LEVELS.map((lv) => {
    const stageItems = lv.indices.map((i) => {
      const s = tStage(i);
      let cls = 'rail-item';
      if (i === state.currentStage) cls += ' active';
      else if (state.pipeline && i < state.currentStage) cls += ' done';

      const numEl = el('div', { class: 'num', text: String(i + 1) });
      // color active/done num with level color when active
      if (i === state.currentStage) {
        numEl.style.background = lv.color;
        numEl.style.borderColor = lv.color;
        numEl.style.color = '#04101f';
      }

      return el('div', { class: cls, onclick: () => actions.goStage(i) }, [
        numEl,
        el('div', { class: 'label' }, [
          document.createTextNode(
            s.title.split('·')[1] ? s.title.split('·')[1].trim() : s.title
          ),
          el('span', { class: 'stage-sub', text: s.short }),
        ]),
      ]);
    });

    const levelLabel = isUA ? lv.labelUA : lv.labelEN;

    // Vertical label strip on the left
    const strip = el('div', { class: 'level-strip' });
    strip.style.background = lv.color + '22'; // transparent fill
    strip.style.borderLeft = `3px solid ${lv.color}`;

    const vertLabel = el('div', { class: 'level-label-vert', text: levelLabel });
    vertLabel.style.color = lv.color;

    strip.append(vertLabel, ...stageItems);

    return strip;
  });

  return el('div', { class: 'rail' }, [
    el('div', { class: 'rail-title', text: t('stagesTitle') }),
    ...groups,
  ]);
}

// Render the active stage panel into `content`. Returns the stage's hooks.
export function renderPanel(content, ctx, actions) {
  content.innerHTML = '';
  const i = ctx.state.currentStage;
  const s = tStage(i);
  const lv = levelFor(i);

  // Level badge above stage title
  const isUA = ctx.state.lang !== 'en';
  const levelName = lv ? (isUA ? lv.labelUA : lv.labelEN) : '';
  const levelBadge = el('span', { class: 'level-badge', text: levelName });
  if (lv) {
    levelBadge.style.background = lv.color + '22';
    levelBadge.style.color = lv.color;
    levelBadge.style.borderColor = lv.color + '55';
  }

  content.append(
    el('div', { class: 'panel-head' }, [
      el('span', { class: 'stage-no', text: `${i + 1}/${STAGES.length}` }),
      el('h2', { text: s.title }),
      levelBadge,
    ]),
    el('div', { class: 'panel-explain', html: s.explain })
  );

  const viz = el('div', {});
  content.append(viz);
  const hooks = STAGES[i].render(viz, ctx) || {};

  content.append(
    el('div', { class: 'stage-nav' }, [
      el('button', {
        text: t('prev'),
        disabled: i === 0 ? 'disabled' : null,
        onclick: () => actions.goStage(i - 1),
      }),
      el('button', {
        text: t('next'),
        disabled: i === STAGES.length - 1 ? 'disabled' : null,
        onclick: () => actions.goStage(i + 1),
      }),
    ])
  );

  return hooks;
}
