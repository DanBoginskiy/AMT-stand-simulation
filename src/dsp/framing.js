import { hann } from './window.js';

// Stage 3 — slice the signal into overlapping frames and apply a Hann window.
// Returns frames (raw), windowed frames, the window, frame center times.
export function frameSignal(signal, frameSize, hop, sampleRate) {
  const window = hann(frameSize);
  const frames = [];
  const windowed = [];
  const times = [];

  const last = signal.length - frameSize;
  for (let start = 0; start <= Math.max(0, last); start += hop) {
    const raw = new Float32Array(frameSize);
    const win = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      const v = signal[start + i] || 0;
      raw[i] = v;
      win[i] = v * window[i];
    }
    frames.push(raw);
    windowed.push(win);
    times.push((start + frameSize / 2) / sampleRate);
  }

  return { frames, windowed, window, frameSize, hop, times, sampleRate };
}
