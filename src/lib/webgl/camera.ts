/**
 * 3D Camera utilities for Lissajous visualization
 * Provides perspective projection, view matrix, and camera controls
 */

export interface CameraState {
  // Spherical coordinates for orbit camera
  distance: number;
  azimuth: number;   // Horizontal rotation (radians)
  elevation: number; // Vertical rotation (radians)

  // Target point (what the camera looks at)
  targetX: number;
  targetY: number;
  targetZ: number;

  // Projection settings
  fov: number;       // Field of view in degrees
  near: number;      // Near clipping plane
  far: number;       // Far clipping plane
}

export function createDefaultCameraState(): CameraState {
  return {
    distance: 3.5,
    azimuth: 0,
    elevation: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: 60,
    near: 0.1,
    far: 100
  };
}

/**
 * Creates a perspective projection matrix
 */
export function createPerspectiveMatrix(
  fov: number,
  aspect: number,
  near: number,
  far: number
): Float32Array {
  const f = 1.0 / Math.tan((fov * Math.PI) / 360.0);
  const rangeInv = 1.0 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ]);
}

/**
 * Creates a view matrix from camera state
 */
export function createViewMatrix(camera: CameraState): Float32Array {
  // Convert spherical to Cartesian coordinates
  const x = camera.targetX + camera.distance * Math.cos(camera.elevation) * Math.sin(camera.azimuth);
  const y = camera.targetY + camera.distance * Math.sin(camera.elevation);
  const z = camera.targetZ + camera.distance * Math.cos(camera.elevation) * Math.cos(camera.azimuth);

  return lookAt(
    x, y, z,                                    // Camera position
    camera.targetX, camera.targetY, camera.targetZ,  // Target
    0, 1, 0                                     // Up vector
  );
}

/**
 * Creates a "look at" view matrix
 */
function lookAt(
  eyeX: number, eyeY: number, eyeZ: number,
  targetX: number, targetY: number, targetZ: number,
  upX: number, upY: number, upZ: number
): Float32Array {
  // Forward vector (from eye to target)
  let fX = targetX - eyeX;
  let fY = targetY - eyeY;
  let fZ = targetZ - eyeZ;

  // Normalize forward
  const fLen = Math.sqrt(fX * fX + fY * fY + fZ * fZ);
  fX /= fLen;
  fY /= fLen;
  fZ /= fLen;

  // Right vector (cross product: forward × up)
  let rX = fY * upZ - fZ * upY;
  let rY = fZ * upX - fX * upZ;
  let rZ = fX * upY - fY * upX;

  // Normalize right
  const rLen = Math.sqrt(rX * rX + rY * rY + rZ * rZ);
  rX /= rLen;
  rY /= rLen;
  rZ /= rLen;

  // Up vector (cross product: right × forward)
  const uX = rY * fZ - rZ * fY;
  const uY = rZ * fX - rX * fZ;
  const uZ = rX * fY - rY * fX;

  // Create view matrix (inverse of camera transform)
  return new Float32Array([
    rX, uX, -fX, 0,
    rY, uY, -fY, 0,
    rZ, uZ, -fZ, 0,
    -(rX * eyeX + rY * eyeY + rZ * eyeZ),
    -(uX * eyeX + uY * eyeY + uZ * eyeZ),
    fX * eyeX + fY * eyeY + fZ * eyeZ,
    1
  ]);
}

/**
 * Creates an identity matrix
 */
export function createIdentityMatrix(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

/**
 * Camera controller for handling mouse and keyboard input
 */
export class CameraController {
  private isDragging = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private rotationSpeed = 0.005;
  private panSpeed = 0.002;
  private zoomSpeed = 0.1;

  constructor(private updateCamera: (updater: (state: CameraState) => void) => void) {}

  handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      // Left button - orbit
      this.isDragging = true;
      this.isPanning = false;
    } else if (event.button === 2 || event.shiftKey) {
      // Right button or shift+left - pan
      this.isDragging = false;
      this.isPanning = true;
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging && !this.isPanning) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    if (this.isDragging) {
      // Orbit camera
      this.updateCamera((state) => {
        state.azimuth -= deltaX * this.rotationSpeed;
        state.elevation += deltaY * this.rotationSpeed;

        // Clamp elevation to prevent gimbal lock
        const maxElevation = Math.PI / 2 - 0.01;
        state.elevation = Math.max(-maxElevation, Math.min(maxElevation, state.elevation));
      });
    } else if (this.isPanning) {
      // Pan camera
      this.updateCamera((state) => {
        // Calculate right and up vectors for panning
        const right = Math.cos(state.azimuth);
        const forward = Math.sin(state.azimuth);

        state.targetX -= (deltaX * right - deltaY * forward * Math.cos(state.elevation)) * this.panSpeed * state.distance;
        state.targetY += deltaY * Math.sin(state.elevation) * this.panSpeed * state.distance;
        state.targetZ -= (deltaX * forward + deltaY * right * Math.cos(state.elevation)) * this.panSpeed * state.distance;
      });
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  handleMouseUp(): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  handleWheel(event: WheelEvent): void {
    event.preventDefault();

    this.updateCamera((state) => {
      state.distance *= 1 + (event.deltaY * this.zoomSpeed * 0.01);
      state.distance = Math.max(0.5, Math.min(20, state.distance));
    });
  }

  handleKeyDown(event: KeyboardEvent): void {
    const step = 0.1;
    const zoomStep = 0.2;

    switch (event.key) {
      case 'ArrowLeft':
        this.updateCamera((state) => { state.azimuth -= step; });
        break;
      case 'ArrowRight':
        this.updateCamera((state) => { state.azimuth += step; });
        break;
      case 'ArrowUp':
        this.updateCamera((state) => {
          state.elevation = Math.min(Math.PI / 2 - 0.01, state.elevation + step);
        });
        break;
      case 'ArrowDown':
        this.updateCamera((state) => {
          state.elevation = Math.max(-Math.PI / 2 + 0.01, state.elevation - step);
        });
        break;
      case 'w':
      case 'W':
        this.updateCamera((state) => {
          const forward = Math.sin(state.azimuth);
          const right = Math.cos(state.azimuth);
          state.targetZ -= forward * step;
          state.targetX -= right * step;
        });
        break;
      case 's':
      case 'S':
        this.updateCamera((state) => {
          const forward = Math.sin(state.azimuth);
          const right = Math.cos(state.azimuth);
          state.targetZ += forward * step;
          state.targetX += right * step;
        });
        break;
      case 'a':
      case 'A':
        this.updateCamera((state) => {
          const right = Math.cos(state.azimuth);
          const forward = Math.sin(state.azimuth);
          state.targetX -= right * step;
          state.targetZ -= forward * step;
        });
        break;
      case 'd':
      case 'D':
        this.updateCamera((state) => {
          const right = Math.cos(state.azimuth);
          const forward = Math.sin(state.azimuth);
          state.targetX += right * step;
          state.targetZ += forward * step;
        });
        break;
      case 'q':
      case 'Q':
        this.updateCamera((state) => {
          state.distance = Math.max(0.5, state.distance - zoomStep);
        });
        break;
      case 'e':
      case 'E':
        this.updateCamera((state) => {
          state.distance = Math.min(20, state.distance + zoomStep);
        });
        break;
      case 'r':
      case 'R':
        // Reset camera
        this.updateCamera((state) => {
          Object.assign(state, createDefaultCameraState());
        });
        break;
    }
  }
}
