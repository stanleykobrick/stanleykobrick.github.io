/* RTHero v3 — dark neon / gunmetal microscopy loop.
   Skin cross-section → a soft beam of light shatters tattoo ink → macrophages reach out with pseudopods,
   wrap the fragments and carry them away → tissue clears → ink fades back for a seamless 12 s loop.
   API: RTHero.render(ctx, t, W, H); RTHero.PERIOD; RTHero.PHASES; RTHero.setCanvasFactory(fn) (Node tests). */
(function (root) {
  var P = 12, TAU = Math.PI * 2;
  var PHASES = [{ name: 'Pulse', from: 0, to: 4.4 }, { name: 'Engulf', from: 4.4, to: 9.0 }, { name: 'Clear', from: 9.0, to: 12 }];
  var factory = null, cache = null;

  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function angDiff(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function makeCanvas(w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    if (factory) return factory(w, h);
    if (typeof document !== 'undefined' && document.createElement) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    return null;
  }

  // beam position: sweeps left → right
  var B0 = 1.7, B1 = 4.1;
  function beamX(t, W) { return lerp(-0.08 * W, 1.08 * W, smooth(B0, B1, t)); }

  function surfY(x, W, H) { var u = x / W; return H * (0.2 + 0.015 * Math.sin(u * 5.2 + 0.6) + 0.008 * Math.sin(u * 11 + 1.3)); }

  function sprite(size, stops) {
    var c = makeCanvas(size, size); if (!c) return null;
    var g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  }

  function drawStatic(g, S) {
    var W = S.W, H = S.H, s = S.s;
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070B10'); bg.addColorStop(0.18, '#0B1218'); bg.addColorStop(0.45, '#0F1A22'); bg.addColorStop(1, '#13202A');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // gunmetal sheen
    var sh = g.createLinearGradient(0, 0, W, H);
    sh.addColorStop(0, 'rgba(150,175,190,0)'); sh.addColorStop(0.38, 'rgba(150,175,190,0.07)'); sh.addColorStop(0.5, 'rgba(200,220,230,0.11)'); sh.addColorStop(0.62, 'rgba(150,175,190,0.05)'); sh.addColorStop(1, 'rgba(150,175,190,0)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);
    // faint grid
    var step = 40 * s; g.beginPath();
    for (var x = step / 2; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (var y = step / 2; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.strokeStyle = 'rgba(61,245,255,0.035)'; g.lineWidth = 1; g.stroke();
    // above the skin: darker glass
    g.beginPath(); g.moveTo(0, 0);
    for (x = 0; x <= W; x += 6) g.lineTo(x, surfY(x, W, H));
    g.lineTo(W, 0); g.closePath();
    var air = g.createLinearGradient(0, 0, 0, H * 0.22);
    air.addColorStop(0, 'rgba(3,5,8,0.85)'); air.addColorStop(1, 'rgba(6,10,14,0.55)');
    g.fillStyle = air; g.fill();
    // epidermis: two rows of glassy cells
    var cs = 30 * s, r = rng(77);
    for (var row = 0; row < 2; row++) {
      for (x = -cs; x < W + cs; x += cs) {
        var cx = x + (row ? cs / 2 : 0) + (r() - 0.5) * 4 * s, cy = surfY(cx, W, H) + cs * (0.55 + row * 0.85), rr = cs * (0.42 + r() * 0.08);
        g.beginPath();
        for (var k = 0; k <= 6; k++) { var a = k / 6 * TAU + r() * 0.2; var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8; k ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.closePath(); g.fillStyle = 'rgba(120,170,190,' + (0.05 + r() * 0.04) + ')'; g.fill();
        g.strokeStyle = 'rgba(61,245,255,0.16)'; g.lineWidth = 1 * s; g.stroke();
        g.beginPath(); g.arc(cx - rr * 0.1, cy, rr * 0.22, 0, TAU); g.fillStyle = 'rgba(61,245,255,0.08)'; g.fill();
      }
    }
    // basement line under epidermis
    g.beginPath();
    for (x = 0; x <= W; x += 6) { y = surfY(x, W, H) + cs * 1.95; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = 'rgba(61,245,255,0.10)'; g.lineWidth = 6 * s; g.stroke();
    g.strokeStyle = 'rgba(61,245,255,0.35)'; g.lineWidth = 1 * s; g.stroke();
    // skin surface glow
    g.beginPath();
    for (x = 0; x <= W; x += 6) { y = surfY(x, W, H); x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = 'rgba(61,245,255,0.12)'; g.lineWidth = 8 * s; g.stroke();
    g.strokeStyle = 'rgba(160,250,255,0.75)'; g.lineWidth = 1.4 * s; g.stroke();
    // labels + scale bar (static HUD)
    var fs = Math.max(9, 11 * s);
    g.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
    g.fillStyle = 'rgba(150,230,240,0.45)'; g.textBaseline = 'middle';
    g.fillText('EPIDERMIS', 14 * s + 4, surfY(0, W, H) + cs * 1.1);
    g.fillText('DERMIS', 14 * s + 4, surfY(0, W, H) + cs * 2.6);
    var sb = 60 * s, bx = 18 * s + 4, by = H - 20 * s - 6;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + sb, by); g.moveTo(bx, by - 4 * s); g.lineTo(bx, by + 4 * s); g.moveTo(bx + sb, by - 4 * s); g.lineTo(bx + sb, by + 4 * s);
    g.strokeStyle = 'rgba(160,240,248,0.6)'; g.lineWidth = 1.2 * s; g.stroke();
    g.fillText('50 µm', bx + sb + 8 * s, by);
    // corner ticks
    var m = 12 * s + 2, L = 18 * s; g.beginPath();
    [[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]].forEach(function (c) { g.moveTo(c[0], c[1] + c[3] * L); g.lineTo(c[0], c[1]); g.lineTo(c[0] + c[2] * L, c[1]); });
    g.strokeStyle = 'rgba(61,245,255,0.3)'; g.lineWidth = 1.2 * s; g.stroke();
    // vignette
    var vg = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  function build(W, H) {
    var r = rng(9137), s = Math.min(W, H) / 640;
    var S = { W: W, H: H, s: s, clusters: [], cells: [], lines: [] };
    var n = 6;
    for (var i = 0; i < n; i++) {
      var cx = lerp(W * 0.16, W * 0.84, i / (n - 1)) + (r() - 0.5) * W * 0.02;
      var cy = H * (0.47 + 0.03 * Math.sin(i * 1.3 + 0.4));
      var rad = (27 + r() * 9) * s, rot = (r() - 0.5) * 1.0, dust = [], chunks = [];
      var m = 52 + Math.floor(r() * 16);
      for (var k = 0; k < m; k++) {
        var a = r() * TAU, d = Math.sqrt(r());
        var lx = Math.cos(a) * d * rad, ly = Math.sin(a) * d * rad * 0.45;
        dust.push({ x: cx + lx * Math.cos(rot) - ly * Math.sin(rot), y: cy + lx * Math.sin(rot) + ly * Math.cos(rot), r: (1.6 + r() * 2.3) * s,
          vx: Math.cos(a) * (0.4 + r()), vy: Math.sin(a) * (0.4 + r()) - 0.2, seed: r() });
      }
      for (k = 0; k < 3; k++) {
        a = (k / 3) * TAU + r() * 0.8; d = 0.3 + r() * 0.5;
        lx = Math.cos(a) * d * rad; ly = Math.sin(a) * d * rad * 0.45;
        chunks.push({ x: cx + lx * Math.cos(rot) - ly * Math.sin(rot), y: cy + lx * Math.sin(rot) + ly * Math.cos(rot), r: (4.6 + r() * 1.8) * s,
          vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.4 + 0.25, inA: r() * TAU, inR: 0.2 + r() * 0.3, spin: (r() - 0.5) * 0.6 });
      }
      // hit time: when the beam passes this cluster
      var lo = B0, hi = B1;
      for (var it = 0; it < 30; it++) { var mid = (lo + hi) / 2; if (beamX(mid, W) < cx) lo = mid; else hi = mid; }
      S.clusters.push({ x: cx, y: cy, rad: rad, dust: dust, chunks: chunks, hit: (lo + hi) / 2 });
    }
    // three macrophages, each handles two neighbouring clusters
    var enter = [[-0.16 * W, 0.86 * H], [0.5 * W, 1.22 * H], [1.16 * W, 0.82 * H]];
    for (var j = 0; j < 3; j++) {
      var c0 = S.clusters[2 * j], c1 = S.clusters[2 * j + 1];
      var cell = { px: (c0.x + c1.x) / 2, py: Math.max(c0.y, c1.y) + 62 * s, sx: enter[j][0], sy: enter[j][1],
        ex: (c0.x + c1.x) / 2 + (j - 1) * 0.12 * W, ey: 1.25 * H, r: (36 + r() * 6) * s, ph: r() * TAU, eat: [] };
      var list = c0.chunks.concat(c1.chunks);
      list.sort(function (a, b) { return a.x - b.x; });
      list.forEach(function (ch, q) { ch.cell = j; ch.start = 4.75 + j * 0.2 + q * 0.42; cell.eat.push(ch); });
      cell.granules = [];
      for (k = 0; k < 7; k++) cell.granules.push({ a: r() * TAU, d: 0.25 + r() * 0.5, r: (1.5 + r() * 2) * s });
      S.cells.push(cell);
    }
    for (i = 0; i < 5; i++) S.lines.push({ y: 0.36 + i * 0.12 + (r() - 0.5) * 0.03, a: 0.012 + r() * 0.012, k: 1.5 + r() * 2.5, ph: r() * TAU, al: 0.12 + r() * 0.12 });
    // prerendered layers
    S.bg = makeCanvas(W, H);
    if (S.bg) drawStatic(S.bg.getContext('2d'), S);
    S.red = sprite(64, [[0, 'rgba(255,59,87,0.30)'], [0.45, 'rgba(255,59,87,0.09)'], [1, 'rgba(255,59,87,0)']]);
    S.cyan = sprite(64, [[0, 'rgba(220,255,255,0.9)'], [0.35, 'rgba(61,245,255,0.35)'], [1, 'rgba(61,245,255,0)']]);
    S.beam = (function () {
      var bw = Math.max(40 * s, W * 0.07), bh = H * 0.8, c = makeCanvas(bw * 2, bh); if (!c) return null;
      var g = c.getContext('2d');
      var hg = g.createLinearGradient(0, 0, bw * 2, 0);
      hg.addColorStop(0, 'rgba(61,245,255,0)'); hg.addColorStop(0.35, 'rgba(61,245,255,0.16)'); hg.addColorStop(0.5, 'rgba(190,252,255,0.55)'); hg.addColorStop(0.65, 'rgba(61,245,255,0.16)'); hg.addColorStop(1, 'rgba(61,245,255,0)');
      g.fillStyle = hg; g.fillRect(0, 0, bw * 2, bh);
      var core = g.createLinearGradient(bw * 0.8, 0, bw * 1.2, 0);
      core.addColorStop(0, 'rgba(255,255,255,0)'); core.addColorStop(0.5, 'rgba(255,255,255,0.75)'); core.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = core; g.fillRect(bw * 0.8, 0, bw * 0.4, bh);
      g.globalCompositeOperation = 'destination-in';
      var vg = g.createLinearGradient(0, 0, 0, bh);
      vg.addColorStop(0, 'rgba(0,0,0,0.6)'); vg.addColorStop(0.25, 'rgba(0,0,0,1)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.85)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = vg; g.fillRect(0, 0, bw * 2, bh);
      c.bw = bw; return c;
    })();
    return S;
  }

  function cellPos(c, t) {
    var a = smooth(3.7, 5.0, t), b = smooth(8.9, 10.5, t);
    var bob = Math.sin(TAU * t / P * 2 + c.ph) * 3;
    return { x: lerp(lerp(c.sx, c.px, a), c.ex, b) + Math.cos(TAU * t / P + c.ph) * 2, y: lerp(lerp(c.sy, c.py, a), c.ey, b) + bob, vis: smooth(3.7, 4.3, t) * (1 - smooth(9.9, 10.5, t)) };
  }

  // where a chunk is (world), its engulf progress g and whether it is visible
  function chunkState(S, cl, ch, t) {
    var since = t - cl.hit;
    if (since <= 0 || t > 10.6) return null;
    var burst = 1 - Math.exp(-since * 3), bd = cl.rad * 0.8;
    var wx = ch.x + ch.vx * bd * burst, wy = ch.y + ch.vy * bd * burst;
    var cp = cellPos(S.cells[ch.cell], t), cr = S.cells[ch.cell].r;
    var g = smooth(ch.start + 0.55, ch.start + 1.5, t);
    var ia = ch.inA + ch.spin * (t - ch.start);
    var ix = cp.x + Math.cos(ia) * cr * ch.inR, iy = cp.y + Math.sin(ia) * cr * ch.inR * 0.9;
    var x = lerp(wx, ix, g), y = lerp(wy, iy, g);
    var dim = lerp(1, 0.72, g) * (1 - smooth(9.0, 9.9, t));
    return { x: x, y: y, g: g, dim: dim, cp: cp };
  }

  function drawCell(ctx, S, c, t) {
    var cp = cellPos(c, t); if (cp.vis <= 0.001) return;
    var s = S.s, r = c.r, N = 84, w1 = TAU / P * 2, w2 = TAU / P * 3;
    var bumps = [];
    c.eat.forEach(function (ch) {
      if (t < ch.start || t > ch.start + 1.8) return;
      var cl = S.clusters.filter(function (q) { return q.chunks.indexOf(ch) >= 0; })[0];
      var st = chunkState(S, cl, ch, t); if (!st) return;
      var dx = st.x - cp.x, dy = (st.y - cp.y) / 0.92, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      var reach = smooth(ch.start, ch.start + 0.55, t);
      var L = Math.max(0, dist - r + ch.r * 2.6) * reach * (1 - smooth(ch.start + 1.3, ch.start + 1.8, t));
      var wrap = smooth(ch.start + 0.3, ch.start + 0.75, t);
      bumps.push({ a: ang, L: L, w: lerp(0.16, 0.24, wrap), arm: wrap, spread: lerp(0.42, 0.16, wrap) * Math.min(1, 40 * s / Math.max(dist, 1)) + 0.06 });
    });
    function R(a) {
      var v = r * (1 + 0.05 * Math.sin(3 * a + w1 * t + c.ph) + 0.035 * Math.sin(5 * a - w2 * t + c.ph));
      for (var i = 0; i < bumps.length; i++) {
        var b = bumps[i], d = angDiff(a, b.a);
        v += b.L * 0.85 * Math.exp(-d * d / (2 * b.w * b.w));
        if (b.arm > 0) {
          var d1 = d - b.spread, d2 = d + b.spread, aw = 0.09;
          v += b.L * 0.3 * b.arm * (Math.exp(-d1 * d1 / (2 * aw * aw)) + Math.exp(-d2 * d2 / (2 * aw * aw)));
        }
      }
      return v;
    }
    ctx.save(); ctx.globalAlpha = cp.vis;
    ctx.beginPath();
    for (var i = 0; i <= N; i++) { var a = i / N * TAU, v = R(a), x = cp.x + Math.cos(a) * v, y = cp.y + Math.sin(a) * v * 0.92; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(61,245,255,0.10)'; ctx.lineWidth = 10 * s; ctx.stroke();
    var fg = ctx.createRadialGradient(cp.x - r * 0.3, cp.y - r * 0.35, r * 0.1, cp.x, cp.y, r * 1.5);
    fg.addColorStop(0, 'rgba(120,240,245,0.42)'); fg.addColorStop(0.55, 'rgba(30,150,170,0.32)'); fg.addColorStop(1, 'rgba(20,110,130,0.26)');
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = 'rgba(140,250,255,0.85)'; ctx.lineWidth = 1.5 * s; ctx.stroke();
    // nucleus
    ctx.beginPath(); ctx.ellipse(cp.x - r * 0.18, cp.y + r * 0.12, r * 0.36, r * 0.25, 0.5 + Math.sin(w1 * t) * 0.05, 0, TAU);
    ctx.fillStyle = 'rgba(8,60,80,0.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(61,245,255,0.45)'; ctx.lineWidth = 1 * s; ctx.stroke();
    // granules
    ctx.fillStyle = 'rgba(190,255,255,0.35)';
    c.granules.forEach(function (gq) { ctx.beginPath(); ctx.arc(cp.x + Math.cos(gq.a + w1 * t * 0.5) * r * gq.d, cp.y + Math.sin(gq.a + w1 * t * 0.5) * r * gq.d * 0.9, gq.r, 0, TAU); ctx.fill(); });
    ctx.restore();
  }

  function render(ctx, time, W, H) {
    if (!cache || cache.W !== W || cache.H !== H) cache = build(W, H);
    var S = cache, s = S.s, t = ((time % P) + P) % P;
    ctx.save();
    if (S.bg) ctx.drawImage(S.bg, 0, 0); else drawStatic(ctx, S);

    // drifting dermis layer lines
    S.lines.forEach(function (L) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 12) { var y = H * (L.y + L.a * Math.sin((x / W) * L.k * Math.PI + L.ph + TAU * t / P)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = 'rgba(61,245,255,' + (L.al * 0.35) + ')'; ctx.lineWidth = 5 * s; ctx.stroke();
      ctx.strokeStyle = 'rgba(61,245,255,' + L.al + ')'; ctx.lineWidth = 1 * s; ctx.stroke();
    });

    var back = smooth(10.6, 11.9, t);
    // ink
    S.clusters.forEach(function (cl) {
      var since = t - cl.hit, intact = since <= 0 || t >= 10.6;
      var al = t >= 10.6 ? back : 1;
      if (intact) {
        if (al <= 0) return;
        ctx.globalAlpha = al;
        if (S.red) ctx.drawImage(S.red, cl.x - cl.rad * 1.9, cl.y - cl.rad * 1.3, cl.rad * 3.8, cl.rad * 2.6);
        ctx.beginPath();
        cl.dust.concat(cl.chunks).forEach(function (p) { var rr = p.r * (p.inA !== undefined ? 0.7 : 1); ctx.moveTo(p.x + rr, p.y); ctx.arc(p.x, p.y, rr, 0, TAU); });
        ctx.fillStyle = '#020304'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,59,87,0.38)'; ctx.lineWidth = 0.8 * s; ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }
      // dust: embers that drift and fade
      var burst = 1 - Math.exp(-since * 3.2), fade = 1 - smooth(cl.hit + 1.2, cl.hit + 3.6, t);
      if (fade > 0) {
        ctx.beginPath();
        cl.dust.forEach(function (p) {
          var x = p.x + p.vx * cl.rad * 0.9 * burst, y = p.y + p.vy * cl.rad * 0.7 * burst - since * 2 * s, rr = p.r * lerp(1, 0.45, smooth(0, 0.5, since));
          ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU);
        });
        ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(255,90,110,0.55)'; ctx.fill(); ctx.globalAlpha = 1;
      }
      // chunks
      cl.chunks.forEach(function (ch) {
        var st = chunkState(S, cl, ch, t); if (!st || st.dim <= 0) return;
        ctx.globalAlpha = st.dim;
        if (S.red) { var gs = ch.r * 5 * (1 - st.g * 0.6); ctx.drawImage(S.red, st.x - gs / 2, st.y - gs / 2, gs, gs); }
        ctx.beginPath(); ctx.arc(st.x, st.y, ch.r, 0, TAU); ctx.fillStyle = '#05070A'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,59,87,0.6)'; ctx.lineWidth = 1.1 * s; ctx.stroke();
        ctx.globalAlpha = 1;
      });
      // ripple at the hit
      if (since > 0 && since < 1.3) {
        var k = since / 1.3;
        ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.rad * (0.8 + k * 2.6), cl.rad * (0.5 + k * 1.6), 0, 0, TAU);
        ctx.strokeStyle = 'rgba(61,245,255,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = 1.6 * s; ctx.stroke();
        if (S.cyan) { ctx.globalAlpha = 1 - k; var fs = cl.rad * 4.2; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(S.cyan, cl.x - fs / 2, cl.y - fs / 2, fs, fs); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      }
    });

    // macrophages (translucent: fragments inside show through, dimmed)
    S.cells.forEach(function (c) { drawCell(ctx, S, c, t); });
    // phagosome rings around swallowed fragments
    S.clusters.forEach(function (cl) {
      cl.chunks.forEach(function (ch) {
        var st = chunkState(S, cl, ch, t); if (!st || st.g <= 0.05 || st.dim <= 0) return;
        ctx.beginPath(); ctx.arc(st.x, st.y, ch.r * 1.8, 0, TAU);
        ctx.strokeStyle = 'rgba(190,255,255,' + (0.8 * st.g * st.dim * st.cp.vis) + ')'; ctx.lineWidth = 1 * s; ctx.stroke();
      });
    });

    // the beam of light (no device)
    var on = smooth(1.5, 1.9, t) * (1 - smooth(4.0, 4.4, t));
    if (on > 0) {
      var bx = beamX(t, W);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = on;
      if (S.beam) ctx.drawImage(S.beam, bx - S.beam.bw, 0);
      if (S.cyan) { var gsz = 120 * s; var sy = surfY(bx, W, H); ctx.drawImage(S.cyan, bx - gsz / 2, sy - gsz / 2, gsz, gsz); ctx.globalAlpha = on * 0.5; ctx.drawImage(S.cyan, bx - gsz * 0.7, H * 0.47 - gsz * 0.7, gsz * 1.4, gsz * 1.4); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  var api = { render: render, PERIOD: P, PHASES: PHASES, setCanvasFactory: function (f) { factory = f; cache = null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RTHero = api;
})(this);
