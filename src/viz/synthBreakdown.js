import { setupCanvas } from './canvasUtils.js';
import { midiToName } from '../dsp/music.js';

// "A note = Σ harmonics" visualization: each harmonic as a faint sine, their
// sum overlaid, plus the ADSR envelope of the first note.
export function drawSynthBreakdown(canvas, inspect) {
  const W = 1000;
  const H = 260;
  const { ctx, w, h } = setupCanvas(canvas, W, H);
  const { harmonics, sum } = inspect;
  const n = sum.length;
  if (n === 0) return;

  const topH = h * 0.62;
  const midTop = topH / 2;

  // Section divider.
  ctx.strokeStyle = '#2d3748';
  ctx.beginPath();
  ctx.moveTo(0, topH);
  ctx.lineTo(w, topH);
  ctx.stroke();

  const colors = ['#58a6ff', '#3fb950', '#d29922', '#f778ba', '#a371f7', '#56d4dd', '#ff7b72'];

  // Individual harmonics (faint).
  harmonics.forEach((harm, hi) => {
    ctx.strokeStyle = colors[hi % colors.length];
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = midTop - harm.curve[i] * midTop * 2.4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Sum (bold white).
  ctx.strokeStyle = '#e6edf3';
  ctx.lineWidth = 1.8;
  let maxSum = 1e-9;
  for (let i = 0; i < n; i++) maxSum = Math.max(maxSum, Math.abs(sum[i]));
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const y = midTop - (sum[i] / maxSum) * midTop * 0.9;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#8b949e';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(
    `${midiToName(inspect.midi)}  f₀=${inspect.f0.toFixed(1)} Hz  ·  faint = harmonics k·f₀,  white = sum`,
    8,
    14
  );

  // ADSR envelope (bottom strip).
  const env = inspect.envelope;
  const by = topH + (h - topH) - 10;
  const bh = h - topH - 24;
  ctx.fillStyle = '#8b949e';
  ctx.fillText('ADSR envelope', 8, topH + 16);
  ctx.strokeStyle = '#f778ba';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < env.length; i++) {
    const x = (i / (env.length - 1)) * w;
    const y = by - env[i] * bh;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}
