import { magnitudeSpectrum } from './fft.js';
import { buildLogMap } from './logfreq.js';

// Stage 4 — Short-Time Fourier Transform. For every windowed frame compute the
// magnitude spectrum; assemble the spectrogram plus a log-frequency view.
export function computeSTFT(framing, sampleRate) {
  const { windowed, frameSize, times } = framing;
  const numBins = (frameSize >> 1) + 1;
  const mag = []; // mag[frame] = Float32Array(numBins)
  let maxMag = 1e-9;

  for (let f = 0; f < windowed.length; f++) {
    const m = magnitudeSpectrum(windowed[f]);
    mag.push(m);
    for (let b = 0; b < numBins; b++) if (m[b] > maxMag) maxMag = m[b];
  }

  // Frequency for each linear bin.
  const freqs = new Float32Array(numBins);
  for (let b = 0; b < numBins; b++) freqs[b] = (b * sampleRate) / frameSize;

  // dB-scaled, normalized magnitude in [0,1] for display.
  const magDb = mag.map((m) => {
    const out = new Float32Array(numBins);
    for (let b = 0; b < numBins; b++) {
      const db = 20 * Math.log10((m[b] + 1e-9) / maxMag);
      out[b] = Math.max(0, (db + 80) / 80); // -80 dB floor -> 0
    }
    return out;
  });

  // Log-frequency (CQT-style) mapping — two passes: raw aggregate then global
  // dB normalization so every frame shares the same scale.
  const logMap = buildLogMap(freqs, sampleRate);
  const logRaw = mag.map((m) => logMap.aggregate(m));
  let logMax = 1e-9;
  for (const r of logRaw) for (let i = 0; i < r.length; i++) if (r[i] > logMax) logMax = r[i];
  const logMag = logRaw.map((r) => {
    const out = new Float32Array(r.length);
    for (let i = 0; i < r.length; i++) {
      const db = 20 * Math.log10((r[i] + 1e-9) / logMax);
      out[i] = Math.max(0, (db + 80) / 80);
    }
    return out;
  });

  return {
    mag, // linear magnitude (raw) — used by harmonics/onset/pitch
    magDb, // normalized dB in [0,1] — for the spectrogram heatmap
    logMag, // log-frequency normalized magnitude per frame
    logFreqs: logMap.freqs,
    freqs,
    times,
    numBins,
    frameSize,
    sampleRate,
    maxMag,
  };
}
