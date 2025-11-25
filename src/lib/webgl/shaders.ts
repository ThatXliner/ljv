export const vertexShaderSource = `#version 300 es
in vec2 a_position;
uniform mat4 u_projection;
uniform float u_pointSize;

void main() {
  gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
  gl_PointSize = u_pointSize;
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
