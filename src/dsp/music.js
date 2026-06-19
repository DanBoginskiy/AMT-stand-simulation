// Shared music-theory helpers used across synthesis, tracking and notation.

export const A4 = 440;

// MIDI note number -> frequency in Hz (equal temperament).
export function midiToFreq(midi) {
  return A4 * Math.pow(2, (midi - 69) / 12);
}

// Frequency in Hz -> (fractional) MIDI note number.
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / A4);
}

const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// MIDI number -> "C#4" style label.
export function midiToName(midi) {
  const m = Math.round(midi);
  const name = NAMES_SHARP[((m % 12) + 12) % 12];
  const octave = Math.floor(m / 12) - 1;
  return name + octave;
}

// MIDI number -> { key: "c#/4", accidental: "#"|null } for VexFlow.
export function midiToVexKey(midi) {
  const m = Math.round(midi);
  const name = NAMES_SHARP[((m % 12) + 12) % 12];
  const octave = Math.floor(m / 12) - 1;
  const letter = name[0].toLowerCase();
  const accidental = name.length > 1 ? '#' : null;
  return { key: `${letter}/${octave}`, accidental };
}
