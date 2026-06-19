import { midiToFreq } from './music.js';

// Stage 7 (poly) — simplified iterative multi-F0 estimation.
// For each frame: score every candidate MIDI pitch by a harmonic comb over the
// magnitude spectrum, pick the strongest, subtract its harmonics, repeat up to
// MAX_VOICES. This is a teaching-grade estimator (not Klapuri-grade): it shows
// both the idea and where overlapping harmonics cause it to fail.

const MAX_VOICES = 4;
const MIDI_LO = 48; // C3
const MIDI_HI = 84; // C6
const HARMONICS = 6;

// Build a salience grid: salience[frame][pitchIndex] and a per-frame list of
// detected F0s (as MIDI numbers).
export function estimatePitchPoly(framing, stft) {
  const { mag, freqs, sampleRate } = stft;
  const nFrames = mag.length;
  const binStep = freqs[1] - freqs[0];
  const candidates = [];
  for (let m = MIDI_LO; m <= MIDI_HI; m++) candidates.push(m);

  // Precompute, for each candidate, the bins of its first HARMONICS partials.
  const harmBins = candidates.map((m) => {
    const f0 = midiToFreq(m);
    const bins = [];
    for (let k = 1; k <= HARMONICS; k++) {
      const b = Math.round((k * f0) / binStep);
      if (b < freqs.length) bins.push(b);
    }
    return bins;
  });

  const salience = []; // salience[frame] = Float32Array(candidates.length)
  const detected = []; // detected[frame] = [midi, ...]

  for (let f = 0; f < nFrames; f++) {
    const residual = Float32Array.from(mag[f]);
    let frameEnergy = 1e-9;
    for (let b = 0; b < residual.length; b++) frameEnergy += residual[b];

    const sal = new Float32Array(candidates.length);
    const found = [];

    for (let voice = 0; voice < MAX_VOICES; voice++) {
      // Score every candidate against the residual spectrum.
      let bestIdx = -1;
      let bestScore = 0;
      for (let c = 0; c < candidates.length; c++) {
        const bins = harmBins[c];
        let score = 0;
        for (let h = 0; h < bins.length; h++) score += residual[bins[h]] / (h + 1);
        if (voice === 0) sal[c] = score; // record first-pass salience for viz
        if (score > bestScore) {
          bestScore = score;
          bestIdx = c;
        }
      }
      // Stop when the best candidate is weak relative to frame energy.
      if (bestIdx === -1 || bestScore < frameEnergy * 0.02) break;

      found.push(candidates[bestIdx]);
      // Subtract this voice's harmonics from the residual.
      for (const b of harmBins[bestIdx]) {
        residual[b] *= 0.15;
      }
    }

    // Normalize salience row for display.
    let mx = 1e-9;
    for (let c = 0; c < sal.length; c++) if (sal[c] > mx) mx = sal[c];
    for (let c = 0; c < sal.length; c++) sal[c] /= mx;

    salience.push(sal);
    detected.push(found);
  }

  return {
    poly: true,
    candidates,
    midiLo: MIDI_LO,
    midiHi: MIDI_HI,
    salience,
    detected,
    times: framing.times,
  };
}
