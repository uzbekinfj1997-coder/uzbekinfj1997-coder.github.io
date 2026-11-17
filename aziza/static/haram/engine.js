/* Al-Haram Walk: the WebGL renderer. Static geometry is grouped by material, each with its own photo texture. Sunlight
   casts real shadows from a shadow map baked once per time of day; marble floors reflect the sky. Pilgrims are drawn
   with instancing, so thousands stay cheap, and their walk is animated in the vertex shader. */
"use strict";
const HaramGL = (() => {
  // vertex layout: position 3, normal 3, colour 3, uv 2, glow 1
  const STRIDE = 12;

  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute vec2 aUV; attribute float aGlow;
uniform mat4 uVP;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec2 vUV; varying float vGlow;
void main() { vPos = aPos; vNor = aNor; vCol = aCol; vUV = aUV; vGlow = aGlow; gl_Position = uVP * vec4(aPos, 1.0); }`;

  const LIGHT = `
uniform vec3 uCam; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSkyAmb; uniform vec3 uGroundAmb; uniform vec3 uFog; uniform float uFogD;
uniform float uNight; uniform mat4 uSunVP; uniform sampler2D uShadow; uniform float uShadowOn; uniform float uTexel;
float unpack(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
float shadowAt(vec3 p, float n) {
  if (uShadowOn < 0.5 || n <= 0.0) return n > 0.0 ? 1.0 : 0.0;
  vec4 q = uSunVP * vec4(p, 1.0); vec3 s = q.xyz * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) return 1.0;
  float bias = 0.0011 + 0.0012 * (1.0 - n), sum = 0.0;
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++)      // a soft edge rather than stair steps
    sum += step(s.z - bias, unpack(texture2D(uShadow, s.xy + vec2(float(i), float(j)) * uTexel * 0.9)));
  return sum * 0.04;
}
// the floodlit Haram at night: warm light that falls off away from the mosque
vec3 floodlight(vec3 p) {
  float d = length(p.xz);
  return uNight * vec3(1.0, 0.86, 0.68) * (0.55 * smoothstep(620.0, 80.0, d) + 0.05);
}
vec3 toneMap(vec3 c) { c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14); return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }`;

  const FS = `
