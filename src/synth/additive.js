import { midiToFreq } from '../dsp/music.js';
import { adsrGain, adsrCurve, ADSR } from './adsr.js';

const NUM_HARMONICS = 7;
const NOISE_LEVEL = 0.004;

// Deterministic pseudo-noise (avoids Math.random for reproducibility).
function pseudoNoise(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

// Harmonic amplitudes a_k ≈ 1/k (normalized so the sum is bounded).
function harmonicAmps(n = NUM_HARMONICS) {
  const amps = new Float32Array(n);
  let sum = 0;
  for (let k = 1; k <= n; k++) {
    amps[k - 1] = 1 / k;
    sum += amps[k - 1];
  }
  for (let k = 0; k < n; k++) amps[k] /= sum;
  return amps;
}

// Render a single note's additive samples into `buffer` starting at `startIdx`.
function renderNoteInto(buffer, note, sampleRate, amps) {
  const f0 = midiToFreq(note.midi);
  const durSamples = Math.round(note.durSec * sampleRate);
  const startIdx = Math.round(note.startSec * sampleRate);
  const twoPiOverSr = (2 * Math.PI) / sampleRate;

  for (let i = 0; i < durSamples; i++) {
    const idx = startIdx + i;
    if (idx >= buffer.length) break;
    let s = 0;
    for (let k = 1; k <= amps.length; k++) {
      s += amps[k - 1] * Math.sin(twoPiOverSr * (k * f0) * idx);
    }
    const g = adsrGain(i, durSamples, sampleRate, ADSR) * note.velocity;
    buffer[idx] += s * g;
  }
}

// Synthesize the whole score -> Float32Array signal + per-note inspection data.
export function synthesize(score, sampleRate, totalSec) {
  const n = Math.round(totalSec * sampleRate);
  const signal = new Float32Array(n);
  const amps = harmonicAmps();

  for (const note of score.notes) {
    renderNoteInto(signal, note, sampleRate, amps);
  }

  // Add a faint noise floor.
  for (let i = 0; i < n; i++) signal[i] += pseudoNoise(i) * NOISE_LEVEL;

  // Normalize to ~0.9 peak.
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(signal[i]));
  const norm = 0.9 / peak;
  for (let i = 0; i < n; i++) signal[i] *= norm;

  // Build inspection data for the FIRST note: each harmonic as its own curve
  // plus the ADSR envelope, for the "note = Σ harmonics" visualization.
  const first = score.notes[0];
  const inspect = buildInspect(first, sampleRate, amps);

  return { signal, sampleRate, durationSec: totalSec, amps, inspect };
}

function buildInspect(note, sampleRate, amps) {
  const f0 = midiToFreq(note.midi);
  // Show ~3 periods of the fundamental so harmonics are visible.
  const showSec = Math.min(note.durSec, 4 / f0);
  const len = Math.round(showSec * sampleRate);
  const twoPiOverSr = (2 * Math.PI) / sampleRate;
  const harmonics = [];
  const sum = new Float32Array(len);
  for (let k = 1; k <= amps.length; k++) {
    const curve = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const v = amps[k - 1] * Math.sin(twoPiOverSr * (k * f0) * i);
      curve[i] = v;
      sum[i] += v;
    }
    harmonics.push({ k, freq: k * f0, amp: amps[k - 1], curve });
  }
  return {
    midi: note.midi,
    f0,
    showSec,
    sampleRate,
    harmonics,
    sum,
    envelope: adsrCurve(note.durSec, sampleRate),
  };
}
