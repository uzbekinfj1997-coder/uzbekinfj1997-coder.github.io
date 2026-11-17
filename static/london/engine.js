/* London Walk: the WebGL renderer. Static geometry (streets, buildings, landmarks) is built once into one buffer;
   cars, buses, people and rain are rebuilt every frame into small dynamic buffers. Buildings are drawn with a
   facade shader that paints windows and lit shop fronts from wall coordinates, so no images are loaded. */
"use strict";
const LondonGL = (() => {
  // vertex layout: position 3, normal 3, colour 3, uv 2, kind 1  (kind: 0 plain, 1 facade, 2 road, 3 screen, 4 glass, 5 lamp light)
  const STRIDE = 12;

  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute vec2 aUV; attribute float aKind;
uniform mat4 uVP;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec2 vUV; varying float vKind;
void main() { vPos = aPos; vNor = aNor; vCol = aCol; vUV = aUV; vKind = aKind; gl_Position = uVP * vec4(aPos, 1.0); }`;

  const FS = `
precision mediump float;
varying vec3 vPos; varying vec3 vNor; varying vec3 vCol; varying vec2 vUV; varying float vKind;
uniform vec3 uCam; uniform vec3 uFog; uniform float uFogD; uniform float uDay; uniform float uTime; uniform float uWet; uniform vec3 uSkyTop;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vNor);
  vec3 sunDir = normalize(vec3(0.35, 0.8, 0.25));
  float hemi = 0.55 + 0.45 * n.y;
  float diff = max(dot(n, sunDir), 0.0);
  float light = mix(0.22, 1.0, uDay) * (0.55 * hemi + 0.45 * diff * uDay + 0.15);
  vec3 col = vCol * light;
  float k = vKind;
  vec3 V = normalize(uCam - vPos);
  if (k > 0.5 && k < 1.5) {            // facade: windows above the ground floor, shop fronts at street level
    float u = vUV.x, v = vUV.y;
    vec2 cell = vec2(floor(u / 3.1), floor((v - 4.6) / 3.4));
    vec2 f = vec2(fract(u / 3.1), fract((v - 4.6) / 3.4));
    if (v > 4.6 && f.x > 0.22 && f.x < 0.78 && f.y > 0.22 && f.y < 0.8) {
      float lit = step(0.62 - (1.0 - uDay) * 0.3, hash(cell + floor(vPos.xz / 50.0)));
      vec3 glass = mix(vec3(0.16, 0.19, 0.23), uSkyTop * 0.7, 0.35 + 0.4 * (1.0 - abs(V.y)));
      col = mix(glass * mix(0.5, 1.0, uDay), vec3(1.0, 0.82, 0.55), lit * (1.0 - uDay * 0.75));
    } else if (v > 4.4 && v < 4.9) {
      col *= 0.7;                       // cornice line above the shops
    } else if (v < 4.4) {
      float bay = fract(u / 6.0);
      if (v > 0.5 && v < 3.6 && bay > 0.1 && bay < 0.9) {
        float h = hash(vec2(floor(u / 6.0), floor(vPos.x / 40.0 + vPos.z / 37.0)));
        vec3 shop = mix(vec3(1.0, 0.86, 0.62), vec3(0.75, 0.88, 1.0), step(0.6, h));
        col = shop * mix(0.65, 1.05, 1.0 - uDay * 0.4);
      } else if (v >= 3.6) {
        float h = hash(vec2(floor(u / 6.0) + 7.0, floor(vPos.z / 31.0)));
        col = mix(vec3(0.09, 0.12, 0.1), vec3(0.45, 0.06, 0.08), step(0.5, h)) * mix(0.6, 1.0, uDay);   // shop signs
      }
    }
  } else if (k > 1.5 && k < 2.5) {     // wet road or pavement: darker, with the sky and lights reflected
    float fres = pow(1.0 - max(V.y, 0.0), 3.0);
    vec3 refl = mix(uFog, uSkyTop, 0.3);
    float streak = smoothstep(0.92, 1.0, hash(floor(vPos.xz * vec2(0.4, 0.07)))) * (1.0 - uDay * 0.6);
    col = mix(col, refl, uWet * (0.25 + 0.55 * fres)) + vec3(1.0, 0.75, 0.45) * streak * uWet * 0.35;
  } else if (k > 2.5 && k < 3.5) {     // big screens: slow abstract colour fields
    float t = uTime * 0.25;
    vec2 p = vUV * vec2(0.012, 0.018);
    vec3 a = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + floor(p.x + t) * 0.21 + floor(p.y - t * 0.7) * 0.13));
    col = a * 1.15;
  } else if (k > 3.5 && k < 4.5) {     // glass and brass: shiny, reflects the sky
    col = mix(vCol * light, uSkyTop, 0.35);
  } else if (k > 4.5) {                // lamps and lit signs
    col = vCol * (1.4 - uDay * 0.4);
  }
  float d = length(uCam - vPos);
  float fog = 1.0 - exp(-uFogD * d);
  gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
}`;

  const RAIN_VS = `attribute vec3 aPos; attribute float aA; uniform mat4 uVP; varying float vA; void main() { vA = aA; gl_Position = uVP * vec4(aPos, 1.0); }`;
  const RAIN_FS = `precision mediump float; varying float vA; uniform vec3 uRainCol; void main() { gl_FragColor = vec4(uRainCol, vA); }`;

  function compile(gl, vs, fs) {
    const make = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  // ---------- small maths ----------
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookDir(eye, yaw, pitch) {
    const cp = Math.cos(pitch), f = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
    const r = [Math.cos(yaw), 0, -Math.sin(yaw)], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    return [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0,
      -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]), -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]), f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2], 1];
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
    return o;
  }

  // ---------- a mesh builder ----------
  function Mesh() { this.v = []; }
  Mesh.prototype.vert = function (p, n, c, uv, kind) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], uv[0], uv[1], kind); };
  Mesh.prototype.tri = function (a, b, c, n, col, uva, uvb, uvc, kind) { this.vert(a, n, col, uva, kind); this.vert(b, n, col, uvb, kind); this.vert(c, n, col, uvc, kind); };
  Mesh.prototype.quad = function (a, b, c, d, col, kind = 0, uv = null) {
    const n = norm(cross(sub(b, a), sub(d, a)));
    const [ua, ub, uc, ud] = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    this.tri(a, b, c, n, col, ua, ub, uc, kind); this.tri(a, c, d, n, col, ua, uc, ud, kind);
  };
  // an axis-free box: centre, half sizes, yaw
  Mesh.prototype.box = function (cx, cy, cz, hx, hy, hz, col, yaw = 0, kind = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    this.quad(v[4], v[5], v[6], v[7], col, kind); this.quad(v[1], v[0], v[3], v[2], col, kind);
    this.quad(v[5], v[1], v[2], v[6], col, kind); this.quad(v[0], v[4], v[7], v[3], col, kind);
    this.quad(v[7], v[6], v[2], v[3], col, kind); this.quad(v[0], v[1], v[5], v[4], col.map((x) => x * 0.6), kind);
  };
  // a cylinder (or cone when r1 != r2) around a vertical axis
  Mesh.prototype.cyl = function (cx, y0, cz, r0, y1, r1, col, seg = 10, kind = 0) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      this.quad(p(a1, r0, y0), p(a0, r0, y0), p(a0, r1, y1), p(a1, r1, y1), col, kind);
      if (r1 > 0) this.tri(p(a0, r1, y1), [cx, y1, cz], p(a1, r1, y1), [0, 1, 0], col, [0, 0], [0, 0], [0, 0], kind);
    }
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  function create(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true }) || canvas.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL is not available");
    const prog = compile(gl, VS, FS), rain = compile(gl, RAIN_VS, RAIN_FS);
    const loc = (p, n) => gl.getAttribLocation(p, n), U = (p, n) => gl.getUniformLocation(p, n);
    const A = { pos: loc(prog, "aPos"), nor: loc(prog, "aNor"), col: loc(prog, "aCol"), uv: loc(prog, "aUV"), kind: loc(prog, "aKind") };
    const RA = { pos: loc(rain, "aPos"), a: loc(rain, "aA") };
    const staticBuf = gl.createBuffer(), dynBuf = gl.createBuffer(), rainBuf = gl.createBuffer();
    let staticCount = 0;
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

    function bind(buf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const F = 4 * STRIDE;
      gl.enableVertexAttribArray(A.pos); gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, F, 0);
      gl.enableVertexAttribArray(A.nor); gl.vertexAttribPointer(A.nor, 3, gl.FLOAT, false, F, 12);
      gl.enableVertexAttribArray(A.col); gl.vertexAttribPointer(A.col, 3, gl.FLOAT, false, F, 24);
      gl.enableVertexAttribArray(A.uv); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, F, 36);
      gl.enableVertexAttribArray(A.kind); gl.vertexAttribPointer(A.kind, 1, gl.FLOAT, false, F, 44);
    }
    const camVP = (cam) => mul(perspective(cam.fov, canvas.width / Math.max(1, canvas.height), 0.1, cam.far || 900), lookDir(cam.pos, cam.yaw, cam.pitch));
    return {
      gl,
      pick: WalkShell.makePick(gl, canvas, camVP, () => [[staticBuf, staticCount]]),
      project: (cam, q) => WalkShell.project(camVP(cam), q),
      setStatic(mesh) { gl.bindBuffer(gl.ARRAY_BUFFER, staticBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW); staticCount = mesh.v.length / STRIDE; },
      // cam: {pos, yaw, pitch, fov}; look: {fog, fogD, sky, skyTop, day, wet, time}; dyn: Mesh; drops: Float32Array (x,y,z,a)*2 per drop
      frame(cam, look, dyn, drops) {
        const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(...look.sky, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const vp = camVP(cam);
        gl.useProgram(prog);
        gl.uniformMatrix4fv(U(prog, "uVP"), false, vp);
        gl.uniform3fv(U(prog, "uCam"), cam.pos); gl.uniform3fv(U(prog, "uFog"), look.fog); gl.uniform1f(U(prog, "uFogD"), look.fogD);
        gl.uniform1f(U(prog, "uDay"), look.day); gl.uniform1f(U(prog, "uTime"), look.time); gl.uniform1f(U(prog, "uWet"), look.wet); gl.uniform3fv(U(prog, "uSkyTop"), look.skyTop);
        bind(staticBuf); gl.drawArrays(gl.TRIANGLES, 0, staticCount);
        if (dyn && dyn.v.length) { gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dyn.v), gl.DYNAMIC_DRAW); bind(dynBuf); gl.drawArrays(gl.TRIANGLES, 0, dyn.v.length / STRIDE); }
        for (const k of Object.values(A)) gl.disableVertexAttribArray(k);
        if (drops && drops.length) {
          gl.useProgram(rain); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
          gl.uniformMatrix4fv(U(rain, "uVP"), false, vp); gl.uniform3fv(U(rain, "uRainCol"), look.rainCol || [0.8, 0.85, 0.95]);
          gl.bindBuffer(gl.ARRAY_BUFFER, rainBuf); gl.bufferData(gl.ARRAY_BUFFER, drops, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(RA.pos); gl.vertexAttribPointer(RA.pos, 3, gl.FLOAT, false, 16, 0);
          gl.enableVertexAttribArray(RA.a); gl.vertexAttribPointer(RA.a, 1, gl.FLOAT, false, 16, 12);
          gl.drawArrays(gl.LINES, 0, drops.length / 4);
          gl.disableVertexAttribArray(RA.pos); gl.disableVertexAttribArray(RA.a);
          gl.depthMask(true); gl.disable(gl.BLEND);
        }
      },
    };
  }
  return { create, Mesh, STRIDE, sub, cross, norm };
})();
window.LondonGL = LondonGL;
