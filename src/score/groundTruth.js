// Stage 1 — the known note sequence we synthesize and later compare against.
// A note: { midi, startSec, durSec, velocity }.

// Build notes from a compact [midi, beats] list played sequentially.
function sequential(seq, bpm, velocity = 0.9) {
  const beat = 60 / bpm;
  const notes = [];
  let t = 0;
  for (const [midi, beats] of seq) {
    notes.push({ midi, startSec: t, durSec: beats * beat * 0.95, velocity });
    t += beats * beat;
  }
  return notes;
}

// Build chords from a list of [ [midi...], beats ].
function chordal(seq, bpm, velocity = 0.8) {
  const beat = 60 / bpm;
  const notes = [];
  let t = 0;
  for (const [midis, beats] of seq) {
    for (const midi of midis) {
      notes.push({ midi, startSec: t, durSec: beats * beat * 0.95, velocity });
    }
    t += beats * beat;
  }
  return notes;
}

// "Twinkle, Twinkle" opening — clean monophonic melody, range C4..A4.
// 60=C4 62=D4 64=E4 65=F4 67=G4 69=A4
const MONO_SEQ = [
  [60, 1], [60, 1], [67, 1], [67, 1],
  [69, 1], [69, 1], [67, 2],
  [65, 1], [65, 1], [64, 1], [64, 1],
  [62, 1], [62, 1], [60, 2],
];

// A short I–IV–V–I style chord progression (triads) for polyphony.
const POLY_SEQ = [
  [[60, 64, 67], 2], // C major
  [[65, 69, 72], 2], // F major
  [[67, 71, 74], 2], // G major
  [[60, 64, 67], 2], // C major
];

export function getGroundTruth(mode, bpm) {
  if (mode === 'poly') {
    return { mode, tempoBPM: bpm, notes: chordal(POLY_SEQ, bpm) };
  }
  return { mode, tempoBPM: bpm, notes: sequential(MONO_SEQ, bpm) };
}

// Total duration (seconds) the score spans, with a small tail.
export function scoreDuration(score) {
  let end = 0;
  for (const n of score.notes) end = Math.max(end, n.startSec + n.durSec);
  return end + 0.3;
}
