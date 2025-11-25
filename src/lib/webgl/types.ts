export interface WebGLContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
}

export interface UniformLocations {
  projection: WebGLUniformLocation;
  color: WebGLUniformLocation;
  pointSize: WebGLUniformLocation;
}

export interface AttributeLocations {
  position: number;
}

export type RenderMode = 'points' | 'lines';
export type BlendMode = 'normal' | 'additive';

export interface CurveData {
  points: Float32Array;
  color: [number, number, number, number];
  pointSize?: number;
  renderMode?: RenderMode;
}
