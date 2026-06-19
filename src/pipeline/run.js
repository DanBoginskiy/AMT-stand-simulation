import { getGroundTruth, scoreDuration } from '../score/groundTruth.js';
import { synthesize } from '../synth/additive.js';
import { frameSignal } from '../dsp/framing.js';
import { computeSTFT } from '../dsp/stft.js';
import { detectOnsets } from '../dsp/onset.js';
import { estimatePitchMono } from '../dsp/pitchMono.js';
import { estimatePitchPoly } from '../dsp/pitchPoly.js';
import { trackNotes } from '../dsp/noteTracking.js';
import { quantize } from '../dsp/quantize.js';
import { exportMidi } from '../export/midiExport.js';
import { computeMetrics } from '../dsp/metrics.js';

// Runs the full classic-DSP AMT pipeline once and returns every intermediate
// product. Cached in state.pipeline; panels read from it for instant stepping.
export function runPipeline(state) {
  const p = state.params;
  const sr = p.sampleRate;

  // 1. Ground truth
  const score = getGroundTruth(state.mode, p.tempoBPM);
  const totalSec = scoreDuration(score);

  // 2. Synthesis -> raw wave
  const synth = synthesize(score, sr, totalSec);

  // 3. Framing + window
  const framing = frameSignal(synth.signal, p.frameSize, p.hop, sr);

  // 4. STFT / spectrogram
  const stft = computeSTFT(framing, sr);

  // 6. Onsets (needs STFT)
  const onset = detectOnsets(stft);

  // 7. Pitch estimation
  const pitch = state.mode === 'poly'
    ? estimatePitchPoly(framing, stft)
    : estimatePitchMono(framing, stft, state.pitchAlgo);

  // 8. Note tracking
  const tracked = trackNotes(pitch, onset, framing);

  // 9. Quantization
  const quant = quantize(tracked, p.tempoBPM);

  // 10. MIDI export
  const midi = exportMidi(quant, p.tempoBPM);

  // 12. Metrics vs ground truth
  const metrics = computeMetrics(quant.events, score.notes);

  return {
    score,
    synth,
    framing,
    stft,
    onset,
    pitch,
    tracked,
    quant,
    midi,
    metrics,
    sampleRate: sr,
    totalSec,
    params: { ...p },
    mode: state.mode,
  };
}
