export type ZMode = 'time' | 'frequency' | 'phase' | 'parametric';

export function audioToLissajousPoints(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleCount: number,
  frequencyRatioX: number = 1.0,
  frequencyRatioY: number = 1.0,
  phase: number = 0,
  enable3D: boolean = false,
  zMode: ZMode = 'parametric',
  zScale: number = 1.0,
  frequencyRatioZ: number = 1.5,
  phaseZ: number = Math.PI / 2
): Float32Array {
  const pointCount = Math.min(sampleCount, leftChannel.length, rightChannel.length);
  const componentsPerPoint = enable3D ? 3 : 2;
  const points = new Float32Array(pointCount * componentsPerPoint);

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

    if (enable3D) {
      // Calculate Z coordinate based on mode
      let z = 0;

      switch (zMode) {
        case 'parametric':
          // True 3D parametric Lissajous curve
          // Uses sine waves on all three axes with independent frequencies
          const t = (i / pointCount) * Math.PI * 2;

          // Generate parametric coordinates
          const paramX = Math.sin(frequencyRatioX * t + phase);
          const paramY = Math.sin(frequencyRatioY * t);
          const paramZ = Math.sin(frequencyRatioZ * t + phaseZ);

          // Blend audio data with parametric curve
          // More parametric influence = more interesting 3D shapes
          x = x * 0.4 + paramX * 0.6;
          y = y * 0.4 + paramY * 0.6;
          z = paramZ * zScale;
          break;

        case 'time':
          // Time-based depth creates a spiral/tunnel effect
          // Older points are further away
          z = (i / pointCount - 0.5) * 2 * zScale;
          break;

        case 'frequency':
          // Use audio magnitude for depth
          const magnitude = Math.sqrt(x * x + y * y);
          z = magnitude * zScale;
          break;

        case 'phase':
          // Use phase relationship between channels for depth
          const phaseDiff = Math.atan2(y, x);
          z = Math.sin(phaseDiff) * zScale;
          break;
      }

      points[i * 3] = x;
      points[i * 3 + 1] = y;
      points[i * 3 + 2] = z;
    } else {
      // 2D mode - keep Z at 0
      points[i * 3] = x;
      points[i * 3 + 1] = y;
      points[i * 3 + 2] = 0;
    }
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
