import { freqToMidi } from './music.js';

// Stage 5 — analyse a single frame's spectrum: find spectral peaks (partials),
// estimate the fundamental and label which harmonic each peak is.
//
// f0 is estimated by Harmonic Product Spectrum restricted to a musical range,
// which is robust against picking an overtone as the fundamental.

export function analyzeHarmonics(mag, freqs, sampleRate, fmin = 60, fmax = 1200) {
  const peaks = findPeaks(mag, freqs);
  const f0 = hpsFundamental(mag, freqs, sampleRate, fmin, fmax);

  // Label each peak with its nearest harmonic number of f0.
  const partials = peaks.map((p) => {
    const ratio = f0 > 0 ? p.freq / f0 : 0;
    const harmonic = Math.round(ratio);
    const inTune = harmonic > 0 && Math.abs(ratio - harmonic) < 0.06;
    return { ...p, harmonic: inTune ? harmonic : null };
  });

  // Ideal comb positions k*f0 up to Nyquist (for the overlay).
  const comb = [];
  if (f0 > 0) {
    for (let k = 1; k * f0 < sampleRate / 2 && k <= 12; k++) comb.push(k * f0);
  }

  return { f0, f0midi: f0 > 0 ? freqToMidi(f0) : 0, partials, comb };
}

// Local maxima above a relative threshold, returned strongest-first.
function findPeaks(mag, freqs, maxPeaks = 12) {
  let max = 1e-9;
  for (let i = 0; i < mag.length; i++) if (mag[i] > max) max = mag[i];
  const thr = max * 0.04;
  const peaks = [];
  for (let i = 2; i < mag.length - 2; i++) {
    if (
      mag[i] > thr &&
      mag[i] > mag[i - 1] &&
      mag[i] >= mag[i + 1] &&
      mag[i] > mag[i - 2] &&
      mag[i] >= mag[i + 2]
    ) {
      // Parabolic interpolation for a refined frequency.
      const a = mag[i - 1];
      const b = mag[i];
      const c = mag[i + 1];
      const denom = a - 2 * b + c;
      const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
      const binStep = freqs[1] - freqs[0];
      peaks.push({ freq: freqs[i] + shift * binStep, mag: b });
    }
  }
  peaks.sort((x, y) => y.mag - x.mag);
  return peaks.slice(0, maxPeaks);
}

// Harmonic Product Spectrum, constrained to [fmin, fmax].
function hpsFundamental(mag, freqs, sampleRate, fmin, fmax, R = 5) {
  const n = mag.length;
  const hps = Float32Array.from(mag);
  for (let r = 2; r <= R; r++) {
    for (let i = 0; i < n; i++) {
      const j = i * r;
      if (j < n) hps[i] *= mag[j];
      else hps[i] *= 1e-9;
    }
  }
  const binStep = freqs[1] - freqs[0];
  const loBin = Math.max(1, Math.floor(fmin / binStep));
  const hiBin = Math.min(n - 1, Math.ceil(fmax / binStep));
  let best = loBin;
  let bestVal = -1;
  for (let i = loBin; i <= hiBin; i++) {
    if (hps[i] > bestVal) {
      bestVal = hps[i];
      best = i;
    }
  }
  return bestVal > 0 ? freqs[best] : 0;
}
