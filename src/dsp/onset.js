// Stage 6 — onset detection via spectral flux + adaptive-threshold peak picking.

export function detectOnsets(stft) {
  const { mag, times, numBins } = stft;
  const nFrames = mag.length;
  const flux = new Float32Array(nFrames);

  // Spectral flux: sum of positive magnitude changes between adjacent frames.
  for (let f = 1; f < nFrames; f++) {
    let s = 0;
    const cur = mag[f];
    const prev = mag[f - 1];
    for (let b = 0; b < numBins; b++) {
      const d = cur[b] - prev[b];
      if (d > 0) s += d;
    }
    flux[f] = s;
  }

  // Normalize to [0,1].
  let max = 1e-9;
  for (let f = 0; f < nFrames; f++) if (flux[f] > max) max = flux[f];
  const fluxN = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) fluxN[f] = flux[f] / max;

  // Adaptive threshold = local mean + delta, over a sliding window.
  const W = 8;
  const delta = 0.12;
  const threshold = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    let sum = 0;
    let cnt = 0;
    for (let k = -W; k <= W; k++) {
      const j = f + k;
      if (j >= 0 && j < nFrames) {
        sum += fluxN[j];
        cnt++;
      }
    }
    threshold[f] = sum / cnt + delta;
  }

  // Peak picking: local maxima above threshold, with a minimum gap.
  const minGapFrames = 4;
  const onsetFrames = [];
  let lastOnset = -minGapFrames;
  for (let f = 1; f < nFrames - 1; f++) {
    if (
      fluxN[f] > threshold[f] &&
      fluxN[f] >= fluxN[f - 1] &&
      fluxN[f] > fluxN[f + 1] &&
      f - lastOnset >= minGapFrames
    ) {
      onsetFrames.push(f);
      lastOnset = f;
    }
  }

  const onsetTimes = onsetFrames.map((f) => times[f]);
  return { flux: fluxN, threshold, onsetFrames, onsetTimes, times };
}
