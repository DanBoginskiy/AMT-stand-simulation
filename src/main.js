import './styles.css';
import { state } from './state.js';
import { t } from './i18n/index.js';
import { el } from './ui/dom.js';
import { buildTopbar } from './ui/controls.js';
import { buildRail, renderPanel } from './ui/stepper.js';
import { runPipeline } from './pipeline/run.js';
import { createPlayback } from './ui/playback.js';

const appEl = document.getElementById('app');
let topbarEl, contentEl, railEl;
let hooks = {}; // active stage's playhead/etc hooks

const playback = createPlayback({
  onTick(sec) {
    state.playhead = sec;
    if (hooks.playhead) hooks.playhead(sec);
  },
  onStop() {
    state.isPlaying = false;
    state.playhead = 0;
    if (hooks.playhead) hooks.playhead(0);
    refreshTopbar();
  },
});

const helpers = {
  selectFrame(idx) {
    if (!state.pipeline) return;
    const n = state.pipeline.framing.times.length;
    state.selectedFrame = Math.max(0, Math.min(n - 1, idx));
    renderCurrentPanel();
  },
  rerender() {
    renderCurrentPanel();
  },
};

const actions = {
  run() {
    runPipelineNow();
  },
  togglePlay() {
    if (state.isPlaying) {
      playback.stop();
    } else if (state.pipeline) {
      state.isPlaying = true;
      playback.play(state.pipeline.synth.signal, state.pipeline.sampleRate);
      refreshTopbar();
    }
  },
  setLang(lang) {
    if (state.lang === lang) return;
    state.lang = lang;
    renderShell();
  },
  setMode(mode) {
    if (state.mode === mode) return;
    if (state.isPlaying) playback.stop();
    state.mode = mode;
    state.selectedFrame = 0;
    if (state.pipeline) runPipelineNow();
    else renderShell();
  },
  setAlgo(algo) {
    state.pitchAlgo = algo;
    if (state.pipeline && state.mode === 'mono') runPipelineNow();
  },
  goStage(i) {
    state.currentStage = Math.max(0, Math.min(11, i));
    renderCurrentPanel();
  },
};

function ctx() {
  return { p: state.pipeline, state, helpers };
}

// Pick a frame in the middle of the first note for a sensible default harmonic
// view.
function defaultFrame(pipeline) {
  const first = pipeline.score.notes[0];
  const sec = first ? first.startSec + Math.min(0.12, first.durSec / 2) : 0;
  const idx = Math.round((sec * pipeline.sampleRate) / pipeline.params.hop);
  return Math.max(0, Math.min(pipeline.framing.times.length - 1, idx));
}

function runPipelineNow() {
  if (state.isPlaying) playback.stop();
  // Brief "computing" feedback on the run button.
  if (topbarEl) {
    const btn = topbarEl.querySelector('button.primary');
    if (btn) {
      btn.textContent = '…';
      btn.disabled = true;
    }
  }
  // Defer so the button text paints before the (synchronous) heavy compute.
  requestAnimationFrame(() => {
    state.pipeline = runPipeline(state);
    state.selectedFrame = defaultFrame(state.pipeline);
    state.playhead = 0;
    renderShell();
  });
}

function renderShell() {
  appEl.innerHTML = '';
  topbarEl = buildTopbar(actions);
  railEl = buildRail(state, actions);
  contentEl = el('div', { class: 'content' });
  appEl.append(topbarEl, el('div', { class: 'main' }, [railEl, contentEl]));
  if (state.pipeline) renderCurrentPanel();
  else renderEmpty();
}

function refreshTopbar() {
  if (!topbarEl) return;
  const nb = buildTopbar(actions);
  topbarEl.replaceWith(nb);
  topbarEl = nb;
}

function refreshRail() {
  if (!railEl) return;
  const nr = buildRail(state, actions);
  railEl.replaceWith(nr);
  railEl = nr;
}

function renderCurrentPanel() {
  if (!state.pipeline) {
    renderEmpty();
    return;
  }
  hooks = renderPanel(contentEl, ctx(), actions);
  refreshRail();
}

function renderEmpty() {
  contentEl.innerHTML = '';
  contentEl.append(
    el('div', { class: 'empty-state' }, [
      el('div', { text: t('runFirst') }),
      el('button', { class: 'primary', text: t('runAll'), onclick: actions.run }),
    ])
  );
}

renderShell();
