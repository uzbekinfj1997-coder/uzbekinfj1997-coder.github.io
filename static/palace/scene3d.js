/* Memory Palace: the 3D walk along a route. Each place stands on a plinth with its picture and name; the camera
   walks from place to place (drag to look around). Drawn with plain WebGL; pictures are emoji painted into
   textures by the page, so nothing is downloaded. */
"use strict";
const PalaceScene3D = (() => {
  function create(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return null;
    function program(vs, fs) {
      const p = gl.createProgram();
      for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      const loc = (n) => (n[0] === "a" ? gl.getAttribLocation(p, n) : gl.getUniformLocation(p, n));
      return { p, loc };
    }
    const solid = program(`
      attribute vec3 aPos; attribute vec3 aCol; uniform mat4 uMVP; uniform vec3 uEye; varying vec3 vCol; varying float vFog;
      void main() { gl_Position = uMVP * vec4(aPos, 1.0); vCol = aCol; vFog = clamp((distance(aPos, uEye) - 22.0) / 30.0, 0.0, 1.0); }`, `
      precision mediump float; uniform vec3 uSky; varying vec3 vCol; varying float vFog;
      void main() { gl_FragColor = vec4(mix(vCol, uSky, vFog), 1.0); }`);
    const sprite = program(`
      attribute vec2 aCorner; uniform mat4 uMVP; uniform vec3 uCenter; uniform vec3 uRight; uniform vec3 uUp; uniform float uSize; varying vec2 vUV;
      void main() { vec3 p = uCenter + (uRight * aCorner.x + uUp * aCorner.y) * uSize; gl_Position = uMVP * vec4(p, 1.0);
                    vUV = vec2(aCorner.x * 0.5 + 0.5, 0.5 - aCorner.y * 0.5); }`, `
      precision mediump float; uniform sampler2D uTex; uniform float uAlpha; varying vec2 vUV;
      void main() { vec4 c = texture2D(uTex, vUV); if (c.a < 0.05) discard; gl_FragColor = vec4(c.rgb, c.a * uAlpha); }`);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    let world = null, worldN = 0, places = [], palace = null, items = [], cur = 0, target = 0, yaw = 0, pitch = 0, raf = 0, running = false;
    const textures = new Map();

    // ---------- pictures: an emoji (or a short text) with a name card under it ----------
    function texture(key, emoji, label, colour = "#fff") {
      if (textures.has(key)) return textures.get(key);
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d");
      g.textAlign = "center"; g.textBaseline = "middle";
      if (emoji) { g.font = "150px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; g.fillText(emoji, 128, 100); }
      if (label) {
        g.font = "bold 30px sans-serif";
        const w = Math.min(250, g.measureText(label).width + 28);
        g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(128 - w / 2, emoji ? 196 : 98, w, 46);
        g.fillStyle = colour; g.fillText(label, 128, emoji ? 220 : 122, 240);
      }
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures.set(key, t);
      return t;
    }

    // ---------- the scene ----------
    const W = (l) => [(l.x - 50) * 0.32, (l.y - 35) * 0.32];
    function box(out, x0, y0, z0, x1, y1, z1, col) {
      const faces = [[[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], 0.8], [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], 0.8],
                     [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0.9], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0.9],
                     [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], 1.0], [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], 0.6]];
      for (const [a, b, c, d, s] of faces) for (const p of [a, b, c, a, c, d]) out.push(...p, col[0] * s, col[1] * s, col[2] * s);
    }
    function build(p) {
      const v = [], house = p.theme === "house", pts = p.loci.map(W);
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
      const [ground, path] = p.colours ? p.colours.map(hex) : [house ? [0.36, 0.5, 0.3] : [0.38, 0.6, 0.32], house ? [0.6, 0.24, 0.24] : [0.85, 0.78, 0.6]];
      box(v, -22, -0.2, -16, 22, 0, 16, ground);                                                          // ground / lawn
      if (house) {
        // three rooms (one per row of places) with their own floors; walls between them with a doorway where the route turns
        const rowZ = [0, 1, 2].map((r) => (12 + r * 23 - 35) * 0.32), half = 3.68, ends = [(12 - 50) * 0.32, (88 - 50) * 0.32];
        const floors = [[0.72, 0.6, 0.45], [0.62, 0.42, 0.32], [0.82, 0.82, 0.8]], wall = [0.9, 0.86, 0.78];
        rowZ.forEach((z, r) => box(v, -14.5, 0, z - half + 0.05, 14.5, 0.06, z + half - 0.05, floors[r]));
        for (const [z, gap] of [[rowZ[0] + half, ends[1]], [rowZ[1] + half, ends[0]]]) {
          box(v, -14.5, 0, z - 0.15, gap - 1.4, 2.4, z + 0.15, wall);
          box(v, gap + 1.4, 0, z - 0.15, 14.5, 2.4, z + 0.15, wall);
        }
      } else if (p.theme !== "park") {
        // a game world: rocks, bushes and pillars in its colours, kept off the route
        const tint = (c, k) => c.map((x) => Math.min(1, x * k));
        for (let k = 0; k < 46; k++) {
          const x = -21 + rnd() * 42, z = -15 + rnd() * 30;
          if (pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3)) continue;
          const sz = 0.4 + rnd() * 0.9, h = 0.4 + rnd() * (k % 5 === 0 ? 3 : 1.2);
          box(v, x - sz, 0, z - sz, x + sz, h, z + sz, tint(k % 2 ? path : ground, 0.6 + rnd() * 0.6));
        }
      } else {
        box(v, -2.6, 0.01, 1.3, 2.6, 0.05, 3.4, [0.25, 0.45, 0.75]);                                        // the duck pond, beside its place
        for (let k = 0; k < 40; k++) {                                                                       // trees, kept off the route
          const x = -21 + rnd() * 42, z = -15 + rnd() * 30;
          if (pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3.2) || (x > -3.5 && x < 3.5 && z > 0.5 && z < 4.2)) continue;
          box(v, x - 0.2, 0, z - 0.2, x + 0.2, 1.6, z + 0.2, [0.45, 0.32, 0.2]);
          const s = 0.9 + rnd() * 0.7; box(v, x - s, 1.4, z - s, x + s, 1.4 + s * 1.6, z + s, [0.2 + rnd() * 0.1, 0.5 + rnd() * 0.15, 0.22]);
        }
      }
      // the path from place to place, and a plinth at each place
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i];
        if (i) { const [a, b] = pts[i - 1]; const w = 0.7; box(v, Math.min(a, x) - w, 0.02, Math.min(b, z) - w, Math.max(a, x) + w, 0.08, Math.max(b, z) + w, path); }
        box(v, x - 0.8, 0, z - 0.8, x + 0.8, 0.6, z + 0.8, [0.93, 0.93, 0.9]);
      }
      const data = new Float32Array(v);
      if (!world) world = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, world); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      worldN = data.length / 6;
      places = pts.map(([x, z], i) => ({ x, z, tex: texture(`${p.id}-${i}`, p.loci[i].emoji, `${i + 1}. ${p.loci[i].name}`) }));
    }

    // ---------- camera ----------
    function camAt(i) {
      const n = places.length, a = places[Math.max(0, Math.min(n - 1, i))], b = i > 0 ? places[i - 1] : places[1];
      let dx = a.x - b.x, dz = a.z - b.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (i === 0) { dx = -dx; dz = -dz; }
      return { eye: [a.x - dx * 4.6, 2.2, a.z - dz * 4.6], look: [a.x, 1.5, a.z] };
    }
    function lookAt(e, c) {
      let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map((v) => v / l);
      let x = [z[2], 0, -z[0]]; l = Math.hypot(...x); x = x.map((v) => v / l);
      const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
      const d = (a) => a[0] * e[0] + a[1] * e[1] + a[2] * e[2];
      return { m: [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x), -d(y), -d(z), 1], right: x, up: y };
    }
    function mul(a, b) { const o = []; for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      cur += (target - cur) * 0.08; if (Math.abs(target - cur) < 0.002) cur = target;
      const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      const sky = palace.colours ? [1, 3, 5].map((k) => parseInt(palace.colours[2].slice(k, k + 2), 16) / 255)
        : palace.theme === "house" ? [0.62, 0.78, 0.95] : [0.55, 0.78, 1.0];
      gl.clearColor(...sky, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
      const i0 = Math.floor(cur), f = cur - i0, A = camAt(i0), Bc = camAt(Math.min(places.length - 1, i0 + 1)), s = f * f * (3 - 2 * f);
      const eye = A.eye.map((v, k) => v + (Bc.eye[k] - v) * s), look = A.look.map((v, k) => v + (Bc.look[k] - v) * s);
      // looking around (drag): turn the view about the eye
      const dx = look[0] - eye[0], dz = look[2] - eye[2], c = Math.cos(yaw), sn = Math.sin(yaw);
      const turned = [eye[0] + dx * c - dz * sn, look[1] + pitch * 4, eye[2] + dx * sn + dz * c];
      const V = lookAt(eye, turned), fov = 1.0, f2 = 1 / Math.tan(fov / 2), asp = w / h, nr = 0.1, fr = 120, nf = 1 / (nr - fr);
      const mvp = mul([f2 / asp, 0, 0, 0, 0, f2, 0, 0, 0, 0, (fr + nr) * nf, -1, 0, 0, 2 * fr * nr * nf, 0], V.m);
      gl.useProgram(solid.p);
      gl.uniformMatrix4fv(solid.loc("uMVP"), false, mvp); gl.uniform3fv(solid.loc("uEye"), eye); gl.uniform3fv(solid.loc("uSky"), sky);
      gl.bindBuffer(gl.ARRAY_BUFFER, world);
      const ap = solid.loc("aPos"), ac = solid.loc("aCol");
      gl.enableVertexAttribArray(ap); gl.enableVertexAttribArray(ac);
      gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(ac, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, worldN);
      gl.disableVertexAttribArray(ap); gl.disableVertexAttribArray(ac);
      // pictures, far ones first so see-through edges blend
      gl.useProgram(sprite.p); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(sprite.loc("uMVP"), false, mvp); gl.uniform3fv(sprite.loc("uRight"), V.right); gl.uniform3fv(sprite.loc("uUp"), V.up);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const aq = sprite.loc("aCorner"); gl.enableVertexAttribArray(aq); gl.vertexAttribPointer(aq, 2, gl.FLOAT, false, 0, 0);
      const list = [];
      places.forEach((pl, i) => {
        list.push({ x: pl.x, y: 1.65, z: pl.z, size: 1.05, tex: pl.tex, alpha: 1 });
        if (items[i]) list.push({ x: pl.x, y: 3.1, z: pl.z, size: 0.85, tex: items[i], alpha: 1 });
      });
      list.sort((a, b) => Math.hypot(b.x - eye[0], b.z - eye[2]) - Math.hypot(a.x - eye[0], a.z - eye[2]));
      for (const s2 of list) {
        gl.bindTexture(gl.TEXTURE_2D, s2.tex);
        gl.uniform3fv(sprite.loc("uCenter"), [s2.x, s2.y, s2.z]); gl.uniform1f(sprite.loc("uSize"), s2.size); gl.uniform1f(sprite.loc("uAlpha"), s2.alpha);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.disableVertexAttribArray(aq); gl.disable(gl.BLEND);
    }

    // drag to look around; it springs back when you move on
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (drag) { yaw = drag[2] + (e.clientX - drag[0]) * 0.006; pitch = Math.max(-0.4, Math.min(0.4, drag[3] - (e.clientY - drag[1]) * 0.003)); } });
    canvas.addEventListener("pointerup", () => (drag = null));

    return {
      setPalace(p) { palace = p; items = []; build(p); cur = target = 0; yaw = pitch = 0; },
      go(i, jump = false) { target = i; yaw = pitch = 0; if (jump) cur = i; },
      // what is stored at a place, shown floating above it (null hides it)
      setItem(i, item) { items[i] = item ? texture(`item-${item.key || item.text}`, item.emoji || "", item.emoji ? "" : (item.key || item.text).slice(0, 18), "#ffe066") : null; },
      clearItems() { items = []; },
      start() { if (!running) { running = true; frame(); } },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  }
  return { create };
})();
window.PalaceScene3D = PalaceScene3D;
