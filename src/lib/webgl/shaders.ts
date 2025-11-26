export const vertexShaderSource = `#version 300 es
in vec3 a_position;
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
uniform float u_pointSize;
uniform bool u_enable3D;

void main() {
  vec4 position;

  if (u_enable3D) {
    // 3D rendering with camera matrices
    position = u_projection * u_view * u_model * vec4(a_position, 1.0);

    // Perspective point size attenuation (3x smaller base size for 3D)
    float distance = length((u_view * u_model * vec4(a_position, 1.0)).xyz);
    gl_PointSize = (u_pointSize / 3.0) * (10.0 / max(1.0, distance));
  } else {
    // 2D rendering (legacy mode) - use only X and Y
    position = u_projection * u_model * vec4(a_position.xy, 0.0, 1.0);
    gl_PointSize = u_pointSize;
  }

  gl_Position = position;
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec4 u_color;
uniform bool u_isPoints;
out vec4 outColor;

void main() {
  if (u_isPoints) {
    // Render points as circles instead of squares
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft edge for antialiasing
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    outColor = vec4(u_color.rgb, u_color.a * alpha);
  } else {
    // Render lines with full color
    outColor = u_color;
  }
}
`;
