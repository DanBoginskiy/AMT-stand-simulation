import { setupCanvas, drawPlayhead } from './canvasUtils.js';

// Time-domain waveform with optional onset markers and a playhead.
export function drawWaveform(canvas, { signal, sampleRate, onsets = [], playheadSec = -1, frameSize = 0, hop = 0 }) {
  const W = 1000;
  const H = 170;
  const { ctx, w, h } = setupCanvas(canvas, W, H);
  const mid = h / 2;
  const dur = signal.length / sampleRate;

  // Center line.
  ctx.strokeStyle = '#2d3748';
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Min/max envelope per pixel column.
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1;
  const samplesPerPx = signal.length / w;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const s0 = Math.floor(x * samplesPerPx);
    const s1 = Math.min(signal.length, Math.floor((x + 1) * samplesPerPx));
    let min = 1;
    let max = -1;
    for (let i = s0; i < s1; i++) {
      const v = signal[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(x + 0.5, mid - max * mid * 0.95);
    ctx.lineTo(x + 0.5, mid - min * mid * 0.95);
  }
  ctx.stroke();

  // Onset markers.
  ctx.strokeStyle = 'rgba(247,120,186,0.8)';
  ctx.lineWidth = 1.5;
  for (const t of onsets) {
    const x = (t / dur) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  if (playheadSec >= 0 && playheadSec <= dur) {
    drawPlayhead(ctx, (playheadSec / dur) * w, h);
  }
}
