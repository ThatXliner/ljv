import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { createShader, createProgram, createBuffer, resizeCanvas, createOrthographicProjection } from './utils';
import type { UniformLocations, AttributeLocations, RenderMode, BlendMode } from './types';

export class LissajousRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private positionBuffer: WebGLBuffer;

  private uniforms: UniformLocations;
  private attributes: AttributeLocations;

  // Rendering state
  private color: [number, number, number, number] = [0.2, 0.8, 1.0, 1.0];
  private pointSize: number = 3.0;
  private renderMode: RenderMode = 'points';
  private blendMode: BlendMode = 'additive';
  private pointCount: number = 0;

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

  updatePoints(points: Float32Array): void {
    const gl = this.gl;
    this.pointCount = points.length / 2;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);
  }

  render(): void {
    const gl = this.gl;

    // Clear with slight trail effect
    gl.clearColor(0, 0, 0, 0.05);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.pointCount === 0) return;

    // Use program and VAO
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set uniforms
    const projectionMatrix = createOrthographicProjection(gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix4fv(this.uniforms.projection, false, projectionMatrix);
    gl.uniform4f(this.uniforms.color, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(this.uniforms.pointSize, this.pointSize);

    // Draw
    const mode = this.renderMode === 'points' ? gl.POINTS : gl.LINE_STRIP;
    gl.drawArrays(mode, 0, this.pointCount);

    gl.bindVertexArray(null);
  }

  setColor(r: number, g: number, b: number, a: number): void {
    this.color = [r, g, b, a];
  }

  setPointSize(size: number): void {
    this.pointSize = size;
  }

  setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
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
