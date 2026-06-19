import { freqToMidi } from './music.js';

// Stage 8 — turn per-frame pitch estimates into discrete note events
// { midi, onsetSec, offsetSec, confidence }.

const MIN_NOTE_SEC = 0.06;
const CONF_THRESHOLD = 0.3;

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}

// Median-smooth a MIDI sequence over voiced frames (0 = unvoiced).
function smoothMidi(midi, win = 2) {
  const out = new Float32Array(midi.length);
  for (let i = 0; i < midi.length; i++) {
    if (midi[i] === 0) {
      out[i] = 0;
      continue;
    }
    const vals = [];
    for (let k = -win; k <= win; k++) {
      const j = i + k;
      if (j >= 0 && j < midi.length && midi[j] > 0) vals.push(midi[j]);
    }
    out[i] = vals.length ? median(vals) : midi[i];
  }
  return out;
}

function trackMono(pitch, onset, framing) {
  const { f0, confidence, times } = pitch;
  const onsetSet = new Set(onset.onsetFrames);

  // Per-frame rounded MIDI (0 if unvoiced).
  const midi = new Float32Array(f0.length);
  for (let f = 0; f < f0.length; f++) {
    midi[f] = f0[f] > 0 && confidence[f] >= CONF_THRESHOLD ? Math.round(freqToMidi(f0[f])) : 0;
  }
  const sm = smoothMidi(midi);

  const events = [];
  let cur = null; // { midi, startFrame, confSum, n }
  const hop = framing.hop / framing.sampleRate;

  const flush = (endFrame) => {
    if (!cur) return;
    const onsetSec = times[cur.startFrame];
    const offsetSec = times[Math.max(cur.startFrame, endFrame - 1)] + hop;
    if (offsetSec - onsetSec >= MIN_NOTE_SEC) {
      events.push({
        midi: cur.midi,
        onsetSec,
        offsetSec,
        confidence: cur.confSum / cur.n,
      });
    }
    cur = null;
  };

  for (let f = 0; f < sm.length; f++) {
    const m = sm[f];
    const isOnset = onsetSet.has(f);
    if (m === 0) {
      flush(f);
      continue;
    }
    if (!cur || cur.midi !== m || isOnset) {
      flush(f);
      cur = { midi: m, startFrame: f, confSum: confidence[f], n: 1 };
    } else {
      cur.confSum += confidence[f];
      cur.n++;
    }
  }
  flush(sm.length);

  return { events, mode: 'mono' };
}

function trackPoly(pitch, framing) {
  const { detected, candidates, times } = pitch;
  const hop = framing.hop / framing.sampleRate;
  const events = [];

  // Build, per candidate pitch, the active-frame runs.
  for (const m of candidates) {
    let start = -1;
    for (let f = 0; f <= detected.length; f++) {
      const active = f < detected.length && detected[f].includes(m);
      if (active && start === -1) start = f;
      if (!active && start !== -1) {
        const onsetSec = times[start];
        const offsetSec = times[f - 1] + hop;
        if (offsetSec - onsetSec >= MIN_NOTE_SEC) {
          events.push({ midi: m, onsetSec, offsetSec, confidence: 0.6 });
        }
        start = -1;
      }
    }
  }
  events.sort((a, b) => a.onsetSec - b.onsetSec || a.midi - b.midi);
  return { events, mode: 'poly' };
}

export function trackNotes(pitch, onset, framing) {
  return pitch.poly ? trackPoly(pitch, framing) : trackMono(pitch, onset, framing);
}
