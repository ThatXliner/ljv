export function audioToLissajousPoints(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleCount: number,
  frequencyRatioX: number = 1.0,
  frequencyRatioY: number = 1.0,
  phase: number = 0
): Float32Array {
  const pointCount = Math.min(sampleCount, leftChannel.length, rightChannel.length);
  const points = new Float32Array(pointCount * 2);

  for (let i = 0; i < pointCount; i++) {
    let x = leftChannel[i];
    let y = rightChannel[i];

    // Apply frequency ratio and phase transformations
    if (frequencyRatioX !== 1.0 || frequencyRatioY !== 1.0 || phase !== 0) {
      const t = (i / pointCount) * Math.PI * 2;
      const transformedX = Math.sin(frequencyRatioX * t + phase) * 0.5;
      const transformedY = Math.sin(frequencyRatioY * t) * 0.5;

      // Blend original audio with transformation
      x = x * 0.7 + transformedX * 0.3;
      y = y * 0.7 + transformedY * 0.3;
    }

    points[i * 2] = x;
    points[i * 2 + 1] = y;
  }

  return points;
}

export function applyFrequencyRatio(
  x: number,
  y: number,
  ratioX: number,
  ratioY: number,
  phase: number,
  t: number
): [number, number] {
  const newX = Math.sin(ratioX * t + phase);
  const newY = Math.sin(ratioY * t);

  // Mix original position with transformed position
  return [x * 0.5 + newX * 0.5, y * 0.5 + newY * 0.5];
}
