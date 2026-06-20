// English strings.
export default {
  appTitle: 'AMT Stand',
  appSub: 'automatic music transcription simulation',
  lang: 'Language',
  mode: 'Input',
  mono: 'Mono',
  poly: 'Polyphony',
  runAll: '▶ Run pipeline',
  play: '♪ Play',
  stop: '◼ Stop',
  pitchAlgo: 'F0 algorithm',
  prev: '← Back',
  next: 'Next →',
  stagesTitle: 'Pipeline stages',
  runFirst: 'Press "Run pipeline" to synthesize audio and execute every AMT stage.',
  selectedFrame: 'Frame',
  frameAt: 'time',
  downloadMidi: '⬇ Download .mid',
  groundTruthLabel: 'Ground truth',
  recovered: 'Recovered by system',

  stages: [
    {
      title: '1 · Ground-truth score',
      short: 'What we "played"',
      explain:
        '<b>Frame level — Stage 1/3.</b> Every AMT simulation starts from a known note sequence — the <b>ground truth</b>. Each note is defined by a MIDI pitch number (0–127, where 60 = C4), a start time in seconds and a duration. This is the melody we synthesize into audio next, and against which we compare the system\'s output at the end.<br><br>In <b>Mono</b> mode one note plays at a time — a simpler case with no competing harmonics. In <b>Polyphony</b> several notes sound simultaneously (chords), which makes the problem much harder: harmonics of different notes overlap in the spectrum and interfere with each other. The piano roll below shows each note as a horizontal bar — height = MIDI pitch, width = duration.',
    },
    {
      title: '2 · Additive synthesis → raw wave',
      short: 'Sound wave',
      explain:
        '<b>Frame level — Stage 2/3.</b> A real note is not a pure sine but a sum of <b>harmonics</b>: the fundamental f₀ plus overtones at 2f₀, 3f₀, … with decaying amplitudes (<span class="formula">aₖ ≈ 1/k</span>). For example A4 (440 Hz) has overtones at 880, 1320, 1760 Hz etc.<br><br>An <b>ADSR</b> loudness envelope shapes each note: <i>Attack</i> (rise) → <i>Decay</i> (fall to sustain level) → <i>Sustain</i> (held level) → <i>Release</i> (fade after key release). Without ADSR the sound would start and end abruptly, like a rectangular pulse.<br><br>Summing all notes + a little white noise gives the <b>raw sound wave</b> in the time domain — exactly what the system "hears" and must turn back into notes. The lower chart shows each harmonic\'s individual contribution.',
    },
    {
      title: '3 · Framing & windowing',
      short: 'Slice into frames',
      explain:
        '<b>Frame level — Stage 3/3.</b> A sound\'s spectrum changes over time, so the signal is cut into short overlapping <b>frames</b>. The step between frames — the <i>hop</i> — is usually 25% of the frame length, so most of each frame overlaps the previous one.<br><br>Each frame is multiplied by a <b>Hann window</b> <span class="formula">w(n) = 0.5·(1 − cos(2πn/N))</span> to taper its edges smoothly. Without this, the abrupt frame boundary injects phantom frequencies into the spectrum (<i>spectral leakage</i>) that interfere with accurate pitch detection.<br><br>This is the fundamental trade-off: a <b>short frame</b> = good time resolution (accurate onsets) but poor frequency resolution; a <b>long frame</b> = the reverse. At 22050 Hz with frame size 2048, one frame ≈ 93 ms, hop 512 ≈ 23 ms.',
    },
    {
      title: '4 · STFT — spectrogram',
      short: 'Time–frequency',
      explain:
        '<b>Note level — Stage 1/3.</b> For every frame we compute a <b>Fast Fourier Transform (FFT)</b> — which frequencies are present and at what amplitude. The FFT converts N time-domain samples into N/2 complex frequency bins, each bin spanning Δf = sampleRate/N Hz.<br><br>Stacking all frames\' spectra side by side yields the <b>spectrogram</b> (STFT): horizontal = time, vertical = frequency, brightness = energy (logarithmic dB scale). The logarithmic (CQT-style) view spaces octaves evenly — just like piano keys.<br><br><b>Click a column</b> in the spectrogram to select that frame for detailed harmonic analysis in the next stage.',
    },
    {
      title: '5 · Harmonic analysis',
      short: 'Finding harmonics',
      explain:
        '<b>Note level — Stage 2/3.</b> In the selected frame\'s spectrum we search for <b>peaks (partials)</b> — local amplitude maxima. If they align as an evenly spaced "comb" at frequencies k·f₀ (k = 1, 2, 3, …), they are harmonics of one note, and the lowest peak is its <b>fundamental f₀</b>.<br><br>This comb is exactly how the system infers pitch. The difficulty in polyphony: combs of different notes overlap — the 2nd harmonic of C4 (522 Hz) coincides with the fundamental of C5 (523 Hz).<br><br>Use the slider below to switch between frames — the <b>−/+</b> buttons move by 1 frame, <b>−10/+10</b> by 10 frames.',
    },
    {
      title: '6 · Onset detection',
      short: 'Note starts',
      explain:
        '<b>Note level — Stage 3/3.</b> To know <b>when</b> notes begin we compute <b>spectral flux</b> — how sharply the spectrum changed between adjacent frames: <span class="formula">SF(t) = Σ max(0, |Xₜ(k)| − |Xₜ₋₁(k)|)</span>. We only take positive changes (half-wave rectification) because we care about new energy appearing, not disappearing.<br><br>Sudden increases = note attacks. To avoid reacting to background noise an <b>adaptive threshold</b> is used: moving average + constant. Peaks of SF above the threshold mark the <b>onsets</b>. Onset accuracy matters: a 1-frame error (~23 ms) can cause notes to be incorrectly merged or split.',
    },
    {
      title: '7 · Pitch estimation (F0)',
      short: 'Which note',
      explain:
        '<b>Stream level — Stage 1/3.</b> For each frame we estimate the <b>fundamental frequency f₀</b> — the note\'s pitch:<br><br>• <b>YIN</b> — computes a difference function <span class="formula">d(τ) = Σ(xₜ − xₜ₊τ)²</span> in the time domain and finds the first minimum; robust to noise.<br>• <b>HPS</b> (Harmonic Product Spectrum) — multiplies the spectrum with down-sampled copies (×½, ×⅓), boosting f₀ and suppressing overtones.<br>• <b>ACF</b> — autocorrelation; a peak at lag τ means the signal repeats every τ samples, so f₀ = sampleRate/τ.<br><br>In <b>Polyphony</b> an iterative <b>multi-F0</b> is used: find the strongest harmonic comb → record f₀ → subtract its harmonics → repeat. The salience map below shows the strength of each pitch hypothesis over time.',
    },
    {
      title: '8 · Note tracking',
      short: 'Assembling events',
      explain:
        '<b>Stream level — Stage 2/3.</b> Per-frame f₀ values are not yet notes — they are just a noisy sequence of numbers. The conversion process:<br><br>1. Round f₀ to the nearest <b>MIDI number</b> (12·log₂(f₀/440) + 69).<br>2. Apply a <b>median filter</b> over a 3–5 frame window to remove isolated outliers.<br>3. Between onsets find the <b>dominant pitch</b> (mode) — most frames in the segment.<br>4. If the segment is long and loud enough → form a <b>note event</b> (MIDI, startSec, endSec).<br><br>The piano roll shows recovered notes (solid) and ground truth (dashed) — you can already see where the system made mistakes.',
    },
    {
      title: '9 · Quantization',
      short: 'Snap to grid',
      explain:
        '<b>Stream level — Stage 3/3.</b> Measured times "float" due to inaccuracies in onset detection. <b>Quantization</b> snaps everything to a rhythmic grid:<br><br>1. From the BPM tempo we derive the beat duration and grid step (1/16 note = 1 beat / 4).<br>2. Each note\'s start is rounded to the nearest grid node: <span class="formula">onSteps = round(startSec / stepSec)</span>.<br>3. Duration is quantized similarly, with a minimum of 1 step.<br>4. Pitches are already rounded to semitones from the tracking stage.<br><br>The result: a clean rhythmic structure suitable for MIDI and notation. Compare the "before" and "after" piano rolls.',
    },
    {
      title: '10 · MIDI generation',
      short: 'MIDI file',
      explain:
        '<b>Notation level — Stage 1/3.</b> The quantized notes are written into a <b>Standard MIDI File (SMF type 0)</b> — a binary format understood by any sequencer or DAW.<br><br>Structure: <code>MThd</code> header (format, track count, PPQ = pulses per quarter note = 480) → <code>MTrk</code> track → tempo meta-event (microseconds per beat) → sequence of <b>Note On</b> (0x9n, MIDI pitch, velocity) and <b>Note Off</b> (0x8n) events with <b>delta-time</b> in ticks (time relative to the previous event).<br><br>Below are the file\'s raw bytes in hexadecimal. Green = Note On, red = Note Off, pink = headers/meta. The file downloads and opens in any sequencer.',
    },
    {
      title: '11 · Score',
      short: 'Notation',
      explain:
        '<b>Notation level — Stage 2/3.</b> Finally we convert the quantized notes into <b>staff notation</b> using the VexFlow library:<br><br>1. Derive the <b>note name</b> (C, D, E…) and <b>octave</b> from the MIDI number.<br>2. Convert the duration in grid steps to note values: 16 steps = whole, 8 = half, 4 = quarter, 2 = eighth, 1 = sixteenth.<br>3. Lay notes out into <b>measures</b> (4/4 = 16 steps), draw the staff, treble clef, bar lines.<br><br>This is the human-readable result of the entire pipeline. Notice the difference between Mono (simple melody) and Polyphony (chords, where multiple notes share a stem).',
    },
    {
      title: '12 · Transcription accuracy',
      short: 'Quality',
      explain:
        '<b>Notation level — Stage 3/3.</b> Because we know the ground truth, we can <b>measure quality</b> with standard metrics:<br><br>• <b>TP</b> (True Positive) — note correctly found (tolerance: ±½ semitone in pitch and ±50 ms in onset time).<br>• <b>FP</b> (False Positive) — system found a note that did not exist.<br>• <b>FN</b> (False Negative) — a real note was not found.<br>• <span class="formula">Precision = TP/(TP+FP)</span>, <span class="formula">Recall = TP/(TP+FN)</span>, <span class="formula">F1 = 2·P·R/(P+R)</span>.<br><br>In Mono F1 is typically > 0.9. In Polyphony it drops to 0.5–0.7: overlapping harmonics confuse the multi-F0 estimator, onsets merge, and the tracker assembles notes incorrectly. This is the core challenge of AMT.',
    },
  ],
};
