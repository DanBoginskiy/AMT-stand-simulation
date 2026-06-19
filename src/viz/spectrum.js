import { setupCanvas } from './canvasUtils.js';

// Stage 5 — single-frame magnitude spectrum with partial markers and the ideal
// harmonic comb k·f0.
export function drawSpectrum(canvas, { mag, freqs, analysis, maxFreqShown = 4000 }) {
  const W = 1000;
  const H = 300;
  const { ctx, w, h } = setupCanvas(canvas, W, H);
  const pad = 28;
  const plotH = h - pad;

  // Limit displayed frequency range.
  let maxBin = freqs.length - 1;
  while (maxBin > 1 && freqs[maxBin] > maxFreqShown) maxBin--;

  let maxMag = 1e-9;
  for (let b = 0; b <= maxBin; b++) maxMag = Math.max(maxMag, mag[b]);

  const xOf = (b) => (b / maxBin) * w;
  const yOf = (m) => plotH - (m / maxMag) * (plotH - 10);

  // Comb overlay (ideal k·f0).
  if (analysis && analysis.comb) {
    ctx.strokeStyle = 'rgba(247,120,186,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    for (const cf of analysis.comb) {
      if (cf > freqs[maxBin]) break;
      const b = (cf / freqs[maxBin]) * maxBin;
      const x = xOf(b);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Magnitude curve (filled).
  ctx.fillStyle = 'rgba(88,166,255,0.25)';
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, plotH);
  for (let b = 0; b <= maxBin; b++) {
    ctx.lineTo(xOf(b), yOf(mag[b]));
  }
  ctx.lineTo(w, plotH);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (let b = 0; b <= maxBin; b++) {
    const x = xOf(b);
    const y = yOf(mag[b]);
    b === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Partial markers.
  if (analysis && analysis.partials) {
    for (const p of analysis.partials) {
      if (p.freq > freqs[maxBin]) continue;
      const b = (p.freq / freqs[maxBin]) * maxBin;
      const x = xOf(b);
      const y = yOf(p.mag);
      ctx.fillStyle = p.harmonic ? '#3fb950' : '#d29922';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (p.harmonic) {
        ctx.fillStyle = '#3fb950';
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('h' + p.harmonic, x + 4, y - 4);
      }
    }
  }

  // Frequency axis ticks.
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px ui-monospace, monospace';
  for (let fz = 0; fz <= freqs[maxBin]; fz += 1000) {
    const b = (fz / freqs[maxBin]) * maxBin;
    const x = xOf(b);
    ctx.fillText(fz >= 1000 ? fz / 1000 + 'k' : String(fz), x + 2, h - 6);
    ctx.strokeStyle = '#21262d';
    ctx.beginPath();
    ctx.moveTo(x, plotH);
    ctx.lineTo(x, plotH + 4);
    ctx.stroke();
  }
}
