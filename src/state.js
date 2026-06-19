// Central reactive store. All UI panels read from here; mutations go through
// setState() / patchParams() which notify subscribers.

export const state = {
  lang: 'ua', // 'ua' | 'en'
  mode: 'mono', // 'mono' | 'poly'
  pitchAlgo: 'yin', // 'yin' | 'hps' | 'acf'  (mono only)
  currentStage: 0, // index into STAGES
  selectedFrame: 0, // frame index the user inspects (stages 4/5/7)
  playhead: 0, // seconds
  isPlaying: false,
  pipeline: null, // cached pipeline output (see pipeline/run.js)
  params: {
    sampleRate: 22050,
    frameSize: 2048,
    hop: 512,
    tempoBPM: 120,
  },
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  for (const fn of listeners) fn(state);
}

export function setState(patch) {
  Object.assign(state, patch);
  emit();
}

// Invalidate the cached pipeline (e.g. after a mode/param change that requires
// a full recompute).
export function invalidatePipeline() {
  state.pipeline = null;
}
