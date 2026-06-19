// English strings.
export default {
  appTitle: 'AMT Stand',
  appSub: 'automatic music transcription simulation',
  lang: 'Language',
  mode: 'Input',
  mono: 'Mono',
  poly: 'Polyphony',
  runAll: '▶ Run pipeline',
  rerun: '↻ Recompute',
  play: '♪ Play',
  stop: '◼ Stop',
  pitchAlgo: 'F0 algorithm',
  prev: '← Back',
  next: 'Next →',
  stagesTitle: 'Pipeline stages',
  runFirst: 'Press “Run pipeline” to synthesize audio and execute every AMT stage.',
  selectedFrame: 'Selected frame',
  frameAt: 'time',
  downloadMidi: '⬇ Download .mid',
  groundTruthLabel: 'Ground truth',
  recovered: 'Recovered by system',

  stages: [
    {
      title: '1 · Ground-truth score',
      short: 'What we "played"',
      explain:
        'Every AMT simulation starts from a known note sequence — the <b>ground truth</b>. Each note is a MIDI pitch number, a start time and a duration. This is the melody we synthesize into audio next, and against which we compare what the system manages to recover at the end. In <b>Mono</b> mode one note plays at a time; in <b>Polyphony</b> — chords (several notes at once).',
    },
    {
      title: '2 · Additive synthesis → raw wave',
      short: 'Sound wave',
      explain:
        'A real note is not a pure sine but a sum of <b>harmonics</b>: the fundamental f₀ plus overtones at 2f₀, 3f₀, … with decaying amplitudes (here <span class="formula">aₖ ≈ 1/k</span>). An <b>ADSR</b> loudness envelope (Attack-Decay-Sustain-Release) shapes each note. Summing all notes + a little noise gives the <b>raw sound wave</b> in the time domain — exactly what the system "hears" and must turn back into notes.',
    },
    {
      title: '3 · Framing & windowing',
      short: 'Slice into frames',
      explain:
        'A sound\'s spectrum changes over time, so the signal is cut into short overlapping <b>frames</b> (step = <i>hop</i>). Each frame is multiplied by a <b>Hann window</b> to taper its edges and suppress spectral leakage. This prepares the data for the Fourier transform — a trade-off between time and frequency resolution.',
    },
    {
      title: '4 · STFT — spectrogram',
      short: 'Time–frequency',
      explain:
        'For every frame we compute a <b>Fast Fourier Transform (FFT)</b> → which frequencies are present. Stacking all frames\' spectra side by side yields the <b>spectrogram</b> (Short-Time Fourier Transform, STFT): horizontal = time, vertical = frequency, brightness = energy. The logarithmic (CQT-style) view spaces octaves evenly. <b>Click a column</b> to pick a frame to inspect.',
    },
    {
      title: '5 · Harmonic analysis',
      short: 'Finding harmonics',
      explain:
        'In the selected frame\'s spectrum we look for <b>peaks (partials)</b>. If they line up as an evenly spaced "comb" at frequencies k·f₀, they are the harmonics of one note and the lowest one is its <b>fundamental f₀</b>. This comb is exactly how the system infers a note\'s pitch. The red comb marks the ideal k·f₀ positions.',
    },
    {
      title: '6 · Onset detection',
      short: 'Note starts',
      explain:
        'To know <b>when</b> notes begin, we compute <b>spectral flux</b> — how sharply the spectrum changed between adjacent frames: <span class="formula">Σ max(0, |Xₜ| − |Xₜ₋₁|)</span>. Sudden energy increases = note attacks. Peaks above an adaptive threshold mark the <b>onsets</b>.',
    },
    {
      title: '7 · Pitch estimation (F0)',
      short: 'Which note',
      explain:
        'For each frame we estimate the <b>fundamental frequency f₀</b>. In Mono mode you can pick: <b>YIN</b> (time-domain difference function), <b>HPS</b> (Harmonic Product Spectrum — multiplying down-sampled copies of the spectrum) and <b>ACF</b> (autocorrelation). In Polyphony — a simplified <b>multi-F0</b>: iteratively find the strongest harmonic comb and subtract its harmonics. Below is a pitch-salience-over-time map.',
    },
    {
      title: '8 · Note tracking',
      short: 'Assembling events',
      explain:
        'Per-frame f₀ values are not yet notes. We round them to <b>MIDI numbers</b>, median-smooth them and group adjacent same-pitch frames (bounded by onsets) into <b>note events</b> with a start, an end and a pitch. This is the first truly "musical" result — a piano roll.',
    },
    {
      title: '9 · Quantization',
      short: 'Snap to grid',
      explain:
        'Measured times "float". <b>Quantization</b> snaps note starts and durations to a rhythmic <b>grid</b> (driven by the BPM tempo, 1/16 step) and frequencies to the nearest semitones. Raw measurements become a clean rhythmic structure suitable for notation.',
    },
    {
      title: '10 · MIDI generation',
      short: 'MIDI file',
      explain:
        'The quantized notes are written into a <b>Standard MIDI File (SMF)</b>: an MThd header, a tempo meta-event, then <b>Note On / Note Off</b> events with delta-time in ticks. Below are the file\'s real bytes (green = Note On, red = Note Off, pink = meta). The file downloads and opens in any sequencer.',
    },
    {
      title: '11 · Score',
      short: 'Notation',
      explain:
        'Finally the note events become a <b>score</b>: we name the notes, derive durations (whole/half/quarter/…), lay them out into measures (4/4) and draw the staff. This is the human-readable result of the whole AMT pipeline.',
    },
    {
      title: '12 · Transcription accuracy',
      short: 'Quality',
      explain:
        'Because we know the ground truth, we can <b>measure quality</b>. Each recovered note is matched to a ground-truth note (tolerance ±½ semitone and ±50 ms) and we compute <b>Precision / Recall / F1</b>. This makes it clear why polyphony is hard: overlapping harmonics confuse the multi-F0 estimator and the metrics drop.',
    },
  ],
};
