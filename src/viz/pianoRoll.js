import { setupCanvas, drawPlayhead } from './canvasUtils.js';
import { midiToName } from '../dsp/music.js';

// Piano roll. Renders recovered note events as bars; optionally overlays the
// ground-truth notes as outlined "ghost" bars, and can color recovered notes by
// match status (matched / false-positive) for the metrics view.
//
// opts: { events, ground, totalSec, playheadSec, status, height }
//   events  : [{ midi, onsetSec, offsetSec }]
//   ground  : [{ midi, startSec, durSec }]   (optional ghosts)
//   status  : { matchedSet:Set<event>, falseSet:Set<event>, missed:[refNote] } (optional)
export function drawPianoRoll(canvas, opts) {
  const { events = [], ground = null, totalSec, playheadSec = -1, status = null } = opts;
  const W = 1000;
  const H = opts.height || 280;
  const { ctx, w, h } = setupCanvas(canvas, W, H);

  // Determine MIDI range from all notes present.
  let lo = 127;
  let hi = 0;
  const allMidis = [
    ...events.map((e) => e.midi),
    ...(ground ? ground.map((g) => g.midi) : []),
  ];
  if (allMidis.length === 0) {
    ctx.fillStyle = '#8b949e';
    ctx.fillText('—', w / 2, h / 2);
    return;
  }
  for (const m of allMidis) {
    lo = Math.min(lo, m);
    hi = Math.max(hi, m);
  }
  lo -= 1;
  hi += 1;
  const rows = Math.max(1, hi - lo);
  const rowH = h / rows;
  const yOf = (m) => h - (m - lo) * rowH - rowH;
  const xOf = (sec) => (sec / totalSec) * w;

  // Row striping (white-key vs black-key feel) + labels.
  for (let m = lo; m < hi; m++) {
    const isBlack = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
    ctx.fillStyle = isBlack ? '#11161d' : '#161b22';
    ctx.fillRect(0, yOf(m), w, rowH);
    if (m % 12 === 0) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(midiToName(m), 2, yOf(m) + rowH - 2);
    }
  }

  // Ground-truth ghosts.
  if (ground) {
    ctx.strokeStyle = 'rgba(139,148,158,0.7)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    for (const g of ground) {
      const x = xOf(g.startSec);
      const x2 = xOf(g.startSec + g.durSec);
      ctx.strokeRect(x, yOf(g.midi) + 1, Math.max(2, x2 - x), rowH - 2);
    }
    ctx.setLineDash([]);
  }

  // Recovered notes.
  for (const e of events) {
    let fill = '#58a6ff';
    if (status) {
      if (status.falseSet && status.falseSet.has(e)) fill = '#f85149';
      else if (status.matchedSet && status.matchedSet.has(e)) fill = '#3fb950';
      else fill = '#d29922';
    }
    ctx.fillStyle = fill;
    const x = xOf(e.onsetSec);
    const x2 = xOf(e.offsetSec);
    ctx.fillRect(x, yOf(e.midi) + 1.5, Math.max(2, x2 - x), rowH - 3);
  }

  // Missed ground-truth notes (metrics view).
  if (status && status.missed) {
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 1.5;
    for (const m of status.missed) {
      const x = xOf(m.onset !== undefined ? m.onset : m.startSec);
      ctx.strokeRect(x, yOf(m.midi) + 1, 10, rowH - 2);
    }
  }

  if (playheadSec >= 0 && totalSec > 0) {
    drawPlayhead(ctx, xOf(playheadSec), h);
  }
}
