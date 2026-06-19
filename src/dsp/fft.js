// Hand-rolled iterative radix-2 Cooley–Tukey FFT (in place). Kept transparent
// on purpose: every value is plain JS, nothing hidden in a native/WASM blob.
// Requires the length to be a power of two.

export function fftInPlace(re, im) {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }

  // Danielson–Lanczos butterflies.
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlr = Math.cos(ang);
    const wli = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const nwr = wr * wlr - wi * wli;
        wi = wr * wli + wi * wlr;
        wr = nwr;
      }
    }
  }
}

// Magnitude spectrum of a real frame. Returns Float32Array of length n/2 + 1
// (bins 0..Nyquist).
export function magnitudeSpectrum(frame) {
  const n = frame.length;
  const re = Float32Array.from(frame);
  const im = new Float32Array(n);
  fftInPlace(re, im);
  const half = n >> 1;
  const mag = new Float32Array(half + 1);
  for (let i = 0; i <= half; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

export function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
