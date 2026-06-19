// Web Audio playback of the synthesized signal, driving a playhead clock read
// from audioCtx.currentTime (never setInterval — avoids drift).

export function createPlayback({ onTick, onStop }) {
  let audioCtx = null;
  let source = null;
  let raf = 0;
  let startTime = 0;
  let duration = 0;

  function ensureCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function loop() {
    const elapsed = audioCtx.currentTime - startTime;
    if (elapsed >= duration) {
      stop();
      return;
    }
    onTick(elapsed);
    raf = requestAnimationFrame(loop);
  }

  function play(signal, sampleRate) {
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    const buffer = ctx.createBuffer(1, signal.length, sampleRate);
    buffer.copyToChannel(signal, 0);
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    duration = signal.length / sampleRate;
    startTime = ctx.currentTime;
    source.start();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (source) {
      try {
        source.stop();
      } catch (e) {
        /* already stopped */
      }
      source.disconnect();
      source = null;
    }
    onStop();
  }

  return { play, stop, isPlaying: () => raf !== 0 };
}
