import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import { midiToVexKey } from '../dsp/music.js';

// Stage 11 — render recovered note events as standard notation with VexFlow.
// Wrapped defensively: a notation hiccup must never break the page.

const STEPS_PER_MEASURE = 16; // 4/4 at a sixteenth grid

function durToVex(steps) {
  if (steps >= 16) return 'w';
  if (steps >= 8) return 'h';
  if (steps >= 4) return 'q';
  if (steps >= 2) return '8';
  return '16';
}

// Build VexFlow StaveNotes for one measure. In poly mode notes sharing the same
// onset step are merged into a chord.
function buildNotes(measureEvents, poly) {
  const groups = poly ? groupByOnset(measureEvents) : measureEvents.map((e) => [e]);
  const notes = [];
  for (const g of groups) {
    g.sort((a, b) => a.midi - b.midi);
    const keys = g.map((e) => midiToVexKey(e.midi));
    const steps = Math.max(...g.map((e) => e.durSteps));
    const sn = new StaveNote({
      keys: keys.map((k) => k.key),
      duration: durToVex(steps),
      clef: 'treble',
    });
    keys.forEach((k, i) => {
      if (k.accidental) sn.addModifier(new Accidental(k.accidental), i);
    });
    notes.push(sn);
  }
  return notes;
}

function groupByOnset(events) {
  const map = new Map();
  for (const e of events) {
    if (!map.has(e.onSteps)) map.set(e.onSteps, []);
    map.get(e.onSteps).push(e);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

export function renderScore(container, quant, mode) {
  container.innerHTML = '';
  const events = quant.events;
  if (!events.length) {
    container.textContent = '—';
    return;
  }

  try {
    // Group events into measures.
    const measures = new Map();
    for (const e of events) {
      const mi = Math.floor(e.onSteps / STEPS_PER_MEASURE);
      if (!measures.has(mi)) measures.set(mi, []);
      measures.get(mi).push(e);
    }
    const measureIdx = [...measures.keys()].sort((a, b) => a - b);

    const perRow = 4;
    const staveW = 250;
    const firstExtra = 50; // clef/time signature space
    const rowH = 130;
    const rows = Math.ceil(measureIdx.length / perRow);
    const width = firstExtra + perRow * staveW + 20;
    const height = rows * rowH + 20;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    measureIdx.forEach((mi, n) => {
      const row = Math.floor(n / perRow);
      const col = n % perRow;
      const isFirstInRow = col === 0;
      const x = 10 + col * staveW + (isFirstInRow ? 0 : firstExtra);
      const y = 10 + row * rowH;
      const w = staveW + (isFirstInRow ? firstExtra : 0);

      const stave = new Stave(x, y, w);
      if (isFirstInRow) stave.addClef('treble').addTimeSignature('4/4');
      stave.setContext(ctx).draw();

      const notes = buildNotes(measures.get(mi), mode === 'poly');
      const voice = new Voice({ num_beats: 4, beat_value: 4 });
      voice.setStrict(false);
      voice.addTickables(notes);
      new Formatter().joinVoices([voice]).format([voice], w - 40);
      voice.draw(ctx, stave);
    });
  } catch (err) {
    // Fallback: list the notes textually so the page still works.
    container.innerHTML = '';
    const pre = document.createElement('div');
    pre.style.color = '#333';
    pre.style.padding = '8px';
    pre.textContent = 'Notation fallback: ' + events.map((e) => e.midi).join(', ');
    container.appendChild(pre);
    // eslint-disable-next-line no-console
    console.warn('VexFlow render failed, used fallback:', err);
  }
}
