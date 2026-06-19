// Stage 10 — write a Standard MIDI File (format 0) by hand. Kept transparent so
// the exact bytes can be shown in the UI. Returns the bytes, a downloadable
// Blob URL, and tagged segments for the colored hex view.

const TICKS_PER_QUARTER = 480;
const TICKS_PER_16TH = TICKS_PER_QUARTER / 4; // 120

// Variable-length quantity encoding (MIDI delta-times).
function varLen(value) {
  const bytes = [value & 0x7f];
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

function str(s) {
  return [...s].map((c) => c.charCodeAt(0));
}

function u32(n) {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function u16(n) {
  return [(n >> 8) & 0xff, n & 0xff];
}

export function exportMidi(quant, bpm) {
  const events = quant.events;

  // Collect note-on/off at absolute ticks.
  const abs = [];
  for (const e of events) {
    const onTick = e.onSteps * TICKS_PER_16TH;
    const offTick = (e.onSteps + e.durSteps) * TICKS_PER_16TH;
    const vel = Math.max(1, Math.min(127, Math.round((e.confidence || 0.8) * 100 + 20)));
    abs.push({ tick: onTick, kind: 'on', midi: e.midi, vel });
    abs.push({ tick: offTick, kind: 'off', midi: e.midi, vel: 0 });
  }
  // Sort by tick; note-offs before note-ons at the same tick.
  abs.sort((a, b) => a.tick - b.tick || (a.kind === 'off' ? -1 : 1) - (b.kind === 'off' ? -1 : 1));

  // Build track bytes as tagged segments for the hex view.
  const segments = [];
  const push = (bytes, type) => segments.push({ bytes, type });

  // Tempo meta-event at delta 0.
  const usPerQuarter = Math.round(60000000 / bpm);
  push(varLen(0), 'delta');
  push([0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff], 'meta');

  let prevTick = 0;
  for (const ev of abs) {
    const delta = ev.tick - prevTick;
    prevTick = ev.tick;
    push(varLen(delta), 'delta');
    if (ev.kind === 'on') push([0x90, ev.midi & 0x7f, ev.vel & 0x7f], 'on');
    else push([0x80, ev.midi & 0x7f, 0x40], 'off');
  }
  // End of track.
  push(varLen(0), 'delta');
  push([0xff, 0x2f, 0x00], 'eot');

  // Flatten track body.
  const body = [];
  for (const s of segments) body.push(...s.bytes);

  // Assemble full file: MThd + MTrk.
  const header = [...str('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(TICKS_PER_QUARTER)];
  const track = [...str('MTrk'), ...u32(body.length), ...body];
  const all = [...header, ...track];
  const bytes = new Uint8Array(all);

  // Prepend header segments (for hex view).
  const headerSeg = [
    { bytes: str('MThd'), type: 'chunk' },
    { bytes: [...u32(6)], type: 'meta' },
    { bytes: [...u16(0), ...u16(1), ...u16(TICKS_PER_QUARTER)], type: 'meta' },
    { bytes: str('MTrk'), type: 'chunk' },
    { bytes: [...u32(body.length)], type: 'meta' },
  ];
  const allSegments = [...headerSeg, ...segments];

  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  return { bytes, blob, url, segments: allSegments, byteLength: bytes.length, noteCount: events.length };
}
