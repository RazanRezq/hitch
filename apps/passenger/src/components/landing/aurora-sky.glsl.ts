/**
 * GLSL sources + GPU data helpers for the hero aurora sky.
 *
 * Split out of the component so the shaders stay readable on their own and
 * the React shell stays close to the size guideline. WebGL1 / GLSL ES 1.00
 * on purpose — value noise is computed in-shader so there are no texture or
 * extension dependencies, which maximises device reach (older mobile GPUs).
 */

export const AURORA_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const AURORA_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uReveal;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  // Night-sky base — matches the existing CSS radial-gradient palette so the
  // seam into the page content below the hero is unchanged.
  vec2 gp = vec2((uv.x - 0.5) * aspect, uv.y - 1.1);
  float r = length(gp) * 0.9;
  vec3 c0 = vec3(0.063, 0.125, 0.314); // #102050
  vec3 c1 = vec3(0.039, 0.078, 0.220); // #0a1438
  vec3 c2 = vec3(0.024, 0.051, 0.157); // #060d28
  vec3 c3 = vec3(0.008, 0.016, 0.102); // #02041a
  vec3 sky = mix(c0, c1, smoothstep(0.0, 0.35, r));
  sky = mix(sky, c2, smoothstep(0.35, 0.65, r));
  sky = mix(sky, c3, smoothstep(0.65, 1.0, r));

  // Aurora curtain: low-freq body modulated by high-freq filaments.
  float t = uTime * 0.06;
  vec2 ap = vec2(uv.x * aspect, uv.y);
  float curtain = fbm(vec2(ap.x * 2.2 + t, ap.y * 1.3 - t * 0.4));
  float filaments = fbm(vec2(ap.x * 7.0 - t * 1.5, ap.y * 2.0));
  float bands = pow(curtain, 1.6) * (0.6 + 0.4 * filaments);

  // Sit it in the upper-mid band, dissolve before the booking strip.
  float vfall = smoothstep(0.05, 0.45, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y));
  float rays = 0.85 + 0.15 * sin(uv.x * 40.0 + curtain * 6.2831 + uTime * 0.8);
  float a = bands * vfall * rays;

  vec3 tealCol = vec3(0.10, 0.92, 0.72);
  vec3 greenCol = vec3(0.22, 1.00, 0.48);
  vec3 violetCol = vec3(0.46, 0.32, 0.92);
  vec3 magCol = vec3(0.78, 0.30, 0.70);
  vec3 aur = mix(greenCol, tealCol, smoothstep(0.2, 0.7, curtain));
  aur = mix(aur, violetCol, smoothstep(0.45, 0.9, uv.y));
  aur = mix(aur, magCol, smoothstep(0.75, 1.0, filaments) * 0.5);

  float intensity = a * 1.5 * uReveal;
  vec3 col = sky + aur * intensity;

  // Gentle vignette so the foreground text/search card sits forward.
  float vig = 1.0 - 0.25 * smoothstep(0.6, 1.4, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const STAR_VERT = `
precision highp float;
attribute vec2 aPos;
attribute float aSize;
attribute float aDepth;
attribute float aPhase;
attribute float aSpeed;
attribute float aBright;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScroll;
uniform float uDpr;
uniform float uReveal;
varying float vTw;
varying float vBright;
void main() {
  vec2 p = aPos;
  p += uPointer * (aDepth * 0.04);   // nearer stars parallax more
  p.y += uScroll * (aDepth * 0.25);  // gentle drift as the hero scrolls
  gl_Position = vec4(p, 0.0, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
  vTw = tw;
  vBright = aBright;
  gl_PointSize = aSize * uDpr * (0.4 + 0.6 * uReveal) * (0.85 + 0.3 * tw);
}
`;

export const STAR_FRAG = `
precision highp float;
varying float vTw;
varying float vBright;
uniform float uReveal;
void main() {
  // -1..1 sprite space
  vec2 c = (gl_PointCoord - 0.5) * 2.0;
  float d = length(c);
  if (d > 1.0) discard;

  // Tight luminous core + faint surrounding glow.
  float core = pow(max(0.0, 1.0 - d), 7.0);
  float glow = exp(-d * d * 5.0) * 0.30;

  // 4-point diffraction spikes — only meaningful on the bright stars,
  // and they breathe with the twinkle so they sparkle rather than sit.
  vec2 a = abs(c);
  float sx = max(0.0, 1.0 - a.x) * (1.0 - smoothstep(0.0, 0.085, a.y));
  float sy = max(0.0, 1.0 - a.y) * (1.0 - smoothstep(0.0, 0.085, a.x));
  float spikes = (sx + sy) * vBright * (0.35 + 0.65 * vTw) * 0.5;

  float intensity = (core + glow + spikes) * vTw * uReveal;

  // Cool white for faint field stars, warmer for the bright ones.
  vec3 tint = mix(vec3(0.80, 0.87, 1.0), vec3(1.0, 0.93, 0.82), vBright);
  gl_FragColor = vec4(tint, clamp(intensity, 0.0, 1.0));
}
`;

const FLOATS_PER_STAR = 7; // pos.xy, size, depth, phase, speed, bright

export interface StarBuffer {
  data: Float32Array;
  count: number;
  stride: number; // bytes between consecutive stars
}

export function createStarData(count: number): StarBuffer {
  const data = new Float32Array(count * FLOATS_PER_STAR);
  for (let i = 0; i < count; i++) {
    const o = i * FLOATS_PER_STAR;
    const depth = Math.random();
    const bright = Math.random() < 0.1 ? 1 : 0;
    data[o + 0] = Math.random() * 2 - 1; // x in clip space
    data[o + 1] = Math.random() * 2 - 1; // y in clip space
    data[o + 2] = bright ? 5.0 + depth * 4.0 : 0.9 + depth * 1.7; // base size (px)
    data[o + 3] = depth;
    data[o + 4] = Math.random() * Math.PI * 2; // twinkle phase
    data[o + 5] = 0.6 + Math.random() * 1.8; // twinkle speed
    data[o + 6] = bright;
  }
  return { data, count, stride: FLOATS_PER_STAR * 4 };
}

export interface ProgramResult {
  program: WebGLProgram | null;
  error: string | null;
}

export function compileProgram(
  gl: WebGLRenderingContext,
  label: string,
  vsSrc: string,
  fsSrc: string,
): ProgramResult {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) {
    return { program: null, error: `${label}: createShader/Program null (context lost?)` };
  }
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    return { program: null, error: `${label} VS: ${gl.getShaderInfoLog(vs) ?? '?'}` };
  }
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    return { program: null, error: `${label} FS: ${gl.getShaderInfoLog(fs) ?? '?'}` };
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const error = `${label} LINK: ${gl.getProgramInfoLog(prog) ?? '?'}`;
    gl.deleteProgram(prog);
    return { program: null, error };
  }
  return { program: prog, error: null };
}
