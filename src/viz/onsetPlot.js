import { setupCanvas, drawPlayhead } from './canvasUtils.js';

// Stage 6 — spectral-flux curve with adaptive threshold and picked onset peaks.
export function drawOnset(canvas, { onset, totalSec, playheadSec = -1 }) {
  const W = 1000;
  const H = 220;
  const { ctx, w, h } = setupCanvas(canvas, W, H);
  const { flux, threshold, onsetFrames, times } = onset;
  const n = flux.length;
  const pad = 18;
  const plotH = h - pad;

  const xOf = (f) => (f / (n - 1)) * w;
  const yOf = (v) => plotH - v * (plotH - 8);

  // Threshold (dashed).
  ctx.strokeStyle = 'rgba(210,153,34,0.8)';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let f = 0; f < n; f++) {
    const x = xOf(f);
    const y = yOf(threshold[f]);
    f === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Flux (filled).
  ctx.fillStyle = 'rgba(88,166,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, plotH);
  for (let f = 0; f < n; f++) ctx.lineTo(xOf(f), yOf(flux[f]));
  ctx.lineTo(w, plotH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#58a6ff';
  ctx.beginPath();
  for (let f = 0; f < n; f++) {
    const x = xOf(f);
    const y = yOf(flux[f]);
    f === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Picked onsets.
  for (const f of onsetFrames) {
    const x = xOf(f);
    ctx.strokeStyle = '#f778ba';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, plotH);
    ctx.stroke();
    ctx.fillStyle = '#f778ba';
    ctx.beginPath();
    ctx.arc(x, yOf(flux[f]), 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#8b949e';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText('spectral flux — — threshold   |   ● picked onsets', 8, 14);

  if (playheadSec >= 0 && times.length) {
    drawPlayhead(ctx, (playheadSec / totalSec) * w, h);
  }
}
