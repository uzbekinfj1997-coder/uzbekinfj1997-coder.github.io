/* Memory Ops: drawing with WebGL in the realistic look (detailed materials from looks.js, sunlight with shadows,
   a hazy sky, a film-like colour treatment). It can draw several views side by side (two players), each with
   coloured boxes (people, markers), floating pictures (the places) and the weapon in the hands. */
"use strict";
const OpsRender = (() => {
  const BC = BlockCraft;
  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));

  // ---------- matrices (column-major, as WebGL wants) ----------
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, c, up) {
    let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map((v) => v / l);
    let x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]; l = Math.hypot(...x) || 1; x = x.map((v) => v / l);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const dot = (a) => a[0] * e[0] + a[1] * e[1] + a[2] * e[2];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x), -dot(y), -dot(z), 1];
  }
  function ortho(l, r, b, t, n, f) { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; }
  function invert(m) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    return [(a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
            (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
            (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
            (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det];
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }

  // ---------- coloured boxes (people, markers, the weapon) ----------
  const FACES = [[[1, 0, 0], .78], [[-1, 0, 0], .78], [[0, 0, 1], .9], [[0, 0, -1], .9], [[0, 1, 0], 1], [[0, -1, 0], .6]];
  function box(out, cx, cy, cz, sx, sy, sz, yaw, col, pitch = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const pt = (x, y, z) => { const y2 = y * cp - z * sp, z2 = y * sp + z * cp; return [cx + x * c + z2 * s, cy + y2, cz - x * s + z2 * c]; };
    for (const [n, shade] of FACES) {
      const a = n.findIndex((v) => v), sign = n[a], u = (a + 1) % 3, v = (a + 2) % 3;
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => { const k = [0, 0, 0]; k[a] = sign * 0.5; k[u] = p * 0.5; k[v] = q * 0.5; return pt(k[0] * sx, k[1] * sy, k[2] * sz); });
      for (const i of [0, 1, 2, 0, 2, 3]) out.push(...pts[i], col[0] * shade, col[1] * shade, col[2] * shade);
    }
  }
  // ---------- a tactical operator, built from shaped parts joined at the joints ----------
  // Every part is a box from joint a to joint b (so limbs follow the pose), shaded by the sun's direction.
  const SUN = (() => { const v = [0.45, 0.85, 0.3], l = Math.hypot(...v); return v.map((x) => x / l); })();
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scale = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
  // a box whose long axis runs from a to b; w across, d in the direction of `front`
  function limb(out, a, b, w, d, col, front) {
    const Y = norm(sub(b, a)), len = Math.hypot(...sub(b, a));
    let Z = sub(front, scale(Y, dot(front, Y)));
    if (Math.hypot(...Z) < 1e-4) Z = Math.abs(Y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    Z = norm(Z); const X = cross(Y, Z), c = scale(add(a, b), 0.5);
    solid(out, c, [X, Y, Z], [w, len, d], col);
  }
  // an oriented box: centre c, axes [X, Y, Z], size [sx, sy, sz]
  function solid(out, c, axes, size, col) {
    const [X, Y, Z] = axes, h = size.map((v) => v / 2);
    const corner = (i, j, k) => [0, 1, 2].map((n) => c[n] + X[n] * i * h[0] + Y[n] * j * h[1] + Z[n] * k * h[2]);
    for (const [ax, sign] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
      const n = scale(axes[ax], sign), light = 0.42 + 0.58 * Math.max(0, dot(n, SUN)) + 0.12 * Math.max(0, n[1]);
      const u = (ax + 1) % 3, v = (ax + 2) % 3, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => { const k = [0, 0, 0]; k[ax] = sign; k[u] = p; k[v] = q; return corner(...k); });
      const order = sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const i of order) out.push(...pts[i], col[0] * light, col[1] * light, col[2] * light);
    }
  }
  const OUTFITS = {   // like the reference pictures: black, grey kit, a yellow patch; orange patches for the bots, blue for the players
    black: { suit: [0.2, 0.21, 0.235], kit: [0.31, 0.32, 0.33], skin: [0.13, 0.13, 0.14], helmet: [0.26, 0.27, 0.29], patchL: [0.98, 0.78, 0.15], patchR: [0.95, 0.46, 0.2], lens: [0.82, 0.86, 0.9] },
    blue:  { suit: [0.2, 0.21, 0.235], kit: [0.31, 0.32, 0.33], skin: [0.13, 0.13, 0.14], helmet: [0.26, 0.27, 0.29], patchL: [0.98, 0.78, 0.15], patchR: [0.3, 0.56, 0.86], lens: [0.82, 0.86, 0.9], chest: [0.3, 0.56, 0.86] },
    tan:   { suit: [0.45, 0.39, 0.29], kit: [0.32, 0.3, 0.22], skin: [0.25, 0.22, 0.18], helmet: [0.38, 0.34, 0.25], patchL: [0.25, 0.45, 0.85], patchR: [0.25, 0.45, 0.85], lens: [0.62, 0.66, 0.7] },
  };
  function person(out, who, { outfit = "black", gun = true } = {}) {
    const O = OUTFITS[outfit] || OUTFITS.black, hurt = who.hurtT > 0;
    const tint = (c) => (hurt ? [Math.min(1.4, c[0] + 0.55), c[1] * 0.6, c[2] * 0.6] : c);
    const [px, py, pz] = who.pos, yaw = who.yaw, tilt = who.alive === false ? Math.min(1.45, (who.deadT || 0) * 4) : 0;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    // local: x right, y up, -z forward; falling over tips backwards about the feet
    const P = ([x, y, z]) => { const y2 = y * ct - z * st, z2 = y * st + z * ct; return [px + x * cy + z2 * sy, py + y2, pz - x * sy + z2 * cy]; };
    const V = ([x, y, z]) => { const y2 = y * ct - z * st, z2 = y * st + z * ct; return [x * cy + z2 * sy, y2, -x * sy + z2 * cy]; };
    const fwd = V([0, 0, -1]), right = V([1, 0, 0]), up = V([0, 1, 0]);
    const L = (a, b, w, d, col, front = fwd) => limb(out, P(a), P(b), w, d, tint(col), front);
    const B = (c, size, col) => solid(out, P(c), [right, up, scale(fwd, -1)], size, tint(col));
    // walking: legs and arms swing with the distance covered; crouching bends the knees
    const speed = who.vel ? Math.hypot(who.vel[0], who.vel[2]) : 0, phase = (px + pz) * 2.2, swing = who.alive === false ? 0 : Math.sin(phase) * Math.min(1, speed / 3) * 0.55;
    const crouch = who.crouch ? 1 : 0, hipY = 0.92 - crouch * 0.3;
    for (const side of [-1, 1]) {
      const s = swing * side, hip = [side * 0.11, hipY, 0];
      const knee = [side * 0.12, hipY - 0.44 + crouch * 0.1, -Math.sin(s) * 0.44 - crouch * 0.3];
      const ankle = [side * 0.12, 0.09, knee[2] + Math.max(0, Math.sin(-s)) * 0.12 + crouch * 0.25];
      L(hip, knee, 0.19, 0.21, O.suit); L(knee, ankle, 0.16, 0.18, O.suit);
      L([knee[0], knee[1] + 0.05, knee[2] - 0.09], [knee[0], knee[1] - 0.07, knee[2] - 0.1], 0.15, 0.04, O.kit);       // knee pad
      B([ankle[0], 0.06, ankle[2] - 0.05], [0.17, 0.12, 0.3], O.skin);                                                       // boot
    }
    const chestY = hipY + 0.56;
    L([0, hipY - 0.02, 0], [0, chestY, 0], 0.42, 0.24, O.suit);                                                               // body
    B([0, hipY + 0.04, 0], [0.46, 0.09, 0.27], O.kit);                                                                        // belt
    B([0.25, hipY - 0.12, 0.02], [0.08, 0.22, 0.13], O.skin);                                                                 // holster
    B([0, hipY + 0.33, -0.01], [0.47, 0.4, 0.32], O.kit);                                                                     // plate carrier
    for (const x of [-0.13, 0, 0.13]) B([x, hipY + 0.2, -0.18], [0.11, 0.13, 0.06], O.suit);                               // magazine pouches
    B([0.12, hipY + 0.44, -0.17], [0.06, 0.14, 0.04], O.skin);                                                                // radio
    B([-0.13, hipY + 0.47, -0.175], [0.13, 0.075, 0.02], O.chest || O.patchR);                                            // chest patch
    B([0, chestY + 0.06, 0], [0.17, 0.08, 0.17], O.suit);                                                                     // neck
    // head: balaclava, goggles, helmet with ear defenders and a mount on the front
    const head = [0, chestY + 0.2, -0.01];
    B(head, [0.23, 0.25, 0.25], O.suit);
    B([0, head[1] + 0.03, -0.13], [0.22, 0.06, 0.03], O.kit);
    for (const x of [-0.055, 0.055]) B([x, head[1] + 0.03, -0.145], [0.085, 0.045, 0.02], O.lens);
    B([0, head[1] + 0.12, 0.005], [0.28, 0.11, 0.3], O.helmet);
    B([0, head[1] + 0.185, 0.0], [0.22, 0.05, 0.24], O.helmet);
    for (const x of [-0.15, 0.15]) B([x, head[1] + 0.0, 0.0], [0.07, 0.13, 0.13], O.skin);
    B([0, head[1] + 0.14, -0.16], [0.07, 0.05, 0.03], O.skin);
    // arms and the rifle: across the chest on patrol, at the shoulder when a target is in sight
    const aiming = gun && who.alive !== false && (who.alert > 0 || who.flash > 0 || who.aim);
    const shoulderL = [-0.27, chestY - 0.04, 0], shoulderR = [0.27, chestY - 0.04, 0];
    let gripR, gripL, stock, muzzle;
    if (!gun) { gripR = [0.3, hipY - 0.05, -0.02 - swing * 0.2]; gripL = [-0.3, hipY - 0.05, -0.02 + swing * 0.2]; }
    else if (aiming) { stock = [0.17, chestY - 0.06, 0.02]; muzzle = [0.1, chestY - 0.02, -0.78]; gripR = [0.16, chestY - 0.12, -0.16]; gripL = [0.12, chestY - 0.09, -0.46]; }
    else { stock = [0.22, chestY - 0.02, -0.12]; muzzle = [-0.24, hipY - 0.12, -0.42]; gripR = [0.1, hipY + 0.24, -0.22]; gripL = [-0.1, hipY + 0.06, -0.33]; }
    for (const [sh, grip, patch] of [[shoulderL, gripL, O.patchL], [shoulderR, gripR, O.patchR]]) {
      const elbow = [sh[0] * 1.08, (sh[1] + grip[1]) / 2 - 0.08, (sh[2] + grip[2]) / 2 + 0.06];
      L(sh, elbow, 0.14, 0.14, O.suit); L(elbow, grip, 0.12, 0.12, O.suit);
      L(add(sh, [0, -0.06, 0]), add(sh, [0, -0.21, 0]), 0.165, 0.165, patch);                                                // shoulder patch
      B(grip, [0.09, 0.09, 0.1], O.skin);                                                                                   // glove
    }
    if (gun && stock) {     // the rifle: stock, receiver, magazine, handguard, barrel, sight
      const d = norm(sub(muzzle, stock)), at = (t) => add(stock, scale(d, t)), gunUp = norm(cross(cross(d, [0, 1, 0]), d));
      const upW = V(gunUp), L2 = (a, b, w, h, col) => limb(out, P(a), P(b), w, h, tint(col), upW), dark = [0.15, 0.15, 0.16];
      L2(at(0), at(0.2), 0.05, 0.1, dark); L2(at(0.2), at(0.5), 0.055, 0.09, [0.22, 0.22, 0.23]);
      L2(at(0.5), at(0.68), 0.05, 0.07, dark); L2(at(0.68), at(0.84), 0.022, 0.022, dark);
      L2(add(at(0.38), scale(gunUp, -0.04)), add(at(0.4), scale(gunUp, -0.2)), 0.04, 0.07, [0.4, 0.4, 0.42]);              // magazine
      L2(add(at(0.3), scale(gunUp, 0.065)), add(at(0.42), scale(gunUp, 0.065)), 0.035, 0.05, dark);                        // sight
      if (who.flash > 0) B(at(0.9), [0.14, 0.14, 0.14], [1.8, 1.3, 0.4]);
    }
  }
  // the weapon in the hands, in view space
  function viewmodel(out, weapon, { bob = 0, reload = 0, kick = 0, flash = 0 }) {
    const ox = 0.24 + Math.sin(bob * 1.1) * 0.012, oy = -0.22 - Math.abs(Math.cos(bob * 1.1)) * 0.01 - Math.sin(Math.PI * reload) * 0.22, oz = -0.5 + kick;
    const skin = [0.16, 0.16, 0.17], dark = [0.12, 0.12, 0.13], wood = [0.2, 0.2, 0.21];     // black gloves, a black polymer stock, like the operators
    const parts = weapon === "rifle"
      ? [[0, 0, -0.05, 0.07, 0.09, 0.55, dark], [0, 0.015, -0.45, 0.03, 0.03, 0.3, dark], [0, -0.1, -0.12, 0.05, 0.15, 0.08, [0.3, 0.22, 0.12]],
         [0, -0.02, 0.25, 0.06, 0.1, 0.18, wood], [0, -0.06, 0.08, 0.05, 0.1, 0.05, dark], [-0.02, -0.08, 0.1, 0.08, 0.08, 0.14, skin], [-0.06, -0.06, -0.28, 0.08, 0.07, 0.12, skin]]
      : weapon === "pistol"
        ? [[0, 0, -0.06, 0.05, 0.07, 0.22, dark], [0, -0.07, 0.02, 0.045, 0.12, 0.06, [0.2, 0.2, 0.2]], [0, -0.1, 0.05, 0.08, 0.08, 0.1, skin]]
        : weapon === "knife"
          ? [[0, 0.01, -0.16, 0.015, 0.04, 0.26, [0.78, 0.8, 0.84]], [0, -0.01, 0.03, 0.03, 0.05, 0.12, dark], [0, -0.03, 0.06, 0.07, 0.07, 0.1, skin]]
          : [[0, -0.08, 0, 0.09, 0.09, 0.16, skin]];                        // empty hand (missions without weapons)
    for (const [x, y, z, sx, sy, sz, col] of parts) box(out, ox + x, oy + y, oz + z, sx, sy, sz, 0, col);
    if (flash > 0 && (weapon === "rifle" || weapon === "pistol")) box(out, ox, oy + 0.02, oz - (weapon === "rifle" ? 0.68 : 0.22), 0.07, 0.07, 0.07, 0, [1.8, 1.4, 0.5]);
  }

  function create(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: false });
    if (!gl) return null;
    function program(vs, fs) {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      const cache = {};
      return { p, loc: (n) => (n in cache ? cache[n] : (cache[n] = n[0] === "a" ? gl.getAttribLocation(p, n) : gl.getUniformLocation(p, n))) };
    }
    const FOG = `vFog = clamp((distance(aPos, uEye) - uFog * 0.55) / (uFog * 0.45), 0.0, 1.0);`;
    const GRADE = `vec3 grade(vec3 c) {
        c = clamp((c * 1.05 * (2.51 * c * 1.05 + 0.03)) / (c * 1.05 * (2.43 * c * 1.05 + 0.59) + 0.14), 0.0, 1.0);
        c = pow(c, vec3(1.0 / 2.2));
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        return mix(vec3(l), c, 0.86) * vec3(1.03, 1.0, 0.95); }`;
    const HIGH = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
    const SKYCOL = `vec3 skyAt(vec3 d) { return pow(mix(uHorizon, uZenith, pow(max(d.y, 0.0), 0.55)), vec3(2.2)); }`;
    const world = program(`
      attribute vec3 aPos; attribute vec2 aUV; attribute float aShade; attribute vec3 aNormal;
      uniform mat4 uMVP; uniform mat4 uLightMVP; uniform vec3 uEye; uniform float uFog;
      varying vec2 vUV; varying float vAO; varying vec3 vN; varying vec3 vPos; varying vec4 vLight; varying float vFog;
      void main() { gl_Position = uMVP * vec4(aPos, 1.0); vUV = aUV; vAO = aShade; vN = aNormal; vPos = aPos; vLight = uLightMVP * vec4(aPos, 1.0); ${FOG} }`, HIGH + `
      uniform sampler2D uTex; uniform sampler2D uShadowMap; uniform float uShadows; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uEye;
      uniform vec3 uHorizon; uniform vec3 uZenith;
      varying vec2 vUV; varying float vAO; varying vec3 vN; varying vec3 vPos; varying vec4 vLight; varying float vFog;
      float unpack(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
      float shadowAt(float ndl) {
        vec3 p = vLight.xyz * 0.5 + 0.5;
        if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
        float bias = 0.0012 + 0.003 * (1.0 - ndl), s = 0.0;
        for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
          s += p.z - bias > unpack(texture2D(uShadowMap, p.xy + vec2(float(i), float(j)) / 2048.0)) ? 0.0 : 1.0;
        return s / 9.0;
      }
      ${GRADE} ${SKYCOL}
      void main() {
        vec4 c = texture2D(uTex, vUV); if (c.a < 0.5) discard;
        vec3 alb = pow(c.rgb, vec3(2.2)), n = vN;
        float ndl = max(dot(n, uSunDir), 0.0), sh = uShadows > 0.5 && ndl > 0.0 ? shadowAt(ndl) : 1.0;
        vec3 col = alb * (uAmb * vAO * (0.78 + 0.22 * n.y) + uSunCol * ndl * sh * (0.6 + 0.4 * vAO));
        col = mix(col, skyAt(normalize(vPos - uEye)), vFog * vFog * (3.0 - 2.0 * vFog));
        gl_FragColor = vec4(grade(col), 1.0);
      }`);
    const coloured = program(`
      attribute vec3 aPos; attribute vec3 aCol; uniform mat4 uMVP; uniform vec3 uEye; uniform float uFog; varying vec3 vCol; varying float vFog; varying vec3 vPos;
      void main() { gl_Position = uMVP * vec4(aPos, 1.0); vCol = aCol; vPos = aPos; ${FOG} }`, HIGH + `
      uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uEye; uniform float uGain; varying vec3 vCol; varying float vFog; varying vec3 vPos;
      ${GRADE} ${SKYCOL}
      void main() { vec3 col = pow(max(vCol, vec3(0.0)), vec3(2.2)) * uGain;
        col = mix(col, skyAt(normalize(vPos - uEye)), vFog * vFog); gl_FragColor = vec4(grade(col), 1.0); }`);
    const depth = program(`
      attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uLightMVP; varying vec2 vUV; varying float vD;
      void main() { gl_Position = uLightMVP * vec4(aPos, 1.0); vUV = aUV; vD = gl_Position.z * 0.5 + 0.5; }`, HIGH + `
      uniform sampler2D uTex; varying vec2 vUV; varying float vD;
      void main() { if (texture2D(uTex, vUV).a < 0.5) discard;
                    vec4 e = fract(vD * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); gl_FragColor = e; }`);
    const sky = program(`
      attribute vec2 aXY; uniform mat4 uInv; varying vec3 vDir;
      void main() { gl_Position = vec4(aXY, 0.9999, 1.0); vec4 p = uInv * vec4(aXY, 1.0, 1.0); vDir = p.xyz / p.w; }`, HIGH + `
      uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunDir; uniform vec3 uSunCol; varying vec3 vDir;
      ${GRADE} ${SKYCOL}
      void main() { vec3 d = normalize(vDir), c = skyAt(d); float s = max(dot(d, uSunDir), 0.0);
        c += pow(uSunCol, vec3(2.2)) * (pow(s, 1400.0) * 6.0 + pow(s, 14.0) * 0.2 + pow(s, 3.0) * 0.05); gl_FragColor = vec4(grade(c), 1.0); }`);
    const sprite = program(`
      attribute vec2 aXY; uniform mat4 uMVP; uniform vec3 uCenter; uniform vec3 uRight; uniform vec3 uUp; uniform vec2 uSize; varying vec2 vUV;
      void main() { gl_Position = uMVP * vec4(uCenter + uRight * aXY.x * uSize.x + uUp * aXY.y * uSize.y, 1.0); vUV = vec2(aXY.x * 0.5 + 0.5, 0.5 - aXY.y * 0.5); }`,
      `precision mediump float; uniform sampler2D uTex; uniform float uAlpha; varying vec2 vUV;
      void main() { vec4 c = texture2D(uTex, vUV); if (c.a < 0.05) discard; gl_FragColor = vec4(c.rgb, c.a * uAlpha); }`);
    const quad = gl.createBuffer(), skyBuf = gl.createBuffer(), dyn = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    // the realistic textures (the blocky atlas only provides item pictures, not needed here)
    const blank = document.createElement("canvas"); blank.width = blank.height = 256;
    const atlas = CraftLooks.makeAtlas(blank), tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    BC.setTilePad(CraftLooks.pad);

    // shadow map
    const SHADOW = 2048, shadowTex = gl.createTexture(), shadowFB = gl.createFramebuffer(), shadowDepth = gl.createRenderbuffer();
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW, SHADOW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.bindRenderbuffer(gl.RENDERBUFFER, shadowDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW, SHADOW);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, shadowDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let chunks = [], light = null, lightMVP = null, size = 48;
    const STRIDE = BC.STRIDE * 4;
    function sunlight(t, desert) {
      let dir = [Math.cos(t * Math.PI * 2) * 0.8, Math.sin(t * Math.PI * 2), 0.42];
      const l = Math.hypot(...dir); dir = dir.map((v) => v / l);
      const low = Math.max(0, Math.min(1, 1 - dir[1] / 0.45));
      return { dir, col: lerp3([1.0, 0.95, 0.85], [1.0, 0.62, 0.36], low).map((v) => v * 2.15),
               horizon: lerp3(desert ? [0.86, 0.76, 0.6] : [0.66, 0.74, 0.84], [0.95, 0.58, 0.38], low * 0.8),
               zenith: desert ? [0.3, 0.48, 0.76] : [0.16, 0.36, 0.74], amb: [0.44, 0.47, 0.55].map((v, i) => v * (desert ? [1.08, 1.0, 0.9][i] : 1)) };
    }
    function bindWorld(prog, buf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(prog.loc("aPos"), 3, gl.FLOAT, false, STRIDE, 0);
      gl.vertexAttribPointer(prog.loc("aUV"), 2, gl.FLOAT, false, STRIDE, 12);
      if (prog === world) { gl.vertexAttribPointer(prog.loc("aShade"), 1, gl.FLOAT, false, STRIDE, 20); gl.vertexAttribPointer(prog.loc("aNormal"), 3, gl.FLOAT, false, STRIDE, 24); }
    }
    // a new world: build its meshes and its shadows (the maps don't change, so once is enough)
    function setWorld(w, map) {
      for (const c of chunks) gl.deleteBuffer(c.buf);
      chunks = [];
      size = w.size;
      for (let cx = 0; cx < Math.ceil(w.size / BC.CHUNK); cx++) for (let cz = 0; cz < Math.ceil(w.size / BC.CHUNK); cz++) {
        const m = BC.chunkMesh(w, cx, cz).solid;
        if (!m.length) continue;
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, m, gl.STATIC_DRAW);
        chunks.push({ buf, n: m.length / BC.STRIDE });
      }
      light = sunlight(map.sun ?? 0.17, map.id === "dust");
      const R = size * 0.75, c = [map.size[0] / 2, 2, map.size[1] / 2], from = c.map((v, i) => v + light.dir[i] * 140);
      lightMVP = mul(ortho(-R, R, -R, R, 1, 300), lookAt(from, c, [0, 1, 0]));
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFB);
      gl.viewport(0, 0, SHADOW, SHADOW); gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(depth.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniformMatrix4fv(depth.loc("uLightMVP"), false, lightMVP);
      gl.enableVertexAttribArray(depth.loc("aPos")); gl.enableVertexAttribArray(depth.loc("aUV"));
      for (const ch of chunks) { bindWorld(depth, ch.buf); gl.drawArrays(gl.TRIANGLES, 0, ch.n); }
      gl.disableVertexAttribArray(depth.loc("aPos")); gl.disableVertexAttribArray(depth.loc("aUV"));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // ---------- floating pictures: an emoji with a label, painted once into a texture ----------
    const sprites = new Map();
    function spriteTex(key, emoji, label, colour = "#fff") {
      if (sprites.has(key)) return sprites.get(key);
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d");
      g.textAlign = "center"; g.textBaseline = "middle";
      if (emoji) { g.font = "150px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; g.fillText(emoji, 128, label ? 100 : 128); }
      if (label) {
        g.font = "bold 30px sans-serif";
        const w = Math.min(250, g.measureText(label).width + 26);
        g.fillStyle = "rgba(0,0,0,.62)"; g.fillRect(128 - w / 2, emoji ? 196 : 104, w, 46);
        g.fillStyle = colour; g.fillText(label, 128, emoji ? 220 : 128, 240);
      }
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      sprites.set(key, t);
      return t;
    }

    function drawColoured(verts, mvp, eye, fog, gain = 1.4) {
      if (!verts.length) return;
      const C = coloured;
      gl.useProgram(C.p);
      gl.uniformMatrix4fv(C.loc("uMVP"), false, mvp); gl.uniform3fv(C.loc("uEye"), eye); gl.uniform1f(C.loc("uFog"), fog); gl.uniform1f(C.loc("uGain"), gain);
      gl.uniform3fv(C.loc("uHorizon"), light.horizon); gl.uniform3fv(C.loc("uZenith"), light.zenith);
      gl.bindBuffer(gl.ARRAY_BUFFER, dyn); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(C.loc("aPos")); gl.enableVertexAttribArray(C.loc("aCol"));
      gl.vertexAttribPointer(C.loc("aPos"), 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(C.loc("aCol"), 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 6);
      gl.disableVertexAttribArray(C.loc("aPos")); gl.disableVertexAttribArray(C.loc("aCol"));
    }

    // Draw one frame. views: [{ rect: [x, y, w, h] in CSS pixels, eye, dir, fov, boxes, sprites: [{ pos, tex, w, h, alpha }], hands }]
    function frame(views, { shadows = true, fog = 70 } = {}) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
      if (!W || !H || !light) return;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.enable(gl.SCISSOR_TEST);
      for (const v of views) {
        const [x, y, w, h] = v.rect.map((n) => Math.round(n * dpr)), gy = H - y - h;
        gl.viewport(x, gy, w, h); gl.scissor(x, gy, w, h);
        gl.clearColor(...light.horizon, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const eye = v.eye, d = v.dir, proj = perspective((v.fov || 75) * Math.PI / 180, w / h, 0.05, 200);
        const mvp = mul(proj, lookAt(eye, [eye[0] + d[0], eye[1] + d[1], eye[2] + d[2]], [0, 1, 0]));
        // sky
        gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
        gl.useProgram(sky.p);
        gl.uniformMatrix4fv(sky.loc("uInv"), false, invert(mul(proj, lookAt([0, 0, 0], d, [0, 1, 0]))));
        gl.uniform3fv(sky.loc("uHorizon"), light.horizon); gl.uniform3fv(sky.loc("uZenith"), light.zenith);
        gl.uniform3fv(sky.loc("uSunDir"), light.dir); gl.uniform3fv(sky.loc("uSunCol"), light.col.map((c) => c / 2.15));
        gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.enableVertexAttribArray(sky.loc("aXY")); gl.vertexAttribPointer(sky.loc("aXY"), 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(sky.loc("aXY"));
        gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
        // the world
        const P = world;
        gl.useProgram(P.p);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowTex);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(P.loc("uTex"), 0); gl.uniform1i(P.loc("uShadowMap"), 1);
        gl.uniformMatrix4fv(P.loc("uMVP"), false, mvp); gl.uniformMatrix4fv(P.loc("uLightMVP"), false, lightMVP);
        gl.uniform3fv(P.loc("uEye"), eye); gl.uniform1f(P.loc("uFog"), fog); gl.uniform1f(P.loc("uShadows"), shadows ? 1 : 0);
        gl.uniform3fv(P.loc("uSunDir"), light.dir); gl.uniform3fv(P.loc("uSunCol"), light.col); gl.uniform3fv(P.loc("uAmb"), light.amb);
        gl.uniform3fv(P.loc("uHorizon"), light.horizon); gl.uniform3fv(P.loc("uZenith"), light.zenith);
        const attrs = ["aPos", "aUV", "aShade", "aNormal"].map((a) => P.loc(a));
        for (const a of attrs) gl.enableVertexAttribArray(a);
        for (const ch of chunks) { bindWorld(P, ch.buf); gl.drawArrays(gl.TRIANGLES, 0, ch.n); }
        for (const a of attrs) gl.disableVertexAttribArray(a);
        // people and markers
        drawColoured(v.boxes || [], mvp, eye, fog);
        // floating pictures, far ones first
        const list = (v.sprites || []).slice().sort((a, b) => Math.hypot(b.pos[0] - eye[0], b.pos[2] - eye[2]) - Math.hypot(a.pos[0] - eye[0], a.pos[2] - eye[2]));
        if (list.length) {
          const S = sprite, fz = [d[0], 0, d[2]], fl = Math.hypot(fz[0], fz[2]) || 1, right = [-fz[2] / fl, 0, fz[0] / fl];
          gl.useProgram(S.p); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
          gl.uniformMatrix4fv(S.loc("uMVP"), false, mvp); gl.uniform3fv(S.loc("uRight"), right); gl.uniform3fv(S.loc("uUp"), [0, 1, 0]);
          gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(S.loc("aXY")); gl.vertexAttribPointer(S.loc("aXY"), 2, gl.FLOAT, false, 0, 0);
          for (const s of list) {
            if (s.onTop) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST);
            gl.bindTexture(gl.TEXTURE_2D, s.tex);
            gl.uniform3fv(S.loc("uCenter"), s.pos); gl.uniform2fv(S.loc("uSize"), [s.w || 0.6, s.h || s.w || 0.6]); gl.uniform1f(S.loc("uAlpha"), s.alpha ?? 1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
          gl.disableVertexAttribArray(S.loc("aXY")); gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
        }
        // the weapon in the hands, in front of everything
        if (v.hands && v.hands.length) {
          gl.clear(gl.DEPTH_BUFFER_BIT);
          drawColoured(v.hands, mul(perspective(70 * Math.PI / 180, w / h, 0.01, 10), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]), [0, 0, 0], 1000, 1.25);
        }
      }
      gl.disable(gl.SCISSOR_TEST);
    }
    return { setWorld, frame, spriteTex, gl };
  }
  return { create, box, person, viewmodel, perspective, lookAt, mul };
})();
window.OpsRender = OpsRender;
