import { el, vizBlock, chip, chips } from '../ui/dom.js';
import { t } from '../i18n/index.js';
import { drawWaveform } from '../viz/waveform.js';
import { drawSynthBreakdown } from '../viz/synthBreakdown.js';
import { drawFraming } from '../viz/frames.js';
import { drawSpectrogram, xToFrame } from '../viz/spectrogram.js';
import { drawSpectrum } from '../viz/spectrum.js';
import { drawOnset } from '../viz/onsetPlot.js';
import { drawSalience } from '../viz/salience.js';
import { drawPianoRoll } from '../viz/pianoRoll.js';
import { analyzeHarmonics } from '../dsp/harmonics.js';
import { renderScore } from '../render/scoreRender.js';
import { midiToName } from '../dsp/music.js';

// UI-only state local to stages.
let spectroView = 'linear';

function canvasEl() {
  return document.createElement('canvas');
}

// A frame-selection slider bound to state.selectedFrame.
function frameSlider(ctx) {
  const { p, state, helpers } = ctx;
  const n = p.framing.times.length;
  const out = el('output', { text: '' });
  const update = () => {
    const time = p.framing.times[state.selectedFrame] ?? 0;
    out.textContent = `#${state.selectedFrame} · ${time.toFixed(3)}s`;
  };
  const input = el('input', {
    type: 'range',
    min: '0',
    max: String(n - 1),
    value: String(state.selectedFrame),
    oninput: (e) => helpers.selectFrame(parseInt(e.target.value, 10)),
  });
  update();
  return el('div', { class: 'slider-row' }, [
    el('label', { text: t('selectedFrame') }),
    input,
    out,
  ]);
}

function ghostsFrom(score) {
  return score.notes.map((n) => ({ midi: n.midi, startSec: n.startSec, durSec: n.durSec }));
}

function eventsFrom(score) {
  return score.notes.map((n) => ({ midi: n.midi, onsetSec: n.startSec, offsetSec: n.startSec + n.durSec }));
}

// ---- MIDI hex view ----
function hexView(midi) {
  const classOf = {
    on: 'b-on',
    off: 'b-off',
    meta: 'b-meta',
    chunk: 'b-meta',
    eot: 'b-meta',
    delta: '',
  };
  const wrap = el('div', { class: 'hexview' });
  let html = '';
  for (const seg of midi.segments) {
    const cls = classOf[seg.type] || '';
    for (const b of seg.bytes) {
      const hx = b.toString(16).padStart(2, '0').toUpperCase();
      html += cls ? `<span class="${cls}">${hx}</span> ` : `${hx} `;
    }
  }
  wrap.innerHTML = html;
  return wrap;
}

