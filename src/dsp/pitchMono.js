// Stage 7 (mono) — per-frame fundamental frequency via three classic methods:
// YIN (time-domain), HPS (frequency-domain) and ACF (autocorrelation).
// Each returns { f0, confidence } per frame.

const FMIN = 70;
const FMAX = 1000;

// ---------- YIN ----------
export function yin(frame, sampleRate, threshold = 0.12) {
  const n = frame.length;
  const tauMax = Math.min(Math.floor(sampleRate / FMIN), n >> 1);
  const tauMin = Math.max(2, Math.floor(sampleRate / FMAX));

  // Difference function d(tau).
  const d = new Float32Array(tauMax);
  for (let tau = 1; tau < tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < n - tauMax; i++) {
      const diff = frame[i] - frame[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalized difference.
  const cmnd = new Float32Array(tauMax);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau < tauMax; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  // Absolute threshold: first dip below threshold, then refine to local min.
  let tau = -1;
  for (let t = tauMin; t < tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 < tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return { f0: 0, confidence: 0 };

  // Parabolic interpolation around the chosen tau.
  let betterTau = tau;
  if (tau > 1 && tau < tauMax - 1) {
    const s0 = cmnd[tau - 1];
    const s1 = cmnd[tau];
    const s2 = cmnd[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) betterTau = tau + (s2 - s0) / denom;
  }
  return { f0: sampleRate / betterTau, confidence: 1 - cmnd[tau] };
}

// ---------- HPS (uses precomputed magnitude spectrum) ----------
export function hps(mag, freqs, sampleRate, R = 5) {
  const n = mag.length;
  const prod = Float32Array.from(mag);
  for (let r = 2; r <= R; r++) {
    for (let i = 0; i < n; i++) {
      const j = i * r;
      prod[i] *= j < n ? mag[j] : 1e-9;
    }
  }
  const binStep = freqs[1] - freqs[0];
  const lo = Math.max(1, Math.floor(FMIN / binStep));
  const hi = Math.min(n - 1, Math.ceil(FMAX / binStep));
  let best = lo;
  let bestVal = -1;
  for (let i = lo; i <= hi; i++) {
    if (prod[i] > bestVal) {
      bestVal = prod[i];
      best = i;
    }
  }
  // Energy-based confidence.
  let energy = 1e-9;
  for (let i = 0; i < n; i++) energy += mag[i];
  const conf = Math.min(1, mag[best] / (energy / n) / 20);
  return { f0: bestVal > 0 ? freqs[best] : 0, confidence: conf };
}

// ---------- ACF (autocorrelation) ----------
export function acf(frame, sampleRate) {
  const n = frame.length;
  const tauMax = Math.min(Math.floor(sampleRate / FMIN), n >> 1);
  const tauMin = Math.max(2, Math.floor(sampleRate / FMAX));

  // Energy at lag 0 for normalization.
  let r0 = 0;
  for (let i = 0; i < n; i++) r0 += frame[i] * frame[i];
  if (r0 < 1e-7) return { f0: 0, confidence: 0 };

  let bestTau = -1;
  let bestVal = 0;
  for (let tau = tauMin; tau < tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < n - tau; i++) s += frame[i] * frame[i + tau];
    const norm = s / r0;
    if (norm > bestVal) {
      bestVal = norm;
      bestTau = tau;
    }
  }
  if (bestTau === -1 || bestVal < 0.3) return { f0: 0, confidence: 0 };
  return { f0: sampleRate / bestTau, confidence: bestVal };
}

// Run the chosen algorithm across all frames.
export function estimatePitchMono(framing, stft, algo) {
  const { windowed, sampleRate } = framing;
  const nFrames = windowed.length;
  const f0 = new Float32Array(nFrames);
  const conf = new Float32Array(nFrames);

  for (let f = 0; f < nFrames; f++) {
    let res;
    if (algo === 'hps') res = hps(stft.mag[f], stft.freqs, sampleRate);
    else if (algo === 'acf') res = acf(windowed[f], sampleRate);
    else res = yin(windowed[f], sampleRate);
    f0[f] = res.f0;
    conf[f] = res.confidence;
  }

  return { algo, f0, confidence: conf, times: framing.times, poly: false };
}
