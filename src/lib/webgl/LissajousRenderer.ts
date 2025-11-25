import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { createShader, createProgram, createBuffer, resizeCanvas, createOrthographicProjection } from './utils';
import type { UniformLocations, AttributeLocations, RenderMode, BlendMode, CurveData } from './types';

export class LissajousRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private positionBuffer: WebGLBuffer;

  private uniforms: UniformLocations;
  private attributes: AttributeLocations;

  // Rendering state
  private blendMode: BlendMode = 'additive';
  private curves: CurveData[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;

    // Compile shaders and create program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.program = createProgram(gl, vertexShader, fragmentShader);

    // Clean up shaders after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Get attribute and uniform locations
    this.attributes = {
      position: gl.getAttribLocation(this.program, 'a_position'),
    };

    this.uniforms = {
      projection: gl.getUniformLocation(this.program, 'u_projection')!,
      color: gl.getUniformLocation(this.program, 'u_color')!,
      pointSize: gl.getUniformLocation(this.program, 'u_pointSize')!,
    };

    // Create vertex array object
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO');
    }
    this.vao = vao;

    // Create position buffer
    this.positionBuffer = createBuffer(gl);

    // Setup VAO
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.attributes.position);
    gl.vertexAttribPointer(this.attributes.position, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Setup WebGL state
    gl.enable(gl.BLEND);
    this.setBlendMode(this.blendMode);

    // Initial resize
    this.resize();
  }

  updateCurves(curves: CurveData[]): void {
    this.curves = curves;
  }

  render(): void {
    const gl = this.gl;

    // Clear with slight trail effect
    gl.clearColor(0, 0, 0, 0.05);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set projection matrix (same for all curves)
    const projectionMatrix = createOrthographicProjection(gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix4fv(this.uniforms.projection, false, projectionMatrix);

    // Render all curves
    for (const curve of this.curves) {
      this.renderCurve(curve);
    }

    gl.bindVertexArray(null);
  }

  private renderCurve(curve: CurveData): void {
    const gl = this.gl;
    const pointCount = curve.points.length / 2;

    if (pointCount === 0) return;

    // Upload curve points to buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, curve.points, gl.DYNAMIC_DRAW);

    // Set curve-specific uniforms
    gl.uniform4f(
      this.uniforms.color,
      curve.color[0],
      curve.color[1],
      curve.color[2],
      curve.color[3]
    );
    gl.uniform1f(this.uniforms.pointSize, curve.pointSize);

    // Draw curve
    const mode = curve.renderMode === 'points' ? gl.POINTS : gl.LINE_STRIP;
    gl.drawArrays(mode, 0, pointCount);
  }

  setBlendMode(mode: BlendMode): void {
    this.blendMode = mode;
    const gl = this.gl;

    if (mode === 'additive') {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    } else {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  resize(): void {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    if (resizeCanvas(canvas)) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  destroy(): void {
    const gl = this.gl;

    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
