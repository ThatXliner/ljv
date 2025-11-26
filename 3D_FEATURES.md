# 3D Lissajous Visualization Features

This document describes the 3D rendering capabilities added to LJV.

## Overview

LJV now supports full 3D Lissajous curve visualization with interactive camera controls. The Z-axis can be derived from audio data in multiple ways, creating stunning depth effects.

## Features

### 3D Rendering Modes

**Z-Axis Generation Modes:**

1. **Time Mode** (default): Creates a tunnel/spiral effect where older audio samples extend into depth
   - Produces a flowing, time-based visualization
   - Great for seeing the evolution of the audio waveform

2. **Frequency Mode**: Uses audio magnitude for depth dimension
   - Louder parts of the audio appear closer/further based on amplitude
   - Creates dynamic depth changes with the music

3. **Phase Mode**: Uses phase relationship between stereo channels
   - Leverages the angular relationship between L/R channels
   - Produces organic, phase-coherent depth effects

### Camera Controls

**Mouse:**
- **Left-click + drag**: Orbit camera around the scene
- **Right-click + drag** (or Shift + left-click): Pan camera
- **Mouse wheel**: Zoom in/out

**Keyboard:**
- **Arrow keys**: Rotate camera view
- **W/A/S/D**: Pan camera position
- **Q/E**: Zoom in/out
- **R**: Reset camera to default position

### UI Controls

**3D Settings Panel:**
- Enable/disable 3D rendering
- Select Z-axis generation mode
- Adjust Z-depth scale (0.1-3.0)

**Camera Panel:**
- Camera distance slider (0.5-20)
- Field of view adjustment (30°-120°)
- Reset camera button

## Technical Implementation

### Architecture

- **WebGL2 Rendering**: Hardware-accelerated 3D graphics
- **Perspective Projection**: True 3D perspective with configurable FOV
- **Depth Testing**: Proper Z-buffering for correct occlusion
- **Point Size Attenuation**: Points scale based on distance from camera

### Coordinate System

- **X-axis**: Left audio channel (as in 2D mode)
- **Y-axis**: Right audio channel (as in 2D mode)
- **Z-axis**: Generated from audio based on selected mode

### Camera System

Uses spherical coordinates for smooth orbit controls:
- **Azimuth**: Horizontal rotation around target
- **Elevation**: Vertical rotation (clamped to prevent gimbal lock)
- **Distance**: Radius from target point

View matrix computed using look-at transformation.

## Performance Notes

- 3D mode uses vec3 positions (3 floats per point) vs vec2 in 2D mode
- Depth testing adds minimal overhead
- Point size attenuation computed in vertex shader
- Maintains 60fps with default trail lengths (2048 points)

## Tips for Best Results

1. **Tunnel Effect**: Use Time mode with moderate Z-scale (1.0-1.5) for classic flowing visualization
2. **Dynamic Depth**: Use Frequency mode with music that has strong amplitude variations
3. **Organic Motion**: Use Phase mode with stereo tracks that have rich channel separation
4. **Camera Distance**: Start at 3.5 units for good overview, zoom in for detail
5. **Multi-band + 3D**: Enable multi-band mode for colorful 3D frequency separation

## Backward Compatibility

- 2D mode still fully supported (toggle "Enable 3D" off)
- All existing 2D parameters work identically
- Shaders support both 2D and 3D rendering paths
- Point buffers always use vec3, but Z=0 in 2D mode
