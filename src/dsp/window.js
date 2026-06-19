// Window functions. Hann is the workhorse; rectangular is kept for contrast.

export function hann(size) {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

export function rectangular(size) {
  return new Float32Array(size).fill(1);
}
