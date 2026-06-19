import { setupCanvas, viridis, drawPlayhead } from './canvasUtils.js';
import { freqToMidi, midiToName } from '../dsp/music.js';

const MIDI_LO = 48; // C3
const MIDI_HI = 84; // C6

// Stage 7 — pitch salience over time. Mono: F0 track colored by confidence.
// Poly: salience heatmap + detected multi-F0 markers.
export function drawSalience(canvas, { pitch, totalSec, playheadSec = -1 }) {
  const W = 1000;
  const H = 320;
  const { ctx, w, h } = setupCanvas(canvas, W, H);
  const rows = MIDI_HI - MIDI_LO;
  const yOfMidi = (m) => h - ((m - MIDI_LO) / rows) * h;

  // Horizontal guide lines at octaves (C notes).
  ctx.strokeStyle = '#21262d';
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px ui-monospace, monospace';
  for (let m = MIDI_LO; m <= MIDI_HI; m += 12) {
    const y = yOfMidi(m);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText(midiToName(m), 2, y - 2);
  }

  if (pitch.poly) {
    // Heatmap of salience[frame][candidate].
    const nFrames = pitch.salience.length;
    const cands = pitch.candidates;
    const cellW = w / nFrames;
    for (let f = 0; f < nFrames; f++) {
      const row = pitch.salience[f];
      for (let c = 0; c < cands.length; c++) {
        const v = row[c];
        if (v < 0.15) continue;
        const [r, g, b] = viridis(v);
        ctx.fillStyle = `rgba(${r},${g},${b},${v})`;
        const y = yOfMidi(cands[c]);
        ctx.fillRect(f * cellW, y - (h / rows) / 2, Math.max(1, cellW), h / rows);
      }
    }
    // Detected F0 markers.
    ctx.fillStyle = '#f778ba';
    for (let f = 0; f < nFrames; f++) {
      const x = (f + 0.5) * cellW;
      for (const m of pitch.detected[f]) {
        ctx.beginPath();
        ctx.arc(x, yOfMidi(m), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Mono F0 track.
    const f0 = pitch.f0;
    const conf = pitch.confidence;
    for (let f = 0; f < f0.length; f++) {
      if (f0[f] <= 0) continue;
      const m = freqToMidi(f0[f]);
      if (m < MIDI_LO || m > MIDI_HI) continue;
      const x = (f / (f0.length - 1)) * w;
      const [r, g, b] = viridis(Math.min(1, conf[f]));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(x, yOfMidi(m), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8b949e';
    ctx.fillText(`algorithm: ${pitch.algo.toUpperCase()}  ·  color = confidence`, 8, 14);
  }

  if (playheadSec >= 0 && totalSec > 0) {
    drawPlayhead(ctx, (playheadSec / totalSec) * w, h);
  }
}
