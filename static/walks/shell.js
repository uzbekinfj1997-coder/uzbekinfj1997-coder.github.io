/* Walks: what every walk has in common, whatever the place. A place (static/<place>/game.js) brings its world, its people and its
   drawing; this file gives it the rest: walking like Counter-Strike, walk-the-route-for-me, click to go there, the list of
   destinations with a marker on the spot, the map window, the big map, real photos if it has any, the menus and the keys. */
"use strict";
const WalkShell = (() => {
  // ---------- the route: how far along it is any point, and any point how far along ----------
  function routeInfo(route) {
    const acc = [0];
    for (let i = 1; i < route.length; i++) acc.push(acc[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
    const total = acc[acc.length - 1];
    function at(d) {
      d = Math.max(0, Math.min(total, d));
      let i = 1; while (i < acc.length - 1 && acc[i] < d) i++;
      const t = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]), a = route[i - 1], b = route[i];
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) };
    }
    function nearest(x, z, from = 0, to = Infinity) {   // distance along the route of the closest point (optionally within a stretch)
      let best = Infinity, bestD = 0;
      for (let i = 1; i < route.length; i++) {
        if (acc[i] < from || acc[i - 1] > to) continue;
        const [ax, az] = route[i - 1], [bx, bz] = route[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
        if (d < best) { best = d; bestD = acc[i - 1] + t * Math.sqrt(L2); }
      }
      return { along: bestD, off: best };
    }
    return { total, at, nearest };
  }

  // ---------- what's on the screen: small maths for both renderers ----------
  function invert(m) {
    const a = m, b = new Array(16);
    b[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    b[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    b[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    b[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    b[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    b[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    b[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    b[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    b[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    b[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    b[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    b[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    b[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    b[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    b[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    b[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    const det = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
    return b.map((v) => v / (det || 1));
  }
  const mul4 = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
  // where a point of the world falls on the screen: x and y from -1 to 1, and w, which is negative behind you
  function project(m, q) {
    const w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15];
    return [(m[0] * q[0] + m[4] * q[1] + m[8] * q[2] + m[12]) / w, (m[1] * q[0] + m[5] * q[1] + m[9] * q[2] + m[13]) / w, w];
  }
  // what is under a point of the screen: the view enlarged so that this point fills a single pixel, with the distance written as a colour
  const PICK_RANGE = 8000;
  const PICK_VS = `attribute vec3 aPos; uniform mat4 uVP; uniform mat4 uModel; varying vec3 vP; void main() { vec4 p = uModel * vec4(aPos, 1.0); vP = p.xyz; gl_Position = uVP * p; }`;
  const ID4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const PICK_FS = `
precision highp float; varying vec3 vP; uniform vec3 uCam;
void main() { float d = length(vP - uCam) / ${PICK_RANGE}.0; vec4 e = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); gl_FragColor = e; }`;
  // gl, canvas; camVP(cam) gives the view; buffers() lists [buffer, vertices, bytes a vertex (48 if not given), where it's moved to (a matrix, if it is)],
  // position its first 3 floats
  function makePick(gl, canvas, camVP, buffers) {
    let fbo = null, prog = null, aPos, uVP, uCam, uModel;
    return (cam, nx, ny) => {
      if (!fbo) {
        const tex = gl.createTexture(), depthBuf = gl.createRenderbuffer();
        fbo = gl.createFramebuffer();
        gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuf); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, 1, 1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthBuf);
        const make = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, make(gl.VERTEX_SHADER, PICK_VS)); gl.attachShader(prog, make(gl.FRAGMENT_SHADER, PICK_FS)); gl.linkProgram(prog);
        aPos = gl.getAttribLocation(prog, "aPos"); uVP = gl.getUniformLocation(prog, "uVP"); uCam = gl.getUniformLocation(prog, "uCam"); uModel = gl.getUniformLocation(prog, "uModel");
      }
      const vp = camVP(cam), Z = 1024, inv = invert(vp), c = new Uint8Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, 1, 1);
      gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog); gl.enable(gl.CULL_FACE); gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.uniformMatrix4fv(uVP, false, mul4([Z, 0, 0, 0, 0, Z, 0, 0, 0, 0, 1, 0, -nx * Z, -ny * Z, 0, 1], vp)); gl.uniform3fv(uCam, cam.pos);
      gl.enableVertexAttribArray(aPos);
      for (const [buf, count, stride = 48, model = ID4] of buffers()) { gl.uniformMatrix4fv(uModel, false, model); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0); gl.drawArrays(gl.TRIANGLES, 0, count); }
      gl.disableVertexAttribArray(aPos);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      const d = c[0] / 255 + c[1] / 255 / 255 + c[2] / 255 / 65025 + c[3] / 255 / 16581375;
      if (d > 0.999) return null;     // only sky there; the clear colour reads as 1
      const w = inv[3] * nx + inv[7] * ny + inv[11] + inv[15], far = [0, 1, 2].map((i) => (inv[i] * nx + inv[i + 4] * ny + inv[i + 8] + inv[i + 12]) / w);
      const L = Math.hypot(far[0] - cam.pos[0], far[1] - cam.pos[1], far[2] - cam.pos[2]);
      return [0, 1, 2].map((i) => cam.pos[i] + ((far[i] - cam.pos[i]) / L) * d * PICK_RANGE);
    };
  }

  // ---------- settings that belong to you rather than to a place ----------
  const SHARED = ["sens", "invert", "speed", "map"], SHARED_KEY = "sora.settings.walks";
  function loadShared(id) {
    try { const K = `sora.settings.${id}`; localStorage.setItem(K, JSON.stringify({ ...JSON.parse(localStorage.getItem(K) || "{}"), ...JSON.parse(localStorage.getItem(SHARED_KEY) || "{}") })); } catch { /* unreadable: the place's own will do */ }
  }
  const saveShared = (S) => localStorage.setItem(SHARED_KEY, JSON.stringify(Object.fromEntries(SHARED.map((k) => [k, S[k]]))));

  // Each place on a list of destinations: where you land, what the marker points at, how high the point of its arrow is (tip), the
  // arrow's size, and the ring on the floor (radius r, under the thing unless given its own centre). You land facing the thing.
  // extra.see: how high the view should reach (a lamp or the top of a wardrobe, above an arrow pointing up at it)
  const place = (name, stand, thing, tip, size, r, extra = {}) => ({ name, x: stand[0], z: stand[1], tx: thing[0], tz: thing[1], tip, size, r, ...extra });

  // cfg: id, S (setting values), settings, renderer (pick, project), Mesh, paint { quad, cyl } to draw lit marks in this place's Mesh, eye (height),
  // pace, world { blocked, groundY }, route and marks, zoneName, update(dt), dyn(mesh, time), frame(cam, dyn, time), idle(), map, destinations,
  // photos, arrivalYaw(x, z), state(), menu { title, text, credit }, endText, markNear, ahead, turnInPlace,
  // use { key, hint, label, act(), icon } or a list of them: keys (and buttons on a touch screen) for using what you're looking at;
  // menu.buttons: [[label, act()]] more buttons in the menu
  // freeMouse: don't capture the mouse (drag to look); noMenu: no menu at the start (the place calls go() or goToPlace())
  // jump: Space jumps (the route is then walked for you with autoKey); duck: Z held ducks; world.groundY(x, z, y) is given where you are now, for a
  // place with floors one above another
  function start(cfg) {
    const root = $("walk"), canvas = $("walkCanvas"), hud = $("walkHud"), menu = $("walkMenu"), mapCanvas = $("walkMap"), mapWin = $("walkMapWin"), field = canvas.parentElement, photoBox = $("walkPhoto"), bigBox = $("walkBigMap"), gotoBox = $("walkGoto");
    const USES = cfg.use ? [].concat(cfg.use) : [];
    const AHEAD = cfg.ahead || 5;     // how far along the route walk-for-me aims: less indoors, where it would cut through the corners
    const REACH = cfg.ahead ? AHEAD * 2 : 25;     // and how far on it looks for where you are: indoors the way back from a room is close by
    const { S, renderer, world, zoneName } = cfg, PH = cfg.photos || [], STATIC = root.dataset.static, EYE = cfg.eye, OTHERS = JSON.parse(root.dataset.others || "[]");
    localStorage.setItem("sora.walks.last", root.dataset.place);
    const INK = { route: "#1f6fff", you: "#ff4f2e", mark: "#ff2a93", gate: "#14b45a" };
    const MAP_FONT = getComputedStyle(document.body).fontFamily;

    let R, routePts = [], marks = [];
    function setRoute(pts, places) { routePts = pts; R = routeInfo(pts); marks = places.map((p) => ({ ...p, along: R.nearest(p.x, p.z).along })).sort((a, b) => a.along - b.along); mapLayer = null; }
    let mapLayer = null;
    setRoute(cfg.route, cfg.marks);

    // ---------- you ----------
    const first = R.at(0);
    const me = { x: first.x, z: first.z, y: world.groundY(first.x, first.z), yaw: first.yaw, pitch: 0.06, bob: 0, auto: false, lookYaw: 0, air: 0, vy: 0, duck: 0 };
    const keys = new Set();
    let playing = false, last = performance.now(), time = 0, walked = 0, shownMark = null, toastT = 0, autoAlong = 0;

    function free(x, z) { const r = 0.3; return !world.blocked(x, z) && !world.blocked(x + r, z) && !world.blocked(x - r, z) && !world.blocked(x, z + r) && !world.blocked(x, z - r); }
    function move(dx, dz) {
      if (free(me.x + dx, me.z + dz)) { me.x += dx; me.z += dz; return true; }
      if (free(me.x + dx, me.z)) { me.x += dx; return true; }
      if (free(me.x, me.z + dz)) { me.z += dz; return true; }
      return false;
    }
    const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    // ---------- the loop ----------
    function step(dt) {
      time += dt;
      const pace = cfg.pace[S.speed] * (keys.has("shift") ? 1.8 : 1) * (1 - 0.45 * me.duck);     // slower ducked
      let fwd = (keys.has("w") || keys.has("arrowup") || touch.fwd ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") || touch.back ? 1 : 0);
      // as in Counter-Strike the left and right keys step sideways, and the mouse turns; Q and E turn without one
      const side = (keys.has("d") || keys.has("arrowright") || touch.right ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") || touch.left ? 1 : 0);
      if (keys.has("q")) me.yaw += 1.8 * dt;
      if (keys.has("e")) me.yaw -= 1.8 * dt;
      if (fwd || side) me.auto = false;
      const before = [me.x, me.z];
      if (me.auto) {
        // follows the route onward; the lookup is local, because Tawaf passes the same place more than once
        const n = R.nearest(me.x, me.z, autoAlong - AHEAD, autoAlong + REACH); autoAlong = Math.max(autoAlong, n.along);
        const target = R.at(autoAlong + AHEAD), want = Math.atan2(-(target.x - me.x), -(target.z - me.z));
        const turn = wrap(want - me.yaw);
        me.yaw += turn * Math.min(1, dt * 2.4);
        if (autoAlong >= R.total - Math.min(2, AHEAD * 1.5)) { me.auto = false; toast(cfg.endText || "The end of the walk"); }
        fwd = cfg.turnInPlace && Math.abs(turn) > 1.2 ? 0 : 1;     // indoors, where the way on is behind you, turn round before walking on
        me.lookYaw *= Math.max(0, 1 - dt * 0.6);
      } else me.lookYaw = 0;
      if (fwd || side) {
        const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
        const diag = Math.hypot(fwd, side);     // no faster on a diagonal
        const dx = ((fx * fwd + rx * side) / diag) * pace * dt, dz = ((fz * fwd + rz * side) / diag) * pace * dt;
        if (!move(dx, dz) && me.auto) { const t = R.at(autoAlong + AHEAD * 0.6), nx = me.x + (t.x - me.x) * 0.2, nz = me.z + (t.z - me.z) * 0.2; if (free(nx, nz)) { me.x = nx; me.z = nz; } else if (free(t.x, t.z)) { me.x = t.x; me.z = t.z; } }
        me.bob += dt * pace * 5.5;
      }
      walked += Math.hypot(me.x - before[0], me.z - before[1]);
      me.y = world.groundY(me.x, me.z, me.y);     // where a place has floors one above another (a stairwell), the one you're on
      if (me.vy || me.air) { me.vy -= 9.8 * dt; me.air += me.vy * dt; if (me.air <= 0) { me.air = 0; me.vy = 0; } }     // a jump, and coming down
      me.duck += ((cfg.duck && (keys.has("z") || touch.duck) ? 1 : 0) - me.duck) * Math.min(1, dt * 10);
      cfg.update(dt);
      const near = marks.find((m) => Math.hypot(m.x - me.x, m.z - me.z) < (cfg.markNear || 30));
      if (near && near !== shownMark) { shownMark = near; if (!target) toast(near.name); }
      toastT = Math.max(0, toastT - dt);
    }
    const camera = (bob = 0) => ({ pos: [me.x, me.y + me.air + EYE * (1 - 0.45 * me.duck) + bob, me.z], yaw: me.yaw + me.lookYaw, pitch: me.pitch, fov: (S.fov * Math.PI) / 180, far: Number(S.far) });
    function render() {
      const dyn = new cfg.Mesh(); cfg.dyn(dyn, time); drawTarget(dyn);
      const bob = Math.sin(me.bob) * 0.03;
      const cam = camera(bob);
      cfg.frame(cam, dyn, time);
      drawHud();
      drawBeacon(cam);
    }
    function loop(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (playing && !panelOpen()) step(dt);
      else if (playing) { time += dt; cfg.update(dt); }     // you stand still while choosing, and the world carries on
      else cfg.idle?.();
      render();
      requestAnimationFrame(loop);
    }

    // ---------- the HUD and the mini map ----------
    const hudCross = el("div", { class: "walk-cross" });
    const hudStreet = el("div", { class: "walk-street" }), hudNext = el("div", { class: "walk-next" }), hudToast = el("div", { class: "walk-toast" }), hudBar = el("div", { class: "walk-progress" }, el("i")), hudHint = el("div", { class: "walk-hint" }), hudPhoto = el("div", { class: "walk-photohint" });
    hud.replaceChildren(hudStreet, hudNext, hudBar, hudToast, hudHint, hudPhoto, hudCross);
    function toast(text) { hudToast.textContent = text; toastT = 4; }
    function nearestPhoto(x = me.x, z = me.z) { let best = null, bd = Infinity; for (const p of PH) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best ? { p: best, d: bd } : null; }
    function drawHud() {
      const along = me.auto ? autoAlong : R.nearest(me.x, me.z).along, next = marks.find((m) => m.along > along + 12);
      hudStreet.textContent = zoneName(me.x, me.z);
      hudNext.textContent = next ? `${next.name} · ${Math.round(next.along - along)} m` : "End of the walk";
      hudBar.firstChild.style.width = `${(along / R.total) * 100}%`;
      hudToast.style.opacity = toastT > 0 ? Math.min(1, toastT) : 0;
      const locked = document.pointerLockElement === canvas;
      hudCross.hidden = !(playing && locked);
      const how = locked ? "Click: go to the dot · Tab: free the mouse" : pointerFree() ? "Click a spot to go there · drag to look · Tab: mouse look" : "Click the view to look around";
      hudHint.textContent = !playing ? "" : `${how} · G: destinations${target ? " · X: clear marker" : ""} · M: big map · ${cfg.jump ? "Space: jump · " : ""}${cfg.duck ? "Z: duck · " : ""}${me.auto ? `W/S or ${AUTONAME} to take over` : `${AUTONAME}: walk the route`}${USES.map((u) => u.hint).filter(Boolean).map((h) => ` · ${h}`).join("")} · Esc: menu`;
      const np = nearestPhoto(); hudPhoto.textContent = playing && np && np.d < 30 ? `Real photo here · press P` : "";
      if (S.map && !mapWin.hidden && !mapState.min && bigBox.hidden) drawMap();     // not while the big map covers it
    }
    // ---------- drawing the map: the ground, drawn once for a zoom, then names and markers on top, which stay sharp ----------
    function paintBase(g, w, h, s, cx, cz, photos = false) {
      const P = (x, z) => [w / 2 + (x - cx) * s, h / 2 + (z - cz) * s];
      const trace = (o, closed = true) => { g.beginPath(); o.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); if (closed) g.closePath(); };
      const reach = 700 * s, seen = (o) => { const [a, b] = P(o[0][0], o[0][1]); return a > -reach && a < w + reach && b > -reach && b < h + reach; };
      g.lineJoin = "round"; g.lineCap = "round";
      cfg.map.paint({ g, P, trace, seen, s, w, h });
      // the route, with arrows showing the way it goes
      g.strokeStyle = "#fff"; g.lineWidth = 5; trace(routePts, false); g.stroke();
      g.strokeStyle = INK.route; g.lineWidth = 3; trace(routePts, false); g.stroke();
      let gone = 40; g.fillStyle = INK.route; g.strokeStyle = "#fff"; g.lineWidth = 1.5;
      for (let i = 1; i < routePts.length; i++) {
        const [a0, b0] = P(routePts[i - 1][0], routePts[i - 1][1]), [a1, b1] = P(routePts[i][0], routePts[i][1]), L = Math.hypot(a1 - a0, b1 - b0); if (!L) continue;
        gone += L;
        if (gone >= 90) { gone = 0; g.save(); g.translate((a0 + a1) / 2, (b0 + b1) / 2); g.rotate(Math.atan2(b1 - b0, a1 - a0)); g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -5.5); g.lineTo(-4, 5.5); g.closePath(); g.stroke(); g.fill(); g.restore(); }
      }
      if (photos) { g.fillStyle = "#ffd23f"; g.strokeStyle = "#000"; g.lineWidth = 1; for (const p of PH) { const [a, b] = P(p.x, p.z); g.beginPath(); g.arc(a, b, 3, 0, Math.PI * 2); g.fill(); g.stroke(); } }
    }
    // names go on top: places first, then gates, then areas, and one that would land on another waits until you zoom in
    let placedNames = [];
    function paintNames(g, w, h, s, cx, cz) {
      const P = (x, z) => [w / 2 + (x - cx) * s, h / 2 + (z - cz) * s], taken = [];
      g.textBaseline = "middle"; g.lineJoin = "round"; g.textAlign = "left";
      // what's already there: you, the north badge and the scale; t.hh is half its height (a name is 13 px tall)
      const [ya, yb] = P(me.x, me.z), keep = [{ x: ya - 14, y: yb, w: 28, hh: 11 }, { x: 4, y: 19, w: 30, hh: 13 }, { x: 6, y: h - 16, w: 110, hh: 10 }];
      const clear = (x0, y0, tw) => x0 >= 3 && x0 + tw <= w - 3 && y0 >= 8 && y0 <= h - 8 && ![...keep, ...taken].some((t) => x0 < t.x + t.w + 3 && t.x < x0 + tw + 3 && Math.abs(y0 - t.y) < 6.5 + t.hh);
      // beside what it names, or above or below it; a name that fits nowhere waits until you zoom in. Returns where it went
      const place = (name, a, r, b, tw) => {
        for (const [x0, y0] of [[a + r + 7, b], [a - r - 7 - tw, b], [a - tw / 2, b - r - 12], [a - tw / 2, b + r + 12]]) if (clear(x0, y0, tw)) { taken.push({ name, x: x0, y: y0, w: tw, hh: 6.5 }); return [x0, y0]; }
        return null;
      };
      const write = (name, x0, y0, light) => { x0 = Math.round(x0); y0 = Math.round(y0); g.lineWidth = 3.5; g.strokeStyle = light ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.9)"; g.fillStyle = light ? "#14181e" : "#fff"; g.strokeText(name, x0, y0); g.fillText(name, x0, y0); };
      const gates = cfg.map.gates.filter((q) => s >= q[3]);
      for (const [, x, z] of gates) {
        const [a, b] = P(x, z);
        g.fillStyle = INK.gate; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.rect(Math.round(a) - 3.5, Math.round(b) - 3.5, 7, 7); g.fill(); g.stroke();
        keep.push({ x: a - 4, y: b, w: 8, hh: 4 });
      }
      g.font = `600 12px ${MAP_FONT}`;
      for (const [name, x, z, r, from] of cfg.map.places) {
        if (s < from) continue;
        const [a, b] = P(x, z), tw = g.measureText(name).width, at = place(name, a, r * s, b, tw);
        if (at) write(name, at[0], at[1], cfg.map.light(cx + (at[0] + tw / 2 - w / 2) / s, cz + (at[1] - h / 2) / s));
      }
      for (const [name, x, z] of gates) {
        const [a, b] = P(x, z), tw = g.measureText(name).width, at = place(name, a, 3, b, tw);
        if (at) write(name, at[0], at[1], cfg.map.light(cx + (at[0] + tw / 2 - w / 2) / s, cz + (at[1] - h / 2) / s));
      }
      g.font = `500 11px ${MAP_FONT}`;
      for (const [name, x, z, from, to] of cfg.map.areas) {
        if (s < from || s > to) continue;
        const [a, b] = P(x, z), tw = g.measureText(name).width, x0 = a - tw / 2;
        if (!clear(x0, b, tw)) continue;
        taken.push({ name, x: x0, y: b, w: tw, hh: 6.5 });
        const light = cfg.map.light(x, z);
        g.lineWidth = 3; g.strokeStyle = light ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.75)"; g.fillStyle = light ? "rgba(30,36,44,.85)" : "rgba(255,255,255,.85)";
        g.strokeText(name, Math.round(x0), Math.round(b)); g.fillText(name, Math.round(x0), Math.round(b));
      }
      placedNames = taken;
    }
    function youAreHere(g, a, b) {
      g.save(); g.translate(a, b); g.rotate(-(me.yaw + me.lookYaw));
      const half = ((S.fov * Math.PI) / 180) / 2;     // what you can see from here
      g.fillStyle = "rgba(255,79,46,.24)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 36, -Math.PI / 2 - half, -Math.PI / 2 + half); g.closePath(); g.fill();
      g.fillStyle = INK.you; g.strokeStyle = "#fff"; g.lineWidth = 2; g.lineJoin = "round"; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.stroke(); g.fill();
      g.restore();
    }
    // the scale, and which way is north
    function mapFurniture(g, w, h, s) {
      const metres = [5, 10, 20, 50, 100, 200, 500, 1000].find((n) => n * s >= 45) || 1000, L = metres * s, x = 10, y = h - 12;
      g.lineCap = "butt"; g.strokeStyle = "rgba(0,0,0,.8)"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y); g.stroke();
      g.font = `600 11px ${MAP_FONT}`; g.textBaseline = "bottom"; g.textAlign = "left"; g.lineWidth = 3; g.lineJoin = "round"; g.strokeStyle = "rgba(0,0,0,.85)"; g.fillStyle = "#fff"; g.strokeText(`${metres} m`, x, y - 4); g.fillText(`${metres} m`, x, y - 4);
      g.fillStyle = "rgba(0,0,0,.72)"; g.beginPath(); g.arc(19, 19, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `700 11px ${MAP_FONT}`; g.fillText("N", 19, 22);
      g.beginPath(); g.moveTo(19, 9); g.lineTo(23, 15); g.lineTo(15, 15); g.closePath(); g.fillStyle = INK.you; g.fill();
      g.textAlign = "left";
    }

    // ---------- the map window: drag its title bar to move it, its corner to size it; it zooms and minimises, and a click goes there ----------
    const MAP_KEY = `sora.${cfg.id}.mapwin`, small = field.clientWidth < 600;
    const mapState = { x: null, y: 12, w: small ? 150 : 300, h: small ? 150 : 300, r: cfg.map.r, min: false };
    try { Object.assign(mapState, JSON.parse(localStorage.getItem(MAP_KEY) || "{}")); } catch { /* an unreadable save: the defaults will do */ }
    const clampTo = (v, lo, hi) => Math.max(lo, Math.min(Math.max(lo, hi), v));
    const saveMapWin = () => localStorage.setItem(MAP_KEY, JSON.stringify(mapState));
    const mapLeft = () => (mapState.x === null ? field.clientWidth - mapState.w - 12 : mapState.x);     // top right until you move it
    function placeMapWin() {
      const FW = field.clientWidth, FH = field.clientHeight, w = clampTo(mapState.w, 150, FW - 8), h = clampTo(mapState.h, 120, FH - 8);
      mapWin.classList.toggle("is-min", mapState.min);
      mapWin.style.width = `${w}px`; mapWin.style.height = mapState.min ? "auto" : `${h}px`;
      mapWin.style.left = `${clampTo(mapLeft(), 0, FW - w)}px`; mapWin.style.top = `${clampTo(mapState.y, 0, FH - mapWin.offsetHeight)}px`;
    }
    function drawMap() {
      const w = mapCanvas.clientWidth, h = mapCanvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2); if (!w || !h) return;
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr), s = Math.min(w, h) / (2 * mapState.r), g = mapCanvas.getContext("2d");
      if (mapCanvas.width !== cw || mapCanvas.height !== ch) { mapCanvas.width = cw; mapCanvas.height = ch; }
      // the district is drawn once on a sheet twice the size of the window, and the sheet slides under you until you near its edge
      if (!mapLayer || mapLayer.s !== s || mapLayer.w !== w || mapLayer.h !== h || Math.abs(me.x - mapLayer.x) * s > w / 2 || Math.abs(me.z - mapLayer.z) * s > h / 2) {
        const c = mapLayer?.c || document.createElement("canvas"); c.width = cw * 2; c.height = ch * 2;
        const lg = c.getContext("2d"); lg.scale(dpr, dpr); paintBase(lg, w * 2, h * 2, s, me.x, me.z);
        mapLayer = { c, s, w, h, x: me.x, z: me.z };
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // on whole device pixels, or the sheet goes soft as it slides
      const snap = (v) => Math.round(v * dpr) / dpr;
      g.drawImage(mapLayer.c, snap(-w / 2 + (mapLayer.x - me.x) * s), snap(-h / 2 + (mapLayer.z - me.z) * s), w * 2, h * 2);
      paintNames(g, w, h, s, me.x, me.z);
      mapTarget(g, (x, z) => [w / 2 + (x - me.x) * s, h / 2 + (z - me.z) * s], w, h, s);
      youAreHere(g, w / 2, h / 2);
      mapFurniture(g, w, h, s);
    }
    function zoomMapWin(f) { mapState.r = clampTo(mapState.r * f, 30, cfg.map.rMax); saveMapWin(); }
    function minimiseMapWin(on = !mapState.min) { mapState.min = on; $("walkMapMin").textContent = on ? "▢" : "▁"; $("walkMapMin").title = on ? "Restore the map (N)" : "Minimise the map (N)"; $("walkMapMin").setAttribute("aria-label", $("walkMapMin").title); placeMapWin(); saveMapWin(); }
    function dragging(handle, onMove) {
      handle.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button")) return;
        e.preventDefault(); handle.setPointerCapture(e.pointerId);
        const x0 = e.clientX, y0 = e.clientY, start = { x: clampTo(mapLeft(), 0, field.clientWidth - mapState.w), y: mapState.y, w: mapWin.offsetWidth, h: mapWin.offsetHeight };
        mapState.x = start.x;
        const moved = (ev) => { onMove(ev.clientX - x0, ev.clientY - y0, start); placeMapWin(); };
        const done = () => { handle.removeEventListener("pointermove", moved); handle.removeEventListener("pointerup", done); handle.removeEventListener("pointercancel", done); saveMapWin(); };
        handle.addEventListener("pointermove", moved); handle.addEventListener("pointerup", done); handle.addEventListener("pointercancel", done);
      });
    }
    dragging($("walkMapHead"), (dx, dy, st) => { mapState.x = clampTo(st.x + dx, 0, field.clientWidth - st.w); mapState.y = clampTo(st.y + dy, 0, field.clientHeight - mapWin.offsetHeight); });
    dragging($("walkMapGrip"), (dx, dy, st) => { mapState.w = clampTo(st.w + dx, 150, field.clientWidth - st.x); mapState.h = clampTo(st.h + dy, 120, field.clientHeight - st.y); });
    $("walkMapIn").onclick = () => zoomMapWin(0.75);
    $("walkMapOut").onclick = () => zoomMapWin(1 / 0.75);
    $("walkMapMin").onclick = () => minimiseMapWin();
    $("walkMapBig").onclick = () => openBigMap();
    mapCanvas.addEventListener("wheel", (e) => { e.preventDefault(); zoomMapWin(e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    mapCanvas.addEventListener("click", (e) => {
      const r = mapCanvas.getBoundingClientRect(), s = Math.min(r.width, r.height) / (2 * mapState.r), x = me.x + (e.clientX - r.left - r.width / 2) / s, z = me.z + (e.clientY - r.top - r.height / 2) / s;
      land(x, z, arrivalYaw(x, z));
      if (!playing) go(false);
    });
    new ResizeObserver(placeMapWin).observe(field);

    // ---------- real photographs ----------
    let photoAt = -1;
    function showPhoto(i) {
      if (!PH.length) return;
      photoAt = (i + PH.length) % PH.length; const p = PH[photoAt];
      photoBox.hidden = false; if (document.pointerLockElement) document.exitPointerLock();
      photoBox.replaceChildren(el("div", { class: "walk-photoframe" },
        el("img", { src: `${STATIC}photos/${p.file}`, alt: p.title }),
        el("div", { class: "walk-photocap" }, el("b", {}, p.title), el("small", {}, `${p.credit} · ${photoAt + 1} of ${PH.length}`)),
        el("div", { class: "row" }, btn("← Previous", () => showPhoto(photoAt - 1)), btn("Next →", () => showPhoto(photoAt + 1)), btn("Walk from here", () => { closePhoto(); teleport(p.x, p.z, p.yaw); go(false); }), btn("Back to the walk", () => { closePhoto(); resume(); }, true))));
    }
    function closePhoto() { photoBox.hidden = true; photoAt = -1; }
    function teleport(x, z, yaw) {
      // land on the nearest open ground (a click on a big block can be a long way from its edge)
      let found = false;
      for (let r = 0; r < 320 && !found; r += r < 40 ? 1 : 3) {
        const n = Math.max(1, Math.ceil(r * 1.5));
        for (let i = 0; i < n && !found; i++) { const a = (i / n) * Math.PI * 2, X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (free(X, Z)) { me.x = X; me.z = Z; me.y = world.groundY(X, Z); found = true; } }
      }
      me.yaw = yaw; me.pitch = 0.04; autoAlong = R.nearest(me.x, me.z).along;
      return found;
    }

    // ---------- going somewhere at once: click a spot in the view, or anywhere on the big map ----------
    function land(x, z, yaw) {
      me.auto = false; me.lookYaw = 0;
      const ok = teleport(x, z, yaw);
      toast(ok ? zoneName(me.x, me.z) : "There's no room to stand there");
      return ok;
    }
    // nx, ny: the point on the screen, -1 to 1 from the bottom left
    function goToView(nx = 0, ny = 0) {
      const cam = camera(), hit = renderer.pick(cam, nx, ny);
      if (!hit) { toast("Aim at the ground or a building"); return false; }
      const L = Math.hypot(cam.pos[0] - hit[0], cam.pos[2] - hit[2]) || 1, ux = (cam.pos[0] - hit[0]) / L, uz = (cam.pos[2] - hit[2]) / L;
      // on a wall or a tower you land at its foot, on your side of it, a step away
      let d = 0;
      while (d < L && !free(hit[0] + ux * d, hit[2] + uz * d)) d += 0.4;
      if (d >= L) { toast("There's no room to stand there"); return false; }
      if (d > 0) d = Math.min(L, d + 1.2);
      return land(hit[0] + ux * d, hit[2] + uz * d, cam.yaw);
    }

    const bigCanvas = el("canvas", { class: "walk-bigcanvas", "aria-label": "Map of the district: click a place to go there" }), bigInfo = el("div", { class: "walk-biginfo" });
    const NO_HOVER = matchMedia("(pointer: coarse)").matches ? `Tap anywhere to go there. + and − zoom, drag to move the map.${PH.length ? " Yellow dots are real photos." : ""}` : `Click anywhere to go there. Scroll to zoom, drag to move the map.${PH.length ? " Yellow dots are real photos." : ""}`;
    const bigView = { ...cfg.map.view };
    bigBox.replaceChildren(
      el("div", { class: "walk-bighead" }, el("b", {}, "Go anywhere"), el("div", { class: "row" }, btn("+", () => zoomBig(0.7)), btn("−", () => zoomBig(1.4)), btn("Close", () => closeBigMap()))),
      bigCanvas, bigInfo);
    const bigScale = () => Math.min(bigCanvas.clientWidth, bigCanvas.clientHeight) / (2 * bigView.r);
    const toMap = (x, z) => [bigCanvas.clientWidth / 2 + (x - bigView.x) * bigScale(), bigCanvas.clientHeight / 2 + (z - bigView.z) * bigScale()];
    const fromMap = (px, py) => [bigView.x + (px - bigCanvas.clientWidth / 2) / bigScale(), bigView.z + (py - bigCanvas.clientHeight / 2) / bigScale()];
    function drawBigMap() {
      const w = bigCanvas.clientWidth, h = bigCanvas.clientHeight, dpr = window.devicePixelRatio || 1, g = bigCanvas.getContext("2d");
      bigCanvas.width = Math.round(w * dpr); bigCanvas.height = Math.round(h * dpr); g.scale(dpr, dpr);
      paintBase(g, w, h, bigScale(), bigView.x, bigView.z, true);
      paintNames(g, w, h, bigScale(), bigView.x, bigView.z);
      mapTarget(g, toMap, w, h, bigScale());
      youAreHere(g, ...toMap(me.x, me.z));
      mapFurniture(g, w, h, bigScale());
    }
    const keepInReach = (x, z) => { const q = cfg.map.reach; bigView.x = Math.max(q[0], Math.min(q[2], x)); bigView.z = Math.max(q[1], Math.min(q[3], z)); };
    function zoomBig(f, px = bigCanvas.clientWidth / 2, py = bigCanvas.clientHeight / 2) {
      const [x, z] = fromMap(px, py);
      bigView.r = Math.max(30, Math.min(cfg.map.rMax, bigView.r * f));
      const [x2, z2] = fromMap(px, py);
      keepInReach(bigView.x + x - x2, bigView.z + z - z2);
      drawBigMap();
    }
    function openBigMap() {
      photoBox.hidden = true; gotoBox.hidden = true; bigBox.hidden = false; keys.clear(); bigInfo.textContent = NO_HOVER;
      if (document.pointerLockElement) document.exitPointerLock();
      drawBigMap();
    }
    function closeBigMap() { bigBox.hidden = true; resume(); }
    // the way you were looking, unless the place has a better idea (the courtyard faces you to the Kaaba)
    const arrivalYaw = (x, z) => cfg.arrivalYaw?.(x, z) ?? me.yaw + me.lookYaw;
    function goToMap(x, z) {
      bigBox.hidden = true;
      const ok = land(x, z, arrivalYaw(x, z));
      if (playing) resume(); else go(false);
      return ok;
    }

    // ---------- 'Go to': a list of destinations, to be there at once, with a marker on the spot ----------
    gotoBox.replaceChildren(el("div", { class: "walk-gotohead" }, el("b", {}, "Go to"), btn("Close", () => closeGoto())),
      ...cfg.destinations.flatMap(([group, places]) => [el("small", {}, group), ...places.map((d) => el("button", { type: "button", class: "walk-gotoitem", onclick: () => goToPlace(d) }, d.name))]),
      ...(OTHERS.length ? [el("small", {}, "Another walk"), ...OTHERS.map((p) => el("button", { type: "button", class: "walk-gotoitem", onclick: () => { location.href = p.url; } }, p.name))] : []));
    function openGoto() {
      bigBox.hidden = true; closePhoto(); gotoBox.hidden = false; keys.clear();
      if (document.pointerLockElement) document.exitPointerLock();
      gotoBox.querySelector(".walk-gotoitem").focus();
    }
    function closeGoto() { gotoBox.hidden = true; resume(); }
    function goToPlace(d) {
      gotoBox.hidden = true;
      land(d.x, d.z, 0);
      target = d;
      // face it, from wherever you landed, with the arrow and the near side of the ring both in view
      const far = Math.max(1, Math.hypot(me.x - d.tx, me.z - d.tz)), half = (S.fov * Math.PI) / 360 - 0.06;
      const up = Math.atan2(Math.max(arrowTop(d), d.see || 0) - EYE, far), down = Math.atan2(-EYE, Math.max(1.5, Math.hypot(me.x - ringOf(d)[0], me.z - ringOf(d)[1]) - d.r));
      me.yaw = Math.atan2(me.x - d.tx, me.z - d.tz);
      me.pitch = Math.max(up - half, Math.min((up + down) / 2, down + half));
      toastT = 0;     // the marker's label says where this is; a banner would only cover it
      if (playing) resume(); else go(false);
    }

    // ---------- the marker for a place chosen from the list: a ring and an arrow in the world, a label on the screen, a mark on the map ----------
    let target = null;
    const ringOf = (d) => d.ring || [d.tx, d.tz];
    const arrowLen = (d) => 2.4 * d.size;
    const arrowTop = (d) => (d.up ? d.tip : d.tip + arrowLen(d) + 0.25 * d.size);
    const MARK = [1, 0.1, 0.52], paint = cfg.paint;
    // a flat ring, visible from both sides
    function floorRing(m, x, y, z, r0, r1, seg = 56) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, P = (a, r) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
        paint.quad(m, P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1), MARK);
        paint.quad(m, P(a0, r0), P(a0, r1), P(a1, r1), P(a1, r0), MARK);
      }
    }
    function drawTarget(m) {
      if (!target) return;
      const d = target, [rx, rz] = ringOf(d), y = world.groundY(rx, rz) + 0.14, wide = Math.max(0.08, Math.min(0.6, d.r * 0.09)), pulse = (time * 0.55) % 1;
      floorRing(m, rx, y, rz, d.r, d.r - wide);
      floorRing(m, rx, y, rz, d.r * (0.45 + 0.5 * pulse), d.r * (0.45 + 0.5 * pulse) - wide * 0.55 * (1 - pulse) - 0.02);     // a wave running out to the ring
      const L = arrowLen(d), head = 0.95 * d.size, wid = 0.5 * d.size, shaft = 0.17 * d.size, g = world.groundY(d.tx, d.tz);
      const bob = (0.5 + 0.5 * Math.sin(time * 3.4)) * 0.28 * d.size, x = d.tx, z = d.tz;
      if (d.up) {
        const tip = g + d.tip - bob;
        paint.cyl(m, x, tip - head, z, wid, tip, 0.005, MARK, 16); paint.cyl(m, x, tip - L, z, shaft, tip - head, shaft, MARK, 10);
        floorRing(m, x, tip - head, z, wid, 0.005, 16); floorRing(m, x, tip - L, z, shaft, 0.005, 10);
      } else {
        const tip = g + d.tip + bob;
        paint.cyl(m, x, tip, z, 0.005, tip + head, wid, MARK, 16); paint.cyl(m, x, tip + head, z, shaft, tip + L, shaft, MARK, 10);
        floorRing(m, x, tip + head, z, wid, 0.005, 16); floorRing(m, x, tip + L, z, shaft, 0.005, 10);
      }
    }
    const beacon = $("walkBeacon"), beaconArrow = el("i", {}, "▶"), beaconText = el("span"), beaconX = el("button", { type: "button", "aria-label": "Clear the marker", title: "Clear the marker (X)", onclick: () => setTarget(null) }, "✕");
    beacon.replaceChildren(beaconArrow, beaconText, beaconX);
    function setTarget(d) { target = d; if (!d) beacon.hidden = true; }
    function drawBeacon(cam) {
      if (!target) return;
      const d = target, FW = canvas.clientWidth, FH = canvas.clientHeight;
      beacon.hidden = false;
      beaconText.textContent = `${d.name} · ${Math.round(Math.hypot(me.x - d.tx, me.z - d.tz))} m`;
      let [nx, ny, w] = renderer.project(cam, [d.tx, world.groundY(d.tx, d.tz) + arrowTop(d) + 0.3 * d.size, d.tz]);
      const inView = w > 0 && Math.abs(nx) < 0.97 && Math.abs(ny) < 0.97, BW = beacon.offsetWidth, BH = beacon.offsetHeight;
      let px, py;
      if (inView) { px = ((nx + 1) / 2) * FW - BW / 2; py = ((1 - ny) / 2) * FH - BH - 9; }
      else {
        if (w <= 0) { nx = -nx; ny = -ny; }     // behind you: the projection comes out mirrored
        const k = 1 / Math.max(Math.abs(nx), Math.abs(ny), 1e-6);
        px = ((nx * k + 1) / 2) * FW - BW / 2; py = ((1 - ny * k) / 2) * FH - BH / 2;
        beaconArrow.style.transform = `rotate(${Math.atan2(-ny, nx)}rad)`;
      }
      beacon.classList.toggle("is-off", !inView);
      beacon.style.transform = `translate(${Math.round(clampTo(px, 6, FW - BW - 6))}px, ${Math.round(clampTo(py, 6, FH - BH - 12))}px)`;
    }
    // on a map: a line from you, and the ring; or an arrowhead on the edge if it's beyond the map
    function mapTarget(g, P, w, h, s) {
      if (!target) return;
      const d = target, [a, b] = P(d.tx, d.tz), [ya, yb] = P(me.x, me.z), [ra, rb] = P(...ringOf(d));
      g.lineCap = "butt";
      const seen = a >= 8 && a <= w - 8 && b >= 8 && b <= h - 8, k = seen ? 1 : Math.min(...[a > w - 8 ? (w - 8 - ya) / (a - ya) : a < 8 ? (8 - ya) / (a - ya) : 1, b > h - 8 ? (h - 8 - yb) / (b - yb) : b < 8 ? (8 - yb) / (b - yb) : 1]);
      const ea = ya + (a - ya) * k, eb = yb + (b - yb) * k;
      g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = INK.mark; g.beginPath(); g.moveTo(ya, yb); g.lineTo(ea, eb); g.stroke(); g.setLineDash([]);
      if (seen) {
        g.lineWidth = 2.5; g.strokeStyle = "#fff"; g.beginPath(); g.arc(ra, rb, Math.max(7, d.r * s), 0, Math.PI * 2); g.stroke();
        g.lineWidth = 2; g.strokeStyle = INK.mark; g.beginPath(); g.arc(ra, rb, Math.max(7, d.r * s), 0, Math.PI * 2); g.stroke();
        g.fillStyle = INK.mark; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(a, b, 3.5, 0, Math.PI * 2); g.fill(); g.stroke();
      } else {
        g.save(); g.translate(ea, eb); g.rotate(Math.atan2(b - yb, a - ya)); g.fillStyle = INK.mark; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.lineJoin = "round"; g.beginPath(); g.moveTo(7, 0); g.lineTo(-6, -6); g.lineTo(-6, 6); g.closePath(); g.stroke(); g.fill(); g.restore();
      }
    }
    const mapPoint = (e) => { const r = bigCanvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let bigDrag = null;
    bigCanvas.addEventListener("wheel", (e) => { e.preventDefault(); zoomBig(e.deltaY > 0 ? 1.2 : 1 / 1.2, ...mapPoint(e)); }, { passive: false });
    bigCanvas.addEventListener("pointerdown", (e) => { bigDrag = { x: e.clientX, y: e.clientY, moved: false }; });
    bigCanvas.addEventListener("pointermove", (e) => {
      if (bigDrag && Math.hypot(e.clientX - bigDrag.x, e.clientY - bigDrag.y) > (bigDrag.moved ? 0 : 6)) {
        keepInReach(bigView.x - (e.clientX - bigDrag.x) / bigScale(), bigView.z - (e.clientY - bigDrag.y) / bigScale());
        bigDrag = { x: e.clientX, y: e.clientY, moved: true }; drawBigMap();
      }
      const [x, z] = fromMap(...mapPoint(e));
      bigInfo.textContent = `${zoneName(x, z)}${free(x, z) ? "" : " · a building: you'd land beside it"}`;
    });
    bigCanvas.addEventListener("pointerleave", () => { bigInfo.textContent = NO_HOVER; });
    bigCanvas.addEventListener("click", (e) => { if (bigDrag && bigDrag.moved) return; goToMap(...fromMap(...mapPoint(e))); });
    addEventListener("pointerup", () => { setTimeout(() => (bigDrag = null)); });
    new ResizeObserver(() => { if (!bigBox.hidden) drawBigMap(); }).observe(bigCanvas);

    // ---------- menus ----------
    function showMenu(first) {
      menu.hidden = false;
      menu.replaceChildren(el("div", { class: "walk-menu" },
        el("h2", {}, cfg.menu.title),
        el("p", {}, `${cfg.menu.text} About ${(R.total / 1000).toFixed(1)} km, ${Math.round(R.total / cfg.pace.normal / 60)} minutes at a walking pace.`),
        el("div", { class: "row" }, btn(first ? "Start: walk the route" : "Walk the route for me", () => { if (first) autoAlong = 0; else autoAlong = R.nearest(me.x, me.z).along; go(true); }, true), btn(first ? "Explore on my own" : "Carry on", () => go(false)), btn("Go to…", openGoto), btn("Big map", openBigMap),
          PH.length ? btn("Real photos", () => showPhoto(Math.max(0, PH.indexOf(nearestPhoto()?.p)))) : "",
          first ? "" : btn("Back to the start", () => { const q = R.at(0); teleport(q.x, q.z, q.yaw); autoAlong = 0; walked = 0; shownMark = null; setTarget(null); go(true); }),
          OTHERS.length ? btn("Change walk", () => { location.href = root.dataset.home; }) : "",
          ...(cfg.menu.buttons || []).map(([label, act]) => btn(label, act))),
        el("div", { class: "walk-keys" }, ...[["W A S D / arrows", "walk, and step left and right"], ["Mouse", "turn and look (click the view first)"], ["Q E", "turn without the mouse"], ["Shift", "walk faster"], ...(cfg.jump ? [["Space", "jump"]] : []), ...(cfg.duck ? [["Z", "duck (hold it down)"]] : []), [AUTONAME, "walk the route for me / stop"], ["G", "a list of destinations: be there at once, with a marker on the spot"], ["X", "clear the marker"], ["Click", "go to the spot under the white dot"], ["M", "the big map: click anywhere to go there"], ["Tab", "free the mouse: click spots, move and size the map window"], ["N, + and −", "minimise the map window, zoom it"], ...(PH.length ? [["P", "see the real photo nearest to you"]] : []), ...USES.map((u) => [u.key.toUpperCase(), u.label]), ["Esc", "this menu"], ["Touch", "drag to look, tap a spot to go there, arrows to walk"]].flatMap(([k, v]) => [el("kbd", {}, k), el("span", {}, v)])),
        el("p", { class: "walk-credit" }, cfg.menu.credit)));
    }
    function btn(label, onclick, primary = false) { return el("button", { type: "button", class: primary ? "primary" : "", onclick }, label); }
    let lockFailed = false;
    // the browser can report one huge movement as it captures the mouse, sometimes a good while after, which would throw the view off
    // whatever you just chose: nothing counts until the capture has settled, big jumps don't for a second more or if they're the first
    // movement since, and an absurd one never does
    let settledAt = 0, calmAt = 0, firstMove = false;
    function lock() { if (touchDevice || document.pointerLockElement === canvas) return; settledAt = calmAt = Infinity; const p = canvas.requestPointerLock?.(); p?.catch?.(() => { lockFailed = true; settledAt = calmAt = 0; }); }
    document.addEventListener("pointerlockerror", () => { lockFailed = true; settledAt = calmAt = 0; });
    // Tab frees the mouse while you keep walking, to click spots and handle the map window; Tab again goes back to looking around with it
    let cursorFree = false;
    const pointerFree = () => cursorFree || lockFailed || touchDevice;
    const panelOpen = () => !bigBox.hidden || !photoBox.hidden || !gotoBox.hidden;
    function resume() { if (playing && !cursorFree) lock(); }
    function freeCursor(on = !cursorFree) { cursorFree = on; if (!on) lock(); else if (document.pointerLockElement) document.exitPointerLock(); }
    // cfg.freeMouse: the mouse stays free (drag to look around), for a place with its own panel to click; Tab still captures it
    function go(auto) { menu.hidden = true; playing = true; me.auto = auto; last = performance.now(); cursorFree = !!cfg.freeMouse; if (!cursorFree) lock(); }
    function pause() { playing = false; keys.clear(); bigBox.hidden = true; gotoBox.hidden = true; if (document.pointerLockElement) document.exitPointerLock(); showMenu(false); }

    // ---------- input ----------
    const touchDevice = matchMedia("(pointer: coarse)").matches;
    const touch = { fwd: false, back: false, left: false, right: false, duck: false };
    const AUTOKEY = cfg.autoKey || " ", AUTONAME = AUTOKEY === " " ? "Space" : AUTOKEY.toUpperCase();
    function jump() { if (!me.air && !me.vy && me.duck < 0.5) me.vy = 3.3; }     // about half a metre up; not from a crouch
    addEventListener("keydown", (e) => {
      if (e.target.closest?.("input, select, textarea")) return;
      const k = e.key.toLowerCase();
      if (!bigBox.hidden) { if (k === "escape" || k === "m") { closeBigMap(); e.preventDefault(); } return; }
      if (!gotoBox.hidden) {
        if (k === "escape" || k === "g") { closeGoto(); e.preventDefault(); }
        if (k === "arrowdown" || k === "arrowup") {
          const items = [...gotoBox.querySelectorAll(".walk-gotoitem")], at = items.indexOf(document.activeElement);
          items[(at + (k === "arrowdown" ? 1 : items.length - 1)) % items.length].focus(); e.preventDefault();
        }
        return;
      }
      if (!photoBox.hidden) {
        if (k === "escape" || k === "p") closePhoto(); else if (k === "arrowright") showPhoto(photoAt + 1); else if (k === "arrowleft") showPhoto(photoAt - 1);
        e.preventDefault(); return;
      }
      if (!playing) return;
      if (k === "escape") return pause();
      if (cfg.jump && k === " ") { jump(); e.preventDefault(); return; }
      if (k === AUTOKEY) { me.auto = !me.auto; if (me.auto) autoAlong = R.nearest(me.x, me.z).along; e.preventDefault(); return; }
      if (k === "m") { openBigMap(); e.preventDefault(); return; }
      if (k === "g") { openGoto(); e.preventDefault(); return; }
      if (k === "x" && target) { setTarget(null); e.preventDefault(); return; }
      if (k === "tab") { freeCursor(); e.preventDefault(); return; }
      if (k === "n") { minimiseMapWin(); e.preventDefault(); return; }
      if (k === "+" || k === "=") { zoomMapWin(0.75); e.preventDefault(); return; }
      if (k === "-" || k === "_") { zoomMapWin(1 / 0.75); e.preventDefault(); return; }
      if (k === "p" && PH.length) { const n = nearestPhoto(); if (n) showPhoto(PH.indexOf(n.p)); e.preventDefault(); return; }
      { const u = USES.find((q) => q.key === k); if (u) { u.act(); e.preventDefault(); return; } }
      if (["w", "a", "s", "d", "q", "e", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright", ...(cfg.duck ? ["z"] : [])].includes(k)) { keys.add(k); e.preventDefault(); }
    });
    addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    let hadLock = false;
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === canvas) {
        hadLock = true; lockFailed = false; settledAt = performance.now() + 200; calmAt = performance.now() + 1000; firstMove = true;
        if (panelOpen() || cursorFree) document.exitPointerLock();     // it was asked for before a panel opened: panels need the pointer
        return;
      }
      if (hadLock && playing && !touchDevice && !panelOpen() && !cursorFree && settledAt !== Infinity) { hadLock = false; pause(); }
    });
    function turn(dx, dy) {
      const k = S.sens * 0.0006;
      if (me.auto) me.lookYaw = Math.max(-2.6, Math.min(2.6, me.lookYaw - dx * k)); else me.yaw -= dx * k;
      me.pitch = Math.max(-1.2, Math.min(1.35, me.pitch - dy * k * (S.invert ? -1 : 1)));
    }
    canvas.addEventListener("mousemove", (e) => {
      if (!playing || document.pointerLockElement !== canvas) return;
      const now = performance.now(), jump = Math.max(Math.abs(e.movementX), Math.abs(e.movementY)), first = firstMove;
      if (jump) firstMove = false;
      if (now < settledAt || jump > (first || now < calmAt ? 150 : 500)) return;
      turn(e.movementX, e.movementY);
    });
    canvas.addEventListener("click", (e) => {
      if (!playing) return;
      if (!gotoBox.hidden) return closeGoto();
      if (dragMoved) { dragMoved = false; return; }                            // that was a drag to look around
      if (document.pointerLockElement === canvas) return void goToView();     // the dot in the middle of the view
      // the mouse isn't looking around (Tab, a tap, or pointer lock refused): the spot clicked; otherwise this click only starts the mouse look
      if (pointerFree()) { const r = canvas.getBoundingClientRect(); goToView(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2); }
      if (!cursorFree) lock();
    });
    let drag = null, dragDist = 0, dragMoved = false;
    canvas.addEventListener("pointerdown", (e) => { dragMoved = false; dragDist = 0; if (e.pointerType !== "mouse" || (playing && pointerFree())) drag = [e.clientX, e.clientY]; });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag || !playing) return;
      dragDist += Math.abs(e.clientX - drag[0]) + Math.abs(e.clientY - drag[1]);
      if (dragDist > 6) { dragMoved = true; turn((e.clientX - drag[0]) * 3, (e.clientY - drag[1]) * 3); }
      drag = [e.clientX, e.clientY];
    });
    addEventListener("pointerup", () => (drag = null));
    for (const [id, key] of [["walkFwd", "fwd"], ["walkBack", "back"], ["walkLeft", "left"], ["walkRight", "right"]]) {
      const b = $(id);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); touch[key] = true; me.auto = false; });
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => (touch[key] = false));
    }
    $("walkAuto").onclick = () => { me.auto = !me.auto; if (me.auto) autoAlong = R.nearest(me.x, me.z).along; };
    $("walkMenuBtn").onclick = () => pause();
    $("walkChangeBtn").onclick = () => { location.href = root.dataset.home; };
    $("walkChangeBtn").hidden = !OTHERS.length;
    $("walkMapBtn").onclick = openBigMap;
    $("walkGoBtn").onclick = () => (gotoBox.hidden ? openGoto() : closeGoto());
    $("walkPhotoBtn").onclick = () => { const n = nearestPhoto(); showPhoto(n ? PH.indexOf(n.p) : 0); };
    $("walkPhotoBtn").hidden = !PH.length;
    setupFullscreen(root);
    mapWin.hidden = !S.map;
    minimiseMapWin(mapState.min);


    function settingChanged() { mapWin.hidden = !S.map; saveShared(S); }

    if (cfg.jump) document.querySelector(".walk-touch")?.append(el("button", { type: "button", id: "walkJump", "aria-label": "Jump", onclick: () => jump() }, "⤒"));
    if (cfg.duck) document.querySelector(".walk-touch")?.append(el("button", { type: "button", id: "walkDuck", "aria-label": "Duck or stand up", onclick: (e) => { touch.duck = !touch.duck; e.currentTarget.classList.toggle("on", touch.duck); } }, "⤓"));
    USES.forEach((u, i) => {     // and a button for each among the arrows on a touch screen
      const b = el("button", { type: "button", id: i ? `walkUse${i + 1}` : "walkUse", "aria-label": u.label, onclick: () => u.act() }, u.icon || "✋");
      document.querySelector(".walk-touch")?.append(b);
    });
    const mapChanged = () => { mapLayer = null; };     // what the map shows has moved: draw it again
    const api = { me, toast, get route() { return R; }, routePoints: () => routePts, world, get marks() { return marks; }, settings: cfg.settings, renderer, camera, go, pause, step, render, zoneName: cfg.zoneName, teleport, showPhoto, nearestPhoto, goToView, goToMap, openBigMap, closeBigMap, toMap, get mapNames() { return placedNames; }, openGoto, closeGoto, freeCursor, destinations: cfg.destinations, goToPlace, setTarget, get target() { return target; }, project: (q) => renderer.project(camera(), q), arrowTop, mapState, setRoute, settingChanged, mapChanged, state: () => ({ cursorFree, lockFailed, playing, walked, autoAlong, ...cfg.state?.() }) };
    window.Walk = api;   // for tests, and for the place itself
    if (cfg.noMenu) menu.hidden = true; else showMenu(true);     // noMenu: the place starts the walk itself
    requestAnimationFrame(loop);
    return api;
  }
  return { routeInfo, invert, project, makePick, place, loadShared, start };
})();
window.WalkShell = WalkShell;
