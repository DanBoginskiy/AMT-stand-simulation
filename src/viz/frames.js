import { setupCanvas } from './canvasUtils.js';

// Stage 3 — show overlapping frames over the waveform, the Hann window shape,
// and one raw-vs-windowed frame.
export function drawFraming(canvas, { signal, sampleRate, framing, selectedFrame }) {
  const W = 1000;
  const H = 300;
  const { ctx, w, h } = setupCanvas(canvas, W, H);

  const topH = 120;
  const dur = signal.length / sampleRate;

  // --- Top: waveform + frame extents ---
  ctx.strokeStyle = '#30363d';
  ctx.beginPath();
  ctx.moveTo(0, topH / 2);
  ctx.lineTo(w, topH / 2);
  ctx.stroke();

  ctx.strokeStyle = '#3b4756';
  ctx.lineWidth = 1;
  const spp = signal.length / w;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const s0 = Math.floor(x * spp);
    const s1 = Math.min(signal.length, Math.floor((x + 1) * spp));
    let min = 1;
    let max = -1;
    for (let i = s0; i < s1; i++) {
      if (signal[i] < min) min = signal[i];
      if (signal[i] > max) max = signal[i];
    }
    ctx.moveTo(x + 0.5, topH / 2 - max * topH * 0.45);
    ctx.lineTo(x + 0.5, topH / 2 - min * topH * 0.45);
  }
  ctx.stroke();

  // Draw a handful of frame extents, highlight the selected one.
  const { frameSize, hop, times } = framing;
  const stride = Math.max(1, Math.floor(times.length / 24));
  for (let f = 0; f < times.length; f += stride) {
    const startSec = (f * hop) / sampleRate;
    const x0 = (startSec / dur) * w;
    const x1 = ((startSec + frameSize / sampleRate) / dur) * w;
    ctx.fillStyle = 'rgba(88,166,255,0.08)';
    ctx.fillRect(x0, 4, x1 - x0, topH - 8);
    ctx.strokeStyle = 'rgba(88,166,255,0.4)';
    ctx.strokeRect(x0, 4, x1 - x0, topH - 8);
  }
  // Selected frame.
  {
    const startSec = (selectedFrame * hop) / sampleRate;
    const x0 = (startSec / dur) * w;
    const x1 = ((startSec + frameSize / sampleRate) / dur) * w;
    ctx.fillStyle = 'rgba(247,120,186,0.18)';
    ctx.fillRect(x0, 4, x1 - x0, topH - 8);
    ctx.strokeStyle = '#f778ba';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 4, x1 - x0, topH - 8);
  }
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('Overlapping frames over the waveform (pink = selected)', 8, 14);

  // --- Bottom-left: Hann window ---
  const win = framing.window;
  const bx = 20;
  const by = topH + 150;
  const bw = 420;
  const bh = 120;
  ctx.fillText('Hann window', bx, topH + 22);
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < win.length; i++) {
    const x = bx + (i / (win.length - 1)) * bw;
    const y = by - win[i] * bh;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- Bottom-right: raw vs windowed frame ---
  const raw = framing.frames[selectedFrame];
  const wd = framing.windowed[selectedFrame];
  const rx = 540;
  const rw = 440;
  const rmid = topH + 90;
  ctx.fillStyle = '#8b949e';
  ctx.fillText('Selected frame: raw (grey) vs windowed (blue)', rx, topH + 22);
  if (raw && wd) {
    ctx.strokeStyle = '#586069';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < raw.length; i++) {
      const x = rx + (i / (raw.length - 1)) * rw;
      const y = rmid - raw[i] * 70;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#58a6ff';
    ctx.beginPath();
    for (let i = 0; i < wd.length; i++) {
      const x = rx + (i / (wd.length - 1)) * rw;
      const y = rmid - wd[i] * 70;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
