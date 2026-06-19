// ADSR amplitude envelope. Returns a gain value in [0,1] for a note of total
// length `durSamples` at sample index `i`.
export const ADSR = {
  attack: 0.01, // seconds
  decay: 0.08,
  sustain: 0.7, // level
  release: 0.12,
};

export function adsrGain(i, durSamples, sampleRate, env = ADSR) {
  const t = i / sampleRate;
  const dur = durSamples / sampleRate;
  const a = env.attack;
  const d = env.decay;
  const r = env.release;
  const relStart = Math.max(a + d, dur - r);

  if (t < a) return t / a; // attack ramp
  if (t < a + d) return 1 - (1 - env.sustain) * ((t - a) / d); // decay to sustain
  if (t < relStart) return env.sustain; // sustain
  // release
  const rt = (t - relStart) / Math.max(r, 1e-4);
  return Math.max(0, env.sustain * (1 - rt));
}

// Sampled envelope curve for visualization.
export function adsrCurve(durSec, sampleRate, env = ADSR, points = 200) {
  const durSamples = Math.round(durSec * sampleRate);
  const out = new Float32Array(points);
  for (let p = 0; p < points; p++) {
    const i = Math.round((p / (points - 1)) * (durSamples - 1));
    out[p] = adsrGain(i, durSamples, sampleRate, env);
  }
  return out;
}
