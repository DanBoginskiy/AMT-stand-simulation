import { setupCanvas, viridis, drawPlayhead } from './canvasUtils.js';

// Build the spectrogram base image once per (stft, view) and cache it. The base
// is an offscreen canvas at native resolution (bins × frames); drawing just
// scales it, so playhead/cursor redraws stay cheap.
const cache = new WeakMap();

function baseImage(stft, view) {
  let entry = cache.get(stft);
  if (!entry) {
    entry = {};
    cache.set(stft, entry);
  }
  if (entry[view]) return entry[view];

  const data = view === 'log' ? stft.logMag : stft.magDb;
  const nFrames = data.length;
  const nBins = data[0].length;
  const off = document.createElement('canvas');
  off.width = nFrames;
  off.height = nBins;
  const octx = off.getContext('2d');
  const img = octx.createImageData(nFrames, nBins);

  for (let f = 0; f < nFrames; f++) {
    const col = data[f];
    for (let b = 0; b < nBins; b++) {
      const [r, g, bl] = viridis(col[b]);
      // Flip vertically: low frequency at the bottom.
      const y = nBins - 1 - b;
      const idx = (y * nFrames + f) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = bl;
      img.data[idx + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  entry[view] = { off, nFrames, nBins };
  return entry[view];
}

export function drawSpectrogram(canvas, { stft, view = 'linear', selectedFrame = -1, playheadSec = -1 }) {
  const W = 1000;
  const H = 320;
  const { ctx, w, h } = setupCanvas(canvas, W, H);
  const base = baseImage(stft, view);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base.off, 0, 0, base.nFrames, base.nBins, 0, 0, w, h);

  // Frequency axis labels.
  const maxFreq = view === 'log' ? stft.logFreqs[stft.logFreqs.length - 1] : stft.freqs[stft.freqs.length - 1];
  const minFreq = view === 'log' ? stft.logFreqs[0] : 0;
  ctx.fillStyle = 'rgba(230,237,243,0.75)';
  ctx.font = '10px ui-monospace, monospace';
  const ticks = view === 'log' ? [55, 110, 220, 440, 880, 1760, 3520] : [0, 1000, 2000, 4000, 6000, 8000, 10000];
  for (const fz of ticks) {
    if (fz < minFreq || fz > maxFreq) continue;
    let frac;
    if (view === 'log') frac = Math.log2(fz / minFreq) / Math.log2(maxFreq / minFreq);
    else frac = fz / maxFreq;
    const y = h - frac * h;
    ctx.fillText(fz >= 1000 ? fz / 1000 + 'k' : String(fz), 4, y - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Selected-frame cursor.
  if (selectedFrame >= 0) {
    const x = (selectedFrame / base.nFrames) * w;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  if (playheadSec >= 0 && stft.times.length) {
    const totalSec = stft.times[stft.times.length - 1];
    drawPlayhead(ctx, (playheadSec / totalSec) * w, h);
  }
}

// Convert a CSS x-coordinate (within the displayed canvas) to a frame index.
export function xToFrame(cssX, cssWidth, nFrames) {
  return Math.max(0, Math.min(nFrames - 1, Math.floor((cssX / cssWidth) * nFrames)));
}
