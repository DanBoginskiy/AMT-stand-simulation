// Stage 4b — map linear FFT bins onto a log-spaced (CQT-style) frequency grid.
// A true constant-Q transform is impractical in transparent JS, so we
// aggregate linear bins into 12-per-octave log bins (max-pooling). Labeled
// honestly in the UI as a "CQT-style log-frequency view".

const BINS_PER_OCTAVE = 12;
const F_MIN = 55; // A1

export function buildLogMap(freqs, sampleRate) {
  const fMax = sampleRate / 2;
  const octaves = Math.log2(fMax / F_MIN);
  const numLog = Math.max(1, Math.floor(octaves * BINS_PER_OCTAVE));

  // Center frequency of each log bin.
  const logFreqs = new Float32Array(numLog);
  for (let i = 0; i < numLog; i++) {
    logFreqs[i] = F_MIN * Math.pow(2, i / BINS_PER_OCTAVE);
  }

  // Precompute, for each log bin, the linear-bin range it aggregates.
  const ranges = [];
  for (let i = 0; i < numLog; i++) {
    const lo = F_MIN * Math.pow(2, (i - 0.5) / BINS_PER_OCTAVE);
    const hi = F_MIN * Math.pow(2, (i + 0.5) / BINS_PER_OCTAVE);
    let bLo = 0;
    let bHi = freqs.length - 1;
    while (bLo < freqs.length && freqs[bLo] < lo) bLo++;
    while (bHi > 0 && freqs[bHi] > hi) bHi--;
    ranges.push([bLo, Math.max(bLo, bHi)]);
  }

  // Raw max-pooled aggregation of one linear magnitude spectrum.
  function aggregate(mag) {
    const out = new Float32Array(numLog);
    for (let i = 0; i < numLog; i++) {
      const [bLo, bHi] = ranges[i];
      let v = 0;
      for (let b = bLo; b <= bHi; b++) if (mag[b] > v) v = mag[b];
      out[i] = v;
    }
    return out;
  }

  return { freqs: logFreqs, numLog, aggregate };
}
