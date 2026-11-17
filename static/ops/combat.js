/* Memory Ops: fighting. Weapons (rifle with a spray pattern, pistol, knife), hits on heads and bodies, armour,
   and bots that find their way to the nearest player they know about and shoot when they see one.
   Pure functions on a block world (world.js); no drawing. */
"use strict";
const OpsCombat = (() => {
  const { raycast, stepPlayer, body, eyeOf } = BlockCraft;
  const FLOOR = OpsMaps.FLOOR;

  function rng(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- finding a way on the grid of cells a body can stand in ----------
  function findPath(grid, N, from, to) {
    const [sx, sz] = from.map(Math.floor), [tx, tz] = to.map(Math.floor);
    if (!grid[tx * N + tz] || !grid[sx * N + sz]) return [];
    const prev = new Int32Array(N * N).fill(-1), queue = [sx * N + sz], start = sx * N + sz, goal = tx * N + tz;
    prev[start] = start;
    for (let qi = 0; qi < queue.length; qi++) {
      const c = queue[qi];
      if (c === goal) break;
      const x = Math.floor(c / N), z = c % N;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, nz = z + dz, n = nx * N + nz;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N || !grid[n] || prev[n] !== -1) continue;
        if (dx && dz && (!grid[(x + dx) * N + z] || !grid[x * N + z + dz])) continue;   // no cutting corners
        prev[n] = c; queue.push(n);
      }
    }
    if (prev[goal] === -1) return [];
    const path = [];
    for (let c = goal; c !== start; c = prev[c]) path.push([Math.floor(c / N) + 0.5, (c % N) + 0.5]);
    return path.reverse();
  }

  // ---------- seeing and hitting ----------
  function canSee(w, from, to, range = 60) {
    const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], dist = Math.hypot(...d);
    if (dist > range || dist < 1e-6) return dist <= range;
    return !raycast(w, from, d.map((v) => v / dist), dist);
  }
  function rayBox(o, d, min, max) {   // distance along the ray to a box, or null
    let t0 = 0, t1 = Infinity;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < min[i] || o[i] > max[i]) return null; continue; }
      let a = (min[i] - o[i]) / d[i], b = (max[i] - o[i]) / d[i];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return null;
    }
    return t0;
  }
  const HEAD = 1.45;
  function boxes(who) {
    const [x, y, z] = who.pos, top = who.crouch ? 1.45 : 1.85, neck = who.crouch ? 1.05 : HEAD;
    return { head: [[x - 0.22, y + neck, z - 0.22], [x + 0.22, y + top, z + 0.22]], body: [[x - 0.3, y, z - 0.3], [x + 0.3, y + neck, z + 0.3]] };
  }
  // what a shot from eye along dir hits first: one of the targets (head or body) or a wall
  function shotHit(w, targets, eye, dir, range) {
    const wall = raycast(w, eye, dir, range);
    let best = null;
    for (const t of targets) {
      if (!t.alive) continue;
      const b = boxes(t);
      for (const part of ["head", "body"]) {
        const d = rayBox(eye, dir, ...b[part]);
        if (d !== null && d <= range && (!wall || d < wall.dist) && (!best || d < best.t)) best = { target: t, head: part === "head", t: d };
      }
    }
    return best || (wall ? { wall: wall.hit, t: wall.dist } : null);
  }

  // ---------- weapons ----------
  const WEAPONS = {
    rifle:  { name: "Rifle",  mag: 30, reserve: 90, rate: 0.1,  auto: true,  dmg: 36, head: 4, range: 90, reload: 2.4, spread: 0.0025, moveSpread: 0.05, speed: 4.6 },
    pistol: { name: "Pistol", mag: 12, reserve: 36, rate: 0.16, auto: false, dmg: 30, head: 4, range: 70, reload: 2.1, spread: 0.005,  moveSpread: 0.03, speed: 5.0 },
    knife:  { name: "Knife",  melee: true, rate: 0.45, dmg: 55, head: 1, range: 2.2, speed: 5.4 },
  };
  const ORDER = ["rifle", "pistol", "knife"];
  // the rifle's spray: each shot kicks the view up, then from side to side (radians)
  const SPRAY = [[0, .016], [0, .02], [0, .024], [.004, .026], [-.004, .026], [.008, .02], [.012, .016], [-.01, .012], [-.016, .008], [-.02, .006],
                 [-.014, .004], [.012, .004], [.02, .002], [.022, .002], [.01, .002], [-.012, .002], [-.02, .002], [-.018, .002]];
  const sprayKick = (n) => SPRAY[Math.min(n, SPRAY.length - 1)];
  function hurt(p, dmg) {   // armour takes half of a hit while it lasts
    if (p.armor > 0) { const a = Math.min(p.armor, dmg / 2); p.armor -= a; dmg -= a; }
    p.hp = Math.max(0, p.hp - dmg);
    if (p.hp <= 0) p.alive = false;
    return dmg;
  }
  function arm(p) {
    p.weapon = "rifle"; p.last = "pistol"; p.fireCD = 0; p.reload = 0; p.spray = 0; p.sprayT = 0; p.kick = 0; p.debt = 0; p.flash = 0;
    p.ammo = Object.fromEntries(ORDER.filter((k) => !WEAPONS[k].melee).map((k) => [k, { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve }]));
  }

  // ---------- bots ----------
  const LEVELS = {
    easy:   { react: 0.9,  interval: 0.5,  aim: 0.22, dmg: [9, 15],  speed: 3.3 },
    normal: { react: 0.55, interval: 0.32, aim: 0.33, dmg: [11, 19], speed: 3.9 },
    hard:   { react: 0.3,  interval: 0.2,  aim: 0.48, dmg: [14, 24], speed: 4.4 },
  };
  function spawnBots(map, grid, N, n, r) {
    return Array.from({ length: n }, (_, i) => {
      let [x, z] = map.enemies[i % map.enemies.length];
      for (let k = 0; k < 20 && !grid[(x + (i >= map.enemies.length ? 1 : 0)) * N + z]; k++) x += 1;
      const b = body([x + 0.5 + (i >= map.enemies.length ? 1 : 0), FLOOR + 0.01, z + 0.5], r() * Math.PI * 2);
      return Object.assign(b, { id: i + 1, hp: 100, alive: true, path: [], repath: r() * 0.8, seen: 0, cd: 0.5, alert: 0, stuck: 0, last: [x, z], strafe: 0, flash: 0, hurtT: 0, deadT: 0 });
    });
  }
  const angleTo = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));     // the yaw that looks from one point to another
  function turn(cur, want, max) { let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return cur + Math.max(-max, Math.min(max, d)); }

  // Move and fire the bots at the players. Returns the shots fired: [{ bot, target, hit, dmg, dist }]
  function updateBots(w, grid, bots, players, level, dt, r) {
    const L = LEVELS[level] || LEVELS.normal, shots = [], N = w.size;
    for (const bot of bots) {
      if (!bot.alive) { bot.deadT += dt; continue; }
      bot.flash = Math.max(0, bot.flash - dt); bot.hurtT = Math.max(0, bot.hurtT - dt);
      const eye = [bot.pos[0], bot.pos[1] + 1.6, bot.pos[2]];
      const alive = players.filter((p) => p.alive);
      let seen = null, seenDist = Infinity;
      for (const p of alive) {
        const pe = eyeOf(p), d = Math.hypot(pe[0] - eye[0], pe[2] - eye[2]), facing = Math.cos(angleTo(bot.pos, p.pos) - bot.yaw) > 0.2;
        if ((facing || bot.alert > 0) && d < seenDist && canSee(w, eye, pe, 55)) { seen = p; seenDist = d; }
      }
      const input = { forward: 0, right: 0, jump: false };
      bot.alert = Math.max(0, bot.alert - dt);
      if (seen) {
        const toward = angleTo(bot.pos, seen.pos);
        bot.seen += dt; bot.alert = 3;
        bot.yaw = turn(bot.yaw, toward, 7 * dt);
        if (level === "hard") { bot.strafe -= dt; if (bot.strafe <= 0) bot.strafe = 0.6 + r() * 0.8; input.right = Math.sin(bot.strafe * 4) > 0 ? 0.6 : -0.6; }
        if (bot.seen > L.react && Math.cos(toward - bot.yaw) > 0.97) {
          bot.cd -= dt;
          if (bot.cd <= 0) {
            bot.cd = L.interval * (0.8 + r() * 0.4); bot.flash = 0.06;
            const moving = Math.hypot(seen.vel[0], seen.vel[2]) > 0.5;
            const chance = L.aim * Math.max(0.3, Math.min(1, 1.25 - seenDist / 40)) * (moving ? 0.65 : 1) * (seen.crouch ? 0.85 : 1);
            const hit = r() < chance;
            shots.push({ bot, target: seen, hit, dmg: hit ? L.dmg[0] + Math.floor(r() * (L.dmg[1] - L.dmg[0] + 1)) : 0, dist: seenDist });
          }
        }
      } else if (alive.length) {
        bot.seen = 0;
        bot.repath -= dt;
        if (bot.repath <= 0) {
          bot.repath = 0.8 + r() * 0.4;
          const goal = alive.reduce((a, b) => (Math.hypot(a.pos[0] - bot.pos[0], a.pos[2] - bot.pos[2]) < Math.hypot(b.pos[0] - bot.pos[0], b.pos[2] - bot.pos[2]) ? a : b));
          bot.path = findPath(grid, N, [bot.pos[0], bot.pos[2]], [goal.pos[0], goal.pos[2]]);
        }
        while (bot.path.length && Math.hypot(bot.path[0][0] - bot.pos[0], bot.path[0][1] - bot.pos[2]) < 0.35) bot.path.shift();
        if (bot.path.length) { bot.yaw = turn(bot.yaw, angleTo(bot.pos, [bot.path[0][0], 0, bot.path[0][1]]), 8 * dt); input.forward = 1; }
        bot.stuck += dt;
        if (bot.stuck > 0.6) { if (Math.hypot(bot.pos[0] - bot.last[0], bot.pos[2] - bot.last[1]) < 0.15 && input.forward) input.jump = true; bot.stuck = 0; bot.last = [bot.pos[0], bot.pos[2]]; }
      }
      stepPlayer(w, bot, input, dt, { speed: L.speed });
    }
    return shots;
  }

  return { rng, findPath, canSee, rayBox, boxes, shotHit, WEAPONS, ORDER, sprayKick, hurt, arm, LEVELS, spawnBots, updateBots, angleTo, turn };
})();
window.OpsCombat = OpsCombat;