precision highp float;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec2 vUV; varying float vGlow;
uniform sampler2D uTex; uniform float uGloss; uniform vec3 uSkyTop; uniform vec2 uWin;
${LIGHT}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vNor);
  vec3 tex = texture2D(uTex, vUV).rgb;
  vec3 alb = pow(tex * vCol, vec3(2.2));
  float nl = dot(n, uSunDir);
  float sh = shadowAt(vPos + n * 0.12, nl);
  vec3 amb = mix(uGroundAmb, uSkyAmb, 0.5 + 0.5 * n.y);
  vec3 col = alb * (amb + uSunCol * max(nl, 0.0) * sh + floodlight(vPos) * (vGlow > 1.5 ? 0.2 : 1.0));   // the floodlights are on the mosque, not the towers
  vec3 V = normalize(uCam - vPos);
  if (uGloss > 0.0) {            // polished marble: reflects the sky and the sun at a low angle
    float f = 0.04 + 0.5 * pow(1.0 - max(dot(n, V), 0.0), 4.0);
    vec3 R = reflect(-V, n);
    vec3 sky = mix(uFog, uSkyTop, clamp(R.y * 1.6, 0.0, 1.0));
    float spec = pow(max(dot(R, uSunDir), 0.0), 90.0) * sh;
    col = mix(col, pow(sky, vec3(2.2)) + floodlight(vPos) * 0.3, f * uGloss) + uSunCol * spec * 0.5 * uGloss;
  }
  if (vGlow > 1.5) {             // at night the windows light up, room by room: the dark or blue-green parts of the photo, not the stone
    vec2 g = floor(vUV * uWin); float lit = step(0.6, hash(g + floor(vPos.xz / 40.0)));
    float win = max(1.0 - smoothstep(0.16, 0.38, dot(tex.rgb, vec3(0.3, 0.59, 0.11))), smoothstep(0.0, 0.1, tex.b - tex.r));
    col += vec3(1.0, 0.72, 0.42) * 0.3 * uNight * lit * win;
  } else if (vGlow > 0.0) col += pow(vCol * tex, vec3(2.2)) * vGlow * (1.0 + 1.5 * uNight);
  float d = length(uCam - vPos);
  float fog = 1.0 - exp(-uFogD * d);
  gl_FragColor = vec4(mix(toneMap(col), uFog, clamp(fog, 0.0, 1.0)), 1.0);
}`;

  // a person: legs and arms swing in the vertex shader (aPart: 1 left leg, -1 right leg, 2 left arm, -2 right arm, 0 still)
  const P_VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute float aPart; attribute float aTone;
attribute vec3 iPos; attribute float iYaw; attribute vec3 iCol; attribute float iPhase; attribute float iScale; attribute float iMove;
uniform mat4 uVP; uniform float uTime;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec3 vL; varying vec3 vSkin; varying vec3 vInfo;
void main() {
  vec3 p = aPos * iScale, nr = aNor;
  float swing = sin(uTime * 6.2 * iMove + iPhase) * iMove;
  if (aPart != 0.0) {
    float s = sign(aPart), pivot = abs(aPart) < 1.5 ? 0.9 : 1.38;
    p.z += s * swing * (abs(aPart) < 1.5 ? 0.24 : -0.14) * (pivot * iScale - p.y) / max(0.01, pivot * iScale);
  } else p.z += swing * 0.035 * max(0.0, 0.9 - aPos.y) * iScale;   // the cloth moves a little with the step
  float c = cos(iYaw), sn = sin(iYaw);
  vec3 w = vec3(p.x * c + p.z * sn, p.y + abs(swing) * 0.02, -p.x * sn + p.z * c) + iPos;
  nr = vec3(nr.x * c + nr.z * sn, nr.y, -nr.x * sn + nr.z * c);
  vPos = w; vNor = nr;
  // the brightest white is ihram for most who wear it: right shoulder and head bare. Everyone else is covered, the head included
  vSkin = vec3(0.6, 0.45, 0.35) * (0.72 + 0.56 * fract(iPhase * 7.3));
  vCol = iCol; vL = aPos; vInfo = vec3(aTone, step(0.915, min(iCol.r, iCol.g)) * step(fract(iPhase * 3.7), 0.8), fract(iPhase * 5.1));
  gl_Position = uVP * vec4(w, 1.0);
}`;
  const P_FS = `
precision highp float;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec3 vL; varying vec3 vSkin; varying vec3 vInfo;
${LIGHT}
void main() {
  // what this point is wearing: t is the part of the body, and in ihram the right shoulder and the head are bare
  float t = vInfo.x, ih = vInfo.y, bare = 0.0;
  vec3 over = vSkin;
  if (t > 0.5 && t < 1.5) bare = 1.0;                                                        // hands, shins, feet
  else if (t < 2.5 && t > 1.5) bare = ih * step(1.3 - 0.22 * normalize(vL.xz).x, vL.y);      // the chest, above the diagonal of the cloth
  else if (t < 3.5 && t > 2.5) bare = ih;                                                    // the right arm and the neck
  else if (t < 4.5 && t > 3.5) {                                                             // the head: the face, then hair or a covering
    vec2 f = vec2(vL.x / 0.064, (vL.y - 1.585) / 0.082);
    bare = step(vL.z, 0.0) * step(dot(f, f), 1.0);
    if (ih > 0.5) {                                                                          // uncovered: a hairline, or a shaved head after the rite
      float line = mix(1.66, 1.57, smoothstep(-0.03, 0.05, vL.z));
      bare = 1.0;
      if (vL.y > line && vInfo.z > 0.22) over = vInfo.z < 0.3 ? vec3(0.4, 0.4, 0.4) : vec3(0.05, 0.04, 0.04);
    }
    if (bare > 0.5 && vL.z < 0.0) {
      vec2 e = vec2((abs(vL.x) - 0.03) / 0.011, (vL.y - 1.612) / 0.005);
      over = mix(over, vec3(0.05, 0.04, 0.04), step(dot(e, e), 1.0));                         // eyes
      if (ih > 0.5 && vInfo.z > 0.6 && vL.y < 1.538 && dot(f, f) < 1.0) over = vec3(0.1, 0.08, 0.07);   // a short beard, for some men
    }
  }
  else if (t > 4.5) bare = ih * step(vL.y, 1.1);                                             // the left arm, under the cloth to the elbow
  vec3 n = normalize(vNor), alb = pow(mix(vCol, over, bare), vec3(2.2));
  alb *= 1.0 - 0.2 * (1.0 - bare) * (0.5 + 0.5 * sin(atan(vL.z, vL.x) * 11.0 + vL.y * 2.0 + sin(vL.y * 9.0)));     // folds in the cloth
  float nl = dot(n, uSunDir);
  vec3 col = alb * (mix(uGroundAmb, uSkyAmb, 0.5 + 0.5 * n.y) + uSunCol * max(nl, 0.0) * shadowAt(vPos + vec3(0.0, 0.2, 0.0), max(nl, 0.05)) + floodlight(vPos));
  float fog = 1.0 - exp(-uFogD * length(uCam - vPos));
  gl_FragColor = vec4(mix(toneMap(col), uFog, clamp(fog, 0.0, 1.0)), 1.0);
}`;
  const BLOB_VS = `
attribute vec3 aPos; attribute vec3 iPos; attribute float iScale;
uniform mat4 uVP; uniform vec2 uSunOff; varying vec2 vQ;
void main() { vQ = aPos.xz; vec3 w = vec3(aPos.x * 0.42 * iScale, 0.03, aPos.z * 0.42 * iScale) + iPos; w.xz += uSunOff * iScale * (aPos.x * uSunOff.x + aPos.z * uSunOff.y + 1.0) * 0.5; gl_Position = uVP * vec4(w, 1.0); }`;
  const BLOB_FS = `precision mediump float; varying vec2 vQ; uniform float uA; void main() { float d = dot(vQ, vQ); if (d > 1.0) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, uA * (1.0 - d)); }`;

  const SKY_VS = `attribute vec2 aXY; varying vec2 vXY; void main() { vXY = aXY; gl_Position = vec4(aXY, 0.9999, 1.0); }`;
  const SKY_FS = `
precision highp float;
varying vec2 vXY; uniform mat4 uInv; uniform vec3 uCam; uniform vec3 uSunDir; uniform vec3 uHor; uniform vec3 uTop; uniform vec3 uSunGlow; uniform float uNight;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
void main() {
  vec4 q = uInv * vec4(vXY, 1.0, 1.0); vec3 d = normalize(q.xyz / q.w - uCam);
  float h = max(d.y, 0.0);
  vec3 c = mix(uHor, uTop, pow(h, 0.55));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSunGlow * (pow(s, 6.0) * 0.18 + pow(s, 90.0) * 0.5);
  if (s > 0.9996) c = mix(c, vec3(1.0, 0.97, 0.9), 0.95);
  if (uNight > 0.5 && d.y > 0.02) { vec3 g = floor(d * 520.0); float st = step(0.9992, hash(g)); c += vec3(0.5) * st * smoothstep(0.1, 0.5, d.y); }
  gl_FragColor = vec4(c, 1.0);
}`;
  const DEPTH_VS = `attribute vec3 aPos; uniform mat4 uVP; varying float vZ; void main() { vec4 p = uVP * vec4(aPos, 1.0); vZ = p.z * 0.5 + 0.5; gl_Position = p; }`;
  const DEPTH_FS = `
precision highp float; varying float vZ;
void main() { vec4 e = fract(vZ * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); gl_FragColor = e; }`;

  function compile(gl, vs, fs) {
    const make = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, a = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const name = gl.getActiveAttrib(p, i).name; a[name] = gl.getAttribLocation(p, name); }
    return { p, u, a };
  }

  // ---------- small maths ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function ortho(l, r, b, t, n, f) { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; }
  function lookAt(eye, at, up) {
    const z = norm(sub(eye, at)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  }
  function lookDir(eye, yaw, pitch) {
    const cp = Math.cos(pitch), f = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
    return lookAt(eye, [eye[0] + f[0], eye[1] + f[1], eye[2] + f[2]], [0, 1, 0]);
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
    return o;
  }
  const { invert } = WalkShell;

  // ---------- a mesh builder ----------
  function Mesh() { this.v = []; }
  Mesh.prototype.vert = function (p, n, c, uv, glow) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], uv[0], uv[1], glow); };
  Mesh.prototype.tri = function (a, b, c, n, col, ua, ub, uc, glow = 0) { this.vert(a, n, col, ua, glow); this.vert(b, n, col, ub, glow); this.vert(c, n, col, uc, glow); };
  // counter-clockwise seen from the outside
  Mesh.prototype.quad = function (a, b, c, d, col, uv = null, glow = 0) {
    const n = norm(cross(sub(b, a), sub(d, a)));
    const [ua, ub, uc, ud] = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    this.tri(a, b, c, n, col, ua, ub, uc, glow); this.tri(a, c, d, n, col, ua, uc, ud, glow);
  };
  // a box: centre, half sizes, yaw
  Mesh.prototype.box = function (cx, cy, cz, hx, hy, hz, col, yaw = 0, glow = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    const u = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]], W = 2 * hx / 4, H = 2 * hy / 4, D = 2 * hz / 4;
    this.quad(v[4], v[5], v[6], v[7], col, u(W, H), glow); this.quad(v[1], v[0], v[3], v[2], col, u(W, H), glow);
    this.quad(v[5], v[1], v[2], v[6], col, u(D, H), glow); this.quad(v[0], v[4], v[7], v[3], col, u(D, H), glow);
    this.quad(v[7], v[6], v[2], v[3], col, u(W, D), glow); this.quad(v[0], v[1], v[5], v[4], col, u(W, D), glow);
  };
  // a round shaft or cone around a vertical axis
  Mesh.prototype.cyl = function (cx, y0, cz, r0, y1, r1, col, seg = 12, glow = 0, uvH = 1) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      this.quad(p(a1, r0, y0), p(a0, r0, y0), p(a0, r1, y1), p(a1, r1, y1), col, [[(i + 1) / seg, 0], [i / seg, 0], [i / seg, uvH], [(i + 1) / seg, uvH]], glow);
    }
  };
  // a dome: half sphere made of rings
  Mesh.prototype.dome = function (cx, y0, cz, r, h, col, seg = 12, rings = 5, glow = 0) {
    for (let k = 0; k < rings; k++) {
      const t0 = (k / rings) * Math.PI / 2, t1 = ((k + 1) / rings) * Math.PI / 2;
      const r0 = Math.cos(t0) * r, r1 = Math.cos(t1) * r, y2 = y0 + Math.sin(t0) * h, y3 = y0 + Math.sin(t1) * h;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const p = (a, q, y) => [cx + Math.cos(a) * q, y, cz + Math.sin(a) * q];
        const up = (a, tm) => [Math.cos(a) * Math.cos(tm), Math.sin(tm), Math.sin(a) * Math.cos(tm)];
        const A = p(a1, r0, y2), B = p(a0, r0, y2), C = p(a0, r1, y3), D = p(a1, r1, y3), n = up((a0 + a1) / 2, (t0 + t1) / 2);
        this.tri(A, B, C, n, col, [0, 0], [1, 0], [1, 1], glow); this.tri(A, C, D, n, col, [0, 0], [1, 1], [0, 1], glow);
      }
    }
  };

  // the person shape: a white wrap, a shoulder band, a head and limbs
  function personMesh(far = false) {
    const v = [], add = (p, n, part, tone) => v.push(p[0], p[1], p[2], n[0], n[1], n[2], part, tone);
    // a chain of rings [height, half width, half depth, x, z]; tone says which body part it is, for the shader to dress it (P_FS).
    // Forward is -z, and the person's right is +x.
    const tube = (rings, part, tone, seg = 10) => {
      const size = (r) => (r[1] + r[2]) / 2;
      const P = (r, a) => [(r[3] || 0) + Math.cos(a) * r[1], r[0], (r[4] || 0) + Math.sin(a) * r[2]];
      const N = (k, a) => {
        const up = rings[Math.min(k + 1, rings.length - 1)], dn = rings[Math.max(k - 1, 0)], r = rings[k];
        const nx = Math.cos(a) * r[2], nz = Math.sin(a) * r[1], l = Math.hypot(nx, nz) || 1, ny = Math.max(-1.6, Math.min(1.6, (size(dn) - size(up)) / Math.max(0.01, up[0] - dn[0])));
        const m = Math.hypot(1, ny); return [nx / l / m, ny / m, nz / l / m];
      };
      for (let k = 1; k < rings.length; k++) for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * 2 * Math.PI, a1 = ((i + 1) / seg) * 2 * Math.PI, lo = rings[k - 1], hi = rings[k];
        const put = (r, kk, a) => add(P(r, a), N(kk, a), part, tone);
        put(lo, k - 1, a1); put(lo, k - 1, a0); put(hi, k, a0); put(lo, k - 1, a1); put(hi, k, a0); put(hi, k, a1);
      }
    };
    if (far) {      // in the distance: the same outline, a quarter of the triangles
      tube([[0.16, 0.2, 0.16], [0.92, 0.17, 0.125], [1.28, 0.168, 0.115], [1.37, 0.16, 0.1], [1.43, 0.08, 0.07]], 0, 2, 6);
      tube([[1.46, 0.05, 0.05], [1.53, 0.075, 0.085], [1.65, 0.082, 0.096], [1.72, 0.03, 0.035]], 0, 4, 6);
      tube([[1.37, 0.05, 0.052, 0.185], [0.72, 0.03, 0.03, 0.235]], -2, 3, 4); tube([[1.37, 0.055, 0.056, -0.185], [0.72, 0.03, 0.03, -0.235]], 2, 5, 4);
      for (const [x, part] of [[-0.09, 1], [0.09, -1]]) tube([[0, 0.055, 0.1, x, -0.03], [0.3, 0.056, 0.064, x]], part, 1, 4);
      return new Float32Array(v);
    }
    // the wrap and the cloth over the left shoulder: in ihram the right shoulder and chest are bare above a diagonal line
    tube([[0.16, 0.2, 0.16], [0.55, 0.185, 0.14], [0.92, 0.17, 0.125], [1.04, 0.155, 0.11], [1.16, 0.16, 0.112], [1.28, 0.168, 0.115], [1.37, 0.16, 0.1], [1.43, 0.08, 0.07]], 0, 2);
    // neck and head, the face to the front
    tube([[1.41, 0.05, 0.052], [1.5, 0.048, 0.05]], 0, 3, 7);
    tube([[1.49, 0.045, 0.05, 0, -0.012], [1.53, 0.07, 0.08, 0, -0.006], [1.59, 0.083, 0.097], [1.65, 0.082, 0.096], [1.69, 0.066, 0.08], [1.715, 0.035, 0.044], [1.725, 0.004, 0.004]], 0, 4);
    // arms, the right one bare in ihram, the left under the cloth to the elbow, and hands
    tube([[1.37, 0.05, 0.052, 0.185], [1.22, 0.045, 0.048, 0.208], [1.03, 0.038, 0.04, 0.222], [0.82, 0.032, 0.034, 0.23]], -2, 3, 6);
    tube([[0.82, 0.032, 0.034, 0.23], [0.76, 0.036, 0.03, 0.233], [0.7, 0.012, 0.012, 0.235]], -2, 1, 6);
    tube([[1.37, 0.055, 0.056, -0.185], [1.22, 0.05, 0.052, -0.208], [1.03, 0.04, 0.042, -0.222], [0.82, 0.032, 0.034, -0.23]], 2, 5, 6);
    tube([[0.82, 0.032, 0.034, -0.23], [0.76, 0.036, 0.03, -0.233], [0.7, 0.012, 0.012, -0.235]], 2, 1, 6);
    // shins and feet below the hem
    for (const [x, part] of [[-0.09, 1], [0.09, -1]]) {
      tube([[0.03, 0.04, 0.045, x], [0.15, 0.048, 0.054, x], [0.3, 0.056, 0.064, x]], part, 1, 6);
      tube([[0, 0.05, 0.115, x, -0.05], [0.045, 0.048, 0.105, x, -0.05], [0.08, 0.03, 0.055, x, -0.02]], part, 1, 6);
    }
    return new Float32Array(v);
  }

  function create(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true, powerPreference: "high-performance" }) || canvas.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL is not available");
    const main = compile(gl, VS, FS), depth = compile(gl, DEPTH_VS, DEPTH_FS), sky = compile(gl, SKY_VS, SKY_FS), people = compile(gl, P_VS, P_FS), blob = compile(gl, BLOB_VS, BLOB_FS);
    const inst = gl.getExtension("ANGLE_instanced_arrays"), aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    const maxAniso = aniso ? Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 0;
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

    // ---------- textures ----------
    const white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    const textures = {}; let pending = 0;
    function loadTexture(name, url) {
      const t = { tex: white }; textures[name] = t; pending++;
      const img = new Image();
      img.onload = () => {
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
        t.tex = tex; pending--;
      };
      img.onerror = () => { pending--; };
      img.src = url;
    }

    // ---------- buffers ----------
    const batches = [];
    function bindMesh(prog) {
      const F = 4 * STRIDE, A = prog.a;
      gl.enableVertexAttribArray(A.aPos); gl.vertexAttribPointer(A.aPos, 3, gl.FLOAT, false, F, 0);
      if (A.aNor !== undefined) { gl.enableVertexAttribArray(A.aNor); gl.vertexAttribPointer(A.aNor, 3, gl.FLOAT, false, F, 12); }
      if (A.aCol !== undefined) { gl.enableVertexAttribArray(A.aCol); gl.vertexAttribPointer(A.aCol, 3, gl.FLOAT, false, F, 24); }
      if (A.aUV !== undefined) { gl.enableVertexAttribArray(A.aUV); gl.vertexAttribPointer(A.aUV, 2, gl.FLOAT, false, F, 36); }
      if (A.aGlow !== undefined) { gl.enableVertexAttribArray(A.aGlow); gl.vertexAttribPointer(A.aGlow, 1, gl.FLOAT, false, F, 44); }
    }
    const clearAttribs = () => { for (let i = 0; i < 8; i++) { gl.disableVertexAttribArray(i); if (inst) inst.vertexAttribDivisorANGLE(i, 0); } };
    const skyBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const dynBuf = gl.createBuffer(); let dynCount = 0;
    const personBuf = gl.createBuffer(), personV = personMesh(); gl.bindBuffer(gl.ARRAY_BUFFER, personBuf); gl.bufferData(gl.ARRAY_BUFFER, personV, gl.STATIC_DRAW);
    const farBuf = gl.createBuffer(), farV = personMesh(true); gl.bindBuffer(gl.ARRAY_BUFFER, farBuf); gl.bufferData(gl.ARRAY_BUFFER, farV, gl.STATIC_DRAW);
    const NEAR2 = 45 * 45; let sorted = new Float32Array(0);
    const instBuf = gl.createBuffer(), blobBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, blobBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, -1, 1, 0, 1, 1, 0, -1, -1, 0, -1, -1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

    // ---------- what is under a point of the screen: the view enlarged so that this point fills a single pixel ----------
    const camVP = (cam) => mul(perspective(cam.fov, canvas.width / Math.max(1, canvas.height), 0.25, cam.far || 4500), lookDir(cam.pos, cam.yaw, cam.pitch));
    const pick = WalkShell.makePick(gl, canvas, camVP, () => batches.map((b) => [b.buf, b.count]));

    // ---------- the shadow map, baked once for each position of the sun ----------
    const SM = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE)), SHADOW_R = 900;
    const smTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, smTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SM, SM, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const smFbo = gl.createFramebuffer(), smDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, smDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SM, SM);
    gl.bindFramebuffer(gl.FRAMEBUFFER, smFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, smTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, smDepth);
    const smOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let sunVP = null, bakedFor = null;
    function bakeShadow(sunDir) {
      if (!smOk) return;
      const key = sunDir.join(); if (bakedFor === key) return; bakedFor = key;
      const eye = [sunDir[0] * 1600, sunDir[1] * 1600, sunDir[2] * 1600];
      sunVP = mul(ortho(-SHADOW_R, SHADOW_R, -SHADOW_R, SHADOW_R, 10, 3200), lookAt(eye, [0, 0, 0], Math.abs(sunDir[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0]));
      gl.bindFramebuffer(gl.FRAMEBUFFER, smFbo); gl.viewport(0, 0, SM, SM);
      gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depth.p); gl.uniformMatrix4fv(depth.u.uVP, false, sunVP);
      gl.disable(gl.CULL_FACE);
      for (const b of batches) { if (b.noShadow) continue; gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); bindMesh(depth); gl.drawArrays(gl.TRIANGLES, 0, b.count); }
      clearAttribs(); gl.enable(gl.CULL_FACE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function setLight(prog, L, cam) {
      const u = prog.u;
      gl.uniform3fv(u.uCam, cam); gl.uniform3fv(u.uSunDir, L.sunDir); gl.uniform3fv(u.uSunCol, L.sunCol); gl.uniform3fv(u.uSkyAmb, L.skyAmb); gl.uniform3fv(u.uGroundAmb, L.groundAmb);
      gl.uniform3fv(u.uFog, L.fog); gl.uniform1f(u.uFogD, L.fogD); gl.uniform1f(u.uNight, L.night); gl.uniform1f(u.uTexel, 1 / SM);
      const on = L.shadows && smOk && sunVP && L.sunDir[1] > 0.02;
      gl.uniform1f(u.uShadowOn, on ? 1 : 0);
      if (sunVP) gl.uniformMatrix4fv(u.uSunVP, false, sunVP);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, smTex); gl.uniform1i(u.uShadow, 1);
      gl.activeTexture(gl.TEXTURE0);
    }

    return {
      gl, loadTexture, pendingTextures: () => pending, hasInstancing: !!inst,
      // batches: { name: { mesh, tex, gloss, noShadow } }
      setStatic(list) {
        for (const b of list) {
          const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b.mesh.v), gl.STATIC_DRAW);
          batches.push({ buf, count: b.mesh.v.length / STRIDE, tex: b.tex, gloss: b.gloss || 0, noShadow: !!b.noShadow, layer: b.layer || 0, win: b.win || [6, 7] });
        }
        bakedFor = null;
      },
      triangles: () => batches.reduce((s, b) => s + b.count / 3, 0),
      rebake() { bakedFor = null; },
      // cam: {pos, yaw, pitch, fov, far}; L: light; dyn: Mesh with changing things; crowd: {data: Float32Array, n}
      pick,
      project: (cam, q) => WalkShell.project(camVP(cam), q),
      frame(cam, L, dyn, crowd, time) {
        if (L.sunDir[1] > 0.02 && L.shadows) { bakeShadow(L.sunDir); }
        const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, L.dprMax || 2);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(...L.fog, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const vp = camVP(cam);
        // the sky
        gl.depthMask(false); gl.disable(gl.CULL_FACE);
        gl.useProgram(sky.p); gl.uniformMatrix4fv(sky.u.uInv, false, invert(vp)); gl.uniform3fv(sky.u.uCam, cam.pos); gl.uniform3fv(sky.u.uSunDir, L.sunDir); gl.uniform3fv(sky.u.uHor, L.fog); gl.uniform3fv(sky.u.uTop, L.skyTop); gl.uniform3fv(sky.u.uSunGlow, L.sunGlow); gl.uniform1f(sky.u.uNight, L.night);
        gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.enableVertexAttribArray(sky.a.aXY); gl.vertexAttribPointer(sky.a.aXY, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(sky.a.aXY);
        gl.depthMask(true); gl.enable(gl.CULL_FACE);
        // the world
        gl.useProgram(main.p); gl.uniformMatrix4fv(main.u.uVP, false, vp); gl.uniform3fv(main.u.uSkyTop, L.skyTop); setLight(main, L, cam.pos); gl.uniform1i(main.u.uTex, 0);
        for (const b of batches) {
          gl.bindTexture(gl.TEXTURE_2D, (b.tex && textures[b.tex]?.tex) || white); gl.uniform1f(main.u.uGloss, b.gloss); gl.uniform2fv(main.u.uWin, b.win);
          if (b.layer) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, b.layer); } else gl.disable(gl.POLYGON_OFFSET_FILL);
          gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); bindMesh(main); gl.drawArrays(gl.TRIANGLES, 0, b.count);
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        if (dyn && dyn.v.length) {
          gl.bindTexture(gl.TEXTURE_2D, white); gl.uniform1f(main.u.uGloss, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dyn.v), gl.DYNAMIC_DRAW); dynCount = dyn.v.length / STRIDE; bindMesh(main); gl.drawArrays(gl.TRIANGLES, 0, dynCount);
        }
        clearAttribs();
        // the pilgrims
        if (crowd && crowd.n && inst) {
          // the people close by first: they get the full figure, everyone further off the simple one
          if (sorted.length < crowd.n * 10) sorted = new Float32Array(crowd.n * 10);
          let nearN = 0, back = crowd.n;
          for (let i = 0; i < crowd.n; i++) {
            const o = i * 10, dx = crowd.data[o] - cam.pos[0], dz = crowd.data[o + 2] - cam.pos[2], to = (dx * dx + dz * dz < NEAR2 ? nearN++ : --back) * 10;
            for (let k = 0; k < 10; k++) sorted[to + k] = crowd.data[o + k];
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); gl.bufferData(gl.ARRAY_BUFFER, sorted.subarray(0, crowd.n * 10), gl.DYNAMIC_DRAW);
          const bindInst = (p, first = 0) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, instBuf); const S = 40, A = p.a;
            const on = (loc, size, off) => { if (loc === undefined) return; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, S, off + first * S); inst.vertexAttribDivisorANGLE(loc, 1); };
            on(A.iPos, 3, 0); on(A.iYaw, 1, 12); on(A.iCol, 3, 16); on(A.iPhase, 1, 28); on(A.iScale, 1, 32); on(A.iMove, 1, 36);
          };
          // soft shadows under their feet
          if (L.sunDir[1] > 0.05) {
            gl.useProgram(blob.p); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
            gl.uniformMatrix4fv(blob.u.uVP, false, vp); gl.uniform1f(blob.u.uA, 0.42);
            const k = Math.min(2.2, 0.9 * Math.hypot(L.sunDir[0], L.sunDir[2]) / Math.max(0.2, L.sunDir[1]));
            gl.uniform2f(blob.u.uSunOff, -L.sunDir[0] * k, -L.sunDir[2] * k);
            gl.bindBuffer(gl.ARRAY_BUFFER, blobBuf); gl.enableVertexAttribArray(blob.a.aPos); gl.vertexAttribPointer(blob.a.aPos, 3, gl.FLOAT, false, 0, 0); inst.vertexAttribDivisorANGLE(blob.a.aPos, 0);
            bindInst(blob); inst.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, crowd.n); clearAttribs();
            gl.disable(gl.BLEND); gl.depthMask(true);
          }
          gl.useProgram(people.p); gl.uniformMatrix4fv(people.u.uVP, false, vp); gl.uniform1f(people.u.uTime, time); setLight(people, L, cam.pos);
          const A = people.a, F = 32;
          const figures = (buf, vertices, first, n) => {
            if (!n) return;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.enableVertexAttribArray(A.aPos); gl.vertexAttribPointer(A.aPos, 3, gl.FLOAT, false, F, 0); inst.vertexAttribDivisorANGLE(A.aPos, 0);
            gl.enableVertexAttribArray(A.aNor); gl.vertexAttribPointer(A.aNor, 3, gl.FLOAT, false, F, 12); inst.vertexAttribDivisorANGLE(A.aNor, 0);
            gl.enableVertexAttribArray(A.aPart); gl.vertexAttribPointer(A.aPart, 1, gl.FLOAT, false, F, 24); inst.vertexAttribDivisorANGLE(A.aPart, 0);
            gl.enableVertexAttribArray(A.aTone); gl.vertexAttribPointer(A.aTone, 1, gl.FLOAT, false, F, 28); inst.vertexAttribDivisorANGLE(A.aTone, 0);
            bindInst(people, first); inst.drawArraysInstancedANGLE(gl.TRIANGLES, 0, vertices, n);
          };
          figures(personBuf, personV.length / 8, 0, nearN);
          figures(farBuf, farV.length / 8, nearN, crowd.n - nearN);
          clearAttribs();
        }
      },
    };
  }
  return { create, Mesh, STRIDE, sub, cross, norm, dot };
})();
window.HaramGL = HaramGL;