// ============================================================
// Stage render functions. Each returns { playhead?(sec) }.
// ============================================================
export const STAGES = [
  // 0 — Ground truth
  {
    render(container, ctx) {
      const { p } = ctx;
      const gt = eventsFrom(p.score);
      const c = canvasEl();
      const draw = (sec) => drawPianoRoll(c, { events: gt, totalSec: p.totalSec, playheadSec: sec });
      draw(ctx.state.playhead);
      container.append(
        vizBlock(t('groundTruthLabel'), c),
        chips([
          chip('mode', p.mode),
          chip('notes', p.score.notes.length),
          chip('tempo', p.params.tempoBPM + ' BPM'),
        ])
      );
      return { playhead: draw };
    },
  },

  // 1 — Synthesis -> raw wave
  {
    render(container, ctx) {
      const { p } = ctx;
      const wave = canvasEl();
      const breakdown = canvasEl();
      const draw = (sec) =>
        drawWaveform(wave, { signal: p.synth.signal, sampleRate: p.sampleRate, playheadSec: sec });
      draw(ctx.state.playhead);
      drawSynthBreakdown(breakdown, p.synth.inspect);
      let peak = 0;
      for (let i = 0; i < p.synth.signal.length; i++) peak = Math.max(peak, Math.abs(p.synth.signal[i]));
      container.append(
        vizBlock('Raw waveform · сира хвиля', wave),
        vizBlock('Note = Σ harmonics + ADSR', breakdown),
        chips([
          chip('sample rate', p.sampleRate + ' Hz'),
          chip('duration', p.totalSec.toFixed(2) + ' s'),
          chip('harmonics', p.synth.amps.length),
          chip('peak', peak.toFixed(2)),
        ])
      );
      return { playhead: draw };
    },
  },

  // 2 — Framing & windowing
  {
    render(container, ctx) {
      const { p, state } = ctx;
      const c = canvasEl();
      drawFraming(c, {
        signal: p.synth.signal,
        sampleRate: p.sampleRate,
        framing: p.framing,
        selectedFrame: state.selectedFrame,
      });
      const overlap = Math.round((1 - p.framing.hop / p.framing.frameSize) * 100);
      container.append(
        frameSlider(ctx),
        vizBlock('Framing + Hann window', c),
        chips([
          chip('frame size', p.framing.frameSize),
          chip('hop', p.framing.hop),
          chip('frames', p.framing.times.length),
          chip('overlap', overlap + '%'),
        ])
      );
      return {};
    },
  },

  // 3 — STFT / spectrogram
  {
    render(container, ctx) {
      const { p, state, helpers } = ctx;
      const c = canvasEl();
      const nFrames = p.stft.times.length;
      const draw = (sec) =>
        drawSpectrogram(c, {
          stft: p.stft,
          view: spectroView,
          selectedFrame: state.selectedFrame,
          playheadSec: sec,
        });
      draw(state.playhead);
      c.style.cursor = 'crosshair';
      c.addEventListener('click', (e) => {
        const rect = c.getBoundingClientRect();
        helpers.selectFrame(xToFrame(e.clientX - rect.left, rect.width, nFrames));
      });

      const mkBtn = (label, v) =>
        el('button', {
          class: spectroView === v ? 'active' : '',
          text: label,
          onclick: () => {
            spectroView = v;
            helpers.rerender();
          },
        });
      const viewToggle = el('div', { class: 'ctrl-group' }, [
        el('span', { class: 'hint', text: 'view:' }),
        mkBtn('Linear', 'linear'),
        mkBtn('CQT-style log', 'log'),
      ]);

      const freqRes = (p.sampleRate / p.framing.frameSize).toFixed(1);
      const timeRes = ((p.framing.hop / p.sampleRate) * 1000).toFixed(1);
      container.append(
        viewToggle,
        frameSlider(ctx),
        vizBlock('Spectrogram (click a column to inspect a frame)', c),
        chips([
          chip('frames', nFrames),
          chip('bins', p.stft.numBins),
          chip('Δf', freqRes + ' Hz'),
          chip('Δt', timeRes + ' ms'),
        ])
      );
      return { playhead: draw };
    },
  },

  // 4 — Harmonic analysis
  {
    render(container, ctx) {
      const { p, state } = ctx;
      const f = state.selectedFrame;
      const analysis = analyzeHarmonics(p.stft.mag[f], p.stft.freqs, p.sampleRate);
      const c = canvasEl();
      drawSpectrum(c, { mag: p.stft.mag[f], freqs: p.stft.freqs, analysis });
      const nHarm = analysis.partials.filter((x) => x.harmonic).length;
      container.append(
        frameSlider(ctx),
        vizBlock('Frame spectrum · partials & harmonic comb', c),
        el('div', { class: 'legend' }, [
          el('span', { html: '<i style="background:#3fb950"></i> harmonic partial' }),
          el('span', { html: '<i style="background:#d29922"></i> other peak' }),
          el('span', { html: '<i style="background:#f778ba"></i> ideal comb k·f₀' }),
        ]),
        chips([
          chip('f₀', analysis.f0 > 0 ? analysis.f0.toFixed(1) + ' Hz' : '—'),
          chip('note', analysis.f0 > 0 ? midiToName(analysis.f0midi) : '—'),
          chip('partials', analysis.partials.length),
          chip('harmonics', nHarm),
        ])
      );
      return {};
    },
  },

  // 5 — Onset detection
  {
    render(container, ctx) {
      const { p } = ctx;
      const wave = canvasEl();
      const onsetC = canvasEl();
      const drawW = (sec) =>
        drawWaveform(wave, {
          signal: p.synth.signal,
          sampleRate: p.sampleRate,
          onsets: p.onset.onsetTimes,
          playheadSec: sec,
        });
      const drawO = (sec) => drawOnset(onsetC, { onset: p.onset, totalSec: p.totalSec, playheadSec: sec });
      drawW(ctx.state.playhead);
      drawO(ctx.state.playhead);
      container.append(
        vizBlock('Waveform with detected onsets', wave),
        vizBlock('Spectral flux + adaptive threshold', onsetC),
        chips([
          chip('onsets', p.onset.onsetFrames.length),
          chip('ground-truth notes', p.score.notes.length),
        ])
      );
      return {
        playhead(sec) {
          drawW(sec);
          drawO(sec);
        },
      };
    },
  },

  // 6 — Pitch estimation (F0)
  {
    render(container, ctx) {
      const { p } = ctx;
      const c = canvasEl();
      const draw = (sec) => drawSalience(c, { pitch: p.pitch, totalSec: p.totalSec, playheadSec: sec });
      draw(ctx.state.playhead);
      let voiced = 0;
      if (p.pitch.poly) {
        for (const d of p.pitch.detected) voiced += d.length;
      } else {
        for (let i = 0; i < p.pitch.f0.length; i++) if (p.pitch.f0[i] > 0) voiced++;
      }
      container.append(
        vizBlock(p.pitch.poly ? 'Multi-F0 salience map' : 'F0 salience track', c),
        chips([
          chip('mode', p.pitch.poly ? 'poly multi-F0' : p.pitch.algo.toUpperCase()),
          chip(p.pitch.poly ? 'pitch detections' : 'voiced frames', voiced),
        ])
      );
      return { playhead: draw };
    },
  },

  // 7 — Note tracking
  {
    render(container, ctx) {
      const { p } = ctx;
      const c = canvasEl();
      const draw = (sec) =>
        drawPianoRoll(c, {
          events: p.tracked.events,
          ground: ghostsFrom(p.score),
          totalSec: p.totalSec,
          playheadSec: sec,
        });
      draw(ctx.state.playhead);
      container.append(
        vizBlock(t('recovered') + ' (dashed = ' + t('groundTruthLabel') + ')', c),
        chips([
          chip('recovered notes', p.tracked.events.length),
          chip('ground-truth', p.score.notes.length),
        ])
      );
      return { playhead: draw };
    },
  },

  // 8 — Quantization
  {
    render(container, ctx) {
      const { p } = ctx;
      const before = canvasEl();
      const after = canvasEl();
      const drawB = (sec) =>
        drawPianoRoll(before, { events: p.quant.before, totalSec: p.totalSec, playheadSec: sec, height: 200 });
      const drawA = (sec) =>
        drawPianoRoll(after, {
          events: p.quant.after,
          ground: ghostsFrom(p.score),
          totalSec: p.totalSec,
          playheadSec: sec,
          height: 200,
        });
      drawB(ctx.state.playhead);
      drawA(ctx.state.playhead);
      const gridLabel = '1/' + p.quant.division * 4;
      container.append(
        vizBlock('Before — raw measured times', before),
        vizBlock('After — snapped to ' + gridLabel + ' grid', after),
        chips([
          chip('tempo', p.quant.bpm + ' BPM'),
          chip('grid', gridLabel),
          chip('events', p.quant.after.length),
        ])
      );
      return {
        playhead(sec) {
          drawB(sec);
          drawA(sec);
        },
      };
    },
  },

  // 9 — MIDI generation
  {
    render(container, ctx) {
      const { p } = ctx;
      const dl = el('a', {
        class: 'dl',
        href: p.midi.url,
        download: 'amt-transcription.mid',
        text: t('downloadMidi'),
      });
      container.append(
        vizBlock('Standard MIDI File bytes', hexView(p.midi)),
        el('div', { class: 'legend' }, [
          el('span', { html: '<i style="background:#3fb950"></i> Note On' }),
          el('span', { html: '<i style="background:#f85149"></i> Note Off' }),
          el('span', { html: '<i style="background:#f778ba"></i> header / meta' }),
        ]),
        dl,
        chips([
          chip('file size', p.midi.byteLength + ' B'),
          chip('notes', p.midi.noteCount),
          chip('PPQ', 480),
        ])
      );
      return {};
    },
  },

  // 10 — Score
  {
    render(container, ctx) {
      const { p } = ctx;
      const div = el('div', { class: 'score-svg' });
      renderScore(div, p.quant, p.mode);
      const measures = new Set(p.quant.events.map((e) => Math.floor(e.onSteps / 16))).size;
      container.append(vizBlock('Score (partitura)', div), chips([
        chip('measures', measures || 1),
        chip('time sig', '4/4'),
        chip('notes', p.quant.events.length),
      ]));
      return {};
    },
  },

  // 11 — Accuracy
  {
    render(container, ctx) {
      const { p } = ctx;
      const m = p.metrics;
      const matchedSet = new Set(m.matches.map((x) => x.recovered));
      const falseSet = new Set(m.falsePos);
      const c = canvasEl();
      const draw = (sec) =>
        drawPianoRoll(c, {
          events: p.quant.events,
          ground: ghostsFrom(p.score),
          status: { matchedSet, falseSet, missed: m.missed },
          totalSec: p.totalSec,
          playheadSec: sec,
        });
      draw(ctx.state.playhead);
      const pct = (x) => (x * 100).toFixed(1) + '%';
      container.append(
        vizBlock('Recovered vs ground truth', c),
        el('div', { class: 'legend' }, [
          el('span', { html: '<i style="background:#3fb950"></i> matched' }),
          el('span', { html: '<i style="background:#f85149"></i> false positive' }),
          el('span', { html: '<i style="border:1px solid #8b949e"></i> ground truth' }),
        ]),
        chips([
          chip('Precision', pct(m.precision), 'good'),
          chip('Recall', pct(m.recall), 'good'),
          chip('F1', pct(m.f1), m.f1 > 0.7 ? 'good' : m.f1 > 0.4 ? 'warn' : 'bad'),
          chip('TP', m.tp),
          chip('FP', m.fp, 'bad'),
          chip('FN', m.fn, 'warn'),
        ])
      );
      return { playhead: draw };
    },
  },
];
