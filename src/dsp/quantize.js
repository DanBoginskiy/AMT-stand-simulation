// Stage 9 — snap note onsets/offsets to a tempo grid and pitches to semitones.

const DIVISION = 4; // sixteenth-note grid (4 per beat)
const MIN_GRID_STEPS = 1;

export function quantize(tracked, bpm) {
  const beat = 60 / bpm;
  const step = beat / DIVISION; // grid spacing in seconds

  const before = tracked.events.map((e) => ({ ...e }));
  const after = tracked.events.map((e) => {
    const onSteps = Math.round(e.onsetSec / step);
    let offSteps = Math.round(e.offsetSec / step);
    if (offSteps - onSteps < MIN_GRID_STEPS) offSteps = onSteps + MIN_GRID_STEPS;
    return {
      midi: Math.round(e.midi),
      onsetSec: onSteps * step,
      offsetSec: offSteps * step,
      onSteps,
      durSteps: offSteps - onSteps,
      confidence: e.confidence,
    };
  });

  after.sort((a, b) => a.onsetSec - b.onsetSec || a.midi - b.midi);

  return { before, after, events: after, bpm, division: DIVISION, step };
}
