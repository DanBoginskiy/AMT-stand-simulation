import { el } from './dom.js';
import { t } from '../i18n/index.js';
import { state } from '../state.js';

// Build the top control bar. `actions` provides the callbacks.
export function buildTopbar(actions) {
  const langToggle = el('div', { class: 'toggle' }, [
    langBtn('UA', 'ua', actions),
    langBtn('EN', 'en', actions),
  ]);

  const modeToggle = el('div', { class: 'toggle' }, [
    modeBtn(t('mono'), 'mono', actions),
    modeBtn(t('poly'), 'poly', actions),
  ]);

  const algoSelect = el(
    'select',
    {
      title: t('pitchAlgo'),
      disabled: state.mode === 'poly' ? 'disabled' : null,
      onchange: (e) => actions.setAlgo(e.target.value),
    },
    [
      optionEl('YIN', 'yin'),
      optionEl('HPS', 'hps'),
      optionEl('ACF', 'acf'),
    ]
  );
  algoSelect.value = state.pitchAlgo;

  const playBtn = el('button', {
    text: state.isPlaying ? t('stop') : t('play'),
    disabled: state.pipeline ? null : 'disabled',
    onclick: actions.togglePlay,
  });

  // Show "Run pipeline" only when no pipeline exists yet
  const runBtn = !state.pipeline
    ? el('button', {
        class: 'primary',
        text: t('runAll'),
        onclick: actions.run,
      })
    : null;

  return el('div', { class: 'topbar' }, [
    el('h1', { html: `${t('appTitle')} <span class="sub">${t('appSub')}</span>` }),
    el('div', { class: 'spacer' }),
    group(t('mode'), modeToggle),
    group(t('pitchAlgo'), algoSelect),
    group(t('lang'), langToggle),
    ...(runBtn ? [runBtn] : []),
    playBtn,
  ]);
}

function group(label, control) {
  return el('div', { class: 'ctrl-group' }, [el('label', { text: label }), control]);
}

function langBtn(label, lang, actions) {
  return el('button', {
    class: state.lang === lang ? 'active' : '',
    text: label,
    onclick: () => actions.setLang(lang),
  });
}

function modeBtn(label, mode, actions) {
  return el('button', {
    class: state.mode === mode ? 'active' : '',
    text: label,
    onclick: () => actions.setMode(mode),
  });
}

function optionEl(label, value) {
  return el('option', { value, text: label });
}
