// Stage 12 — compare recovered notes against the ground truth.
// A recovered note matches a reference note if pitch is within ±0.5 semitone
// and onset within ±ONSET_TOL seconds (standard MIR note-level matching).

const ONSET_TOL = 0.05; // 50 ms

export function computeMetrics(recovered, reference) {
  const ref = reference.map((n) => ({ midi: n.midi, onset: n.startSec, used: false }));
  const matches = [];
  const falsePos = [];

  for (const r of recovered) {
    let bestJ = -1;
    let bestDt = Infinity;
    for (let j = 0; j < ref.length; j++) {
      if (ref[j].used) continue;
      if (Math.abs(ref[j].midi - r.midi) > 0.5) continue;
      const dt = Math.abs(ref[j].onset - r.onsetSec);
      if (dt <= ONSET_TOL && dt < bestDt) {
        bestDt = dt;
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      ref[bestJ].used = true;
      matches.push({ recovered: r, refIndex: bestJ });
    } else {
      falsePos.push(r);
    }
  }

  const missed = ref.filter((r) => !r.used);
  const tp = matches.length;
  const fp = falsePos.length;
  const fn = missed.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    tp,
    fp,
    fn,
    precision,
    recall,
    f1,
    matches,
    falsePos,
    missed,
    refCount: reference.length,
  };
}
