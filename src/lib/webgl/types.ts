export interface WebGLContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
}

export interface UniformLocations {
  projection: WebGLUniformLocation;
  view: WebGLUniformLocation;
  model: WebGLUniformLocation;
  color: WebGLUniformLocation;
  pointSize: WebGLUniformLocation;
  isPoints: WebGLUniformLocation;
  enable3D: WebGLUniformLocation;
}

export interface AttributeLocations {
  position: number;
}

export type RenderMode = 'points' | 'lines';
export type BlendMode = 'normal' | 'additive';

export interface CurveData {
  points: Float32Array;
  color: [number, number, number, number];
  pointSize: number;
  renderMode: RenderMode;
}
