/* RTHex v4 — procedural copy of the original site's honeycomb (flat-top navy tiles, soft shadows,
   thin gold seams), but alive: tiles drift very slowly up and down (some rise above the rest, some sink
   below), and gold seams light up slowly from the middle of the line outwards, then fade out gently.
   Usage: RTHex.attach(element, {intensity}) → canvas behind the element's content. 30 fps, pauses off screen. */
(function (root) {
  var S3 = Math.sqrt(3), TAU = Math.PI * 2;
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); }
  function easeOut(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return 1 - Math.pow(1 - x, 3); }
  function ang(k) { return k * Math.PI / 3; } // flat-top: vertices at 0°, 60°, …

  var LEVELS = 24;

  function Field(cv, opt) { this.cv = cv; this.ctx = cv.getContext('2d'); this.opt = opt || {}; }

  Field.prototype.hexPath = function (g, x, y, r) {
    g.beginPath();
    for (var k = 0; k < 6; k++) { var a = ang(k), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath();
  };

  // tile sprites, one per height level: low = sunk (dark, almost no shadow), high = raised (long soft shadow)
  Field.prototype.sprites = function () {
    var d = this.dpr, ro = this.ro, pad = Math.ceil(ro * 0.7), S = Math.ceil(ro * 2 + pad * 2), out = [];
    for (var l = 0; l < LEVELS; l++) {
      var h = l / (LEVELS - 1), c = document.createElement('canvas'); c.width = c.height = S;
      var g = c.getContext('2d'), cx = S / 2, cy = S / 2;
      g.save();
      g.shadowColor = 'rgba(0,0,6,' + (0.35 + 0.63 * h) + ')'; g.shadowBlur = (3 + 22 * h) * d; g.shadowOffsetY = (1 + 15 * h) * d; g.shadowOffsetX = (0.3 + 2.5 * h) * d;
      this.hexPath(g, cx, cy, ro); g.fillStyle = 'rgb(22,27,39)'; g.fill();
      g.restore();
      var v = 0.84 + h * 0.26; // sunk tiles are darker, raised ones catch a little more light
      var fg = g.createLinearGradient(cx, cy - ro, cx, cy + ro);
      fg.addColorStop(0, 'rgb(' + (25 * v | 0) + ',' + (30 * v | 0) + ',' + (43 * v | 0) + ')');
      fg.addColorStop(1, 'rgb(' + (20 * v | 0) + ',' + (25 * v | 0) + ',' + (36 * v | 0) + ')');
      this.hexPath(g, cx, cy, ro); g.fillStyle = fg; g.fill();
      var p = []; for (var k = 0; k < 6; k++) p.push([cx + Math.cos(ang(k)) * (ro - 0.7 * d), cy + Math.sin(ang(k)) * (ro - 0.7 * d)]);
      g.lineWidth = 1.1 * d; g.strokeStyle = 'rgba(120,135,165,' + (0.08 + 0.22 * h) + ')';
      g.beginPath(); g.moveTo(p[3][0], p[3][1]); g.lineTo(p[4][0], p[4][1]); g.lineTo(p[5][0], p[5][1]); g.lineTo(p[0][0], p[0][1]); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.lineTo(p[3][0], p[3][1]); g.stroke();
      out.push(c);
    }
    this.spr = out; this.half = S / 2;
  };

  Field.prototype.build = function (W, H, dpr) {
    this.W = W; this.H = H; this.dpr = dpr;
    var small = W / dpr < 700, R = (small ? 44 : 62) * dpr, gap = (small ? 2.2 : 3) * dpr;
    this.R = R; this.ro = R - gap / 2;
    var cells = [], verts = [], vmap = {}, adj = [];
    function vid(x, y) {
      var kx = Math.round(x / 3), ky = Math.round(y / 3);
      for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) { var q = vmap[(kx + i) + ',' + (ky + j)]; if (q !== undefined && Math.abs(verts[q][0] - x) < 2 && Math.abs(verts[q][1] - y) < 2) return q; }
      var k = kx + ',' + ky; vmap[k] = verts.length; verts.push([x, y]); adj.push([]); return vmap[k];
    }
    function link(a, b) { if (adj[a].indexOf(b) < 0) { adj[a].push(b); adj[b].push(a); } }
    var cols = Math.ceil(W / (1.5 * R)) + 2, rows = Math.ceil(H / (S3 * R)) + 2;
    for (var c = -1; c < cols; c++) for (var r = -1; r < rows; r++) {
      var x = c * 1.5 * R, y = r * S3 * R + (c & 1 ? S3 * R / 2 : 0), ids = [];
      for (var k = 0; k < 6; k++) ids.push(vid(x + Math.cos(ang(k)) * R, y + Math.sin(ang(k)) * R));
      for (var e = 0; e < 6; e++) link(ids[e], ids[(e + 1) % 6]);
      // most tiles sit near the common level; some drift above it, some sink below it
      var kind = hash(c + 50, r + 9), h0, amp;
      if (kind < 0.18) { h0 = 0.62; amp = 0.3; }        // risers
      else if (kind < 0.32) { h0 = 0.18; amp = 0.16; }  // sinkers
      else { h0 = 0.38 + (hash(c, r + 5) - 0.5) * 0.08; amp = 0.05; }
      cells.push({ x: x, y: y, h0: h0, amp: amp, per: 44 + hash(c + 3, r) * 36, ph: hash(r + 1, c + 2) * TAU });
    }
    this.cells = cells; this.verts = verts; this.adj = adj;
    this.sprites();
  };

  // zig-zag path along the gaps for one seam (deterministic per seed)
  Field.prototype.seamPath = function (seed) {
    var V = this.verts, A = this.adj, n = V.length, W = this.W, H = this.H, R = this.R, s0 = -1;
    for (var tr = 0; tr < 30; tr++) { var q = Math.floor(hash(seed, tr) * n); if (V[q][0] > R && V[q][0] < W - R && V[q][1] > R && V[q][1] < H - R) { s0 = q; break; } }
    if (s0 < 0) return null;
    var path = [s0], prev = -1, cur = s0, len = 2 + (hash(seed, 99) < 0.6 ? 1 : 0);
    for (var i = 0; i < len; i++) { var nb = A[cur].filter(function (x) { return x !== prev; }); if (!nb.length) break; var nx = nb[Math.floor(hash(seed, i + 40) * nb.length)]; prev = cur; cur = nx; path.push(nx); }
    var pts = path.map(function (v) { return V[v]; }), cum = [0];
    for (var j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    return { ids: path, pts: pts, cum: cum, L: cum[cum.length - 1] };
  };

  // the part of a path between arc lengths u0..u1, as a point list
  function sub(P, u0, u1) {
    function at(u) { for (var i = 1; i < P.cum.length; i++) if (u <= P.cum[i]) { var f = (u - P.cum[i - 1]) / (P.cum[i] - P.cum[i - 1]); return [P.pts[i - 1][0] + (P.pts[i][0] - P.pts[i - 1][0]) * f, P.pts[i - 1][1] + (P.pts[i][1] - P.pts[i - 1][1]) * f]; } return P.pts[P.pts.length - 1]; }
    var out = [at(u0)];
    for (var i = 1; i < P.cum.length - 1; i++) if (P.cum[i] > u0 && P.cum[i] < u1) out.push(P.pts[i]);
    out.push(at(u1));
    return out;
  }

  // draw a polyline as a tapered light stroke: full width in the middle, sharp points where taper > 0
  // tA / tB: share of the length used for the taper at the start / end (0 = blunt end)
  Field.prototype.taper = function (g, pts, w, rgb, alpha, tA, tB) {
    var cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var L = cum[cum.length - 1]; if (L <= 0.5) return;
    var N = Math.max(8, Math.min(40, Math.round(L / (3 * this.dpr))));
    function at(u) { for (var k = 1; k < cum.length; k++) if (u <= cum[k] || k === cum.length - 1) { var f = (u - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]); return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f]; } }
    g.lineCap = 'butt';
    var prev = at(0);
    for (i = 1; i <= N; i++) {
      var p = at(L * i / N), x = (i - 0.5) / N, k = 1;
      if (tA > 0 && x < tA) k = Math.min(k, x / tA);
      if (tB > 0 && x > 1 - tB) k = Math.min(k, (1 - x) / tB);
      k = Math.pow(Math.max(0, k), 0.8);
      if (k > 0.02) {
        g.strokeStyle = 'rgba(' + rgb + ',' + (alpha * (0.35 + 0.65 * k)) + ')'; g.lineWidth = Math.max(0.3, w * k);
        g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(p[0], p[1]); g.stroke();
      }
      prev = p;
    }
  };

  // a gold seam lit from its middle outwards. reach: 0..1 of the path length; branch: 0..1 growth of the
  // light that splits into the neighbouring gaps once it reaches a junction; a: brightness
  Field.prototype.seam = function (g, P, reach, branch, a) {
    if (!P || reach <= 0 || a <= 0) return;
    var d = this.dpr, mid = P.L / 2, half = P.L / 2 * reach, pts = sub(P, mid - half, mid + half);
    var tip = 0.3 * (1 - branch);                 // sharp tips, which fill out as the light flows on
    g.save(); g.globalCompositeOperation = 'lighter';
    this.taper(g, pts, (5 + 6 * a) * d, '224,166,74', 0.16 * a, Math.max(tip, 0.12), Math.max(tip, 0.12));
    this.taper(g, pts, 2.4 * d, '236,190,104', a, tip, tip);
    if (branch > 0.01) {
      var V = this.verts, A = this.adj, ids = P.ids, self = this, bl = this.R * 0.55 * branch;
      [[ids[0], ids[1]], [ids[ids.length - 1], ids[ids.length - 2]]].forEach(function (pair) {
        var v = pair[0], from = pair[1];
        A[v].forEach(function (o) {
          if (o === from) return;
          var dx = V[o][0] - V[v][0], dy = V[o][1] - V[v][1], k = bl / Math.hypot(dx, dy);
          var bp = [[V[v][0], V[v][1]], [V[v][0] + dx * k, V[v][1] + dy * k]];
          self.taper(g, bp, (4 + 5 * a) * d, '224,166,74', 0.14 * a * branch, 0, 0.5);
          self.taper(g, bp, 2.2 * d, '230,180,96', 0.95 * a, 0, 0.6);
        });
      });
    }
    g.restore();
  };

  Field.prototype.draw = function (t) {
    var g = this.ctx, W = this.W, H = this.H, half = this.half, inten = this.opt.intensity == null ? 1 : this.opt.intensity;
    g.fillStyle = '#05070F'; g.fillRect(0, 0, W, H);
    var list = this.cells;
    for (var i = 0; i < list.length; i++) { var c = list[i]; c.h = Math.max(0, Math.min(1, c.h0 + c.amp * Math.sin(TAU * t / c.per + c.ph))); }
    list.sort(function (a, b) { return a.h - b.h; });
    for (var j = 0; j < list.length; j++) {
      // blend the two nearest height sprites, so shadows and shading change continuously (no steps)
      var cl = list[j], lf = cl.h * (LEVELS - 1), l0 = Math.min(LEVELS - 2, Math.floor(lf)), fr = lf - l0, lift = (cl.h - 0.38) * 5 * this.dpr;
      g.drawImage(this.spr[l0], cl.x - half, cl.y - half - lift);
      if (fr > 0.004) { g.globalAlpha = fr; g.drawImage(this.spr[l0 + 1], cl.x - half, cl.y - half - lift); g.globalAlpha = 1; }
    }
    // gold seams: each slot lights up slowly from the middle, holds, then fades; strength varies
    var slots = W / this.dpr < 700 ? 3 : 4, T = 16;
    if (!this.paths) this.paths = {};
    for (var s = 0; s < slots; s++) {
      var off = s * T / slots, ep = Math.floor((t + off) / T), ph = (t + off) / T - ep, key = s + ':' + ep;
      if (!this.paths[key]) { this.paths[key] = this.seamPath(s * 1009 + ep * 17); }
      var splits = hash(s + 21, ep) < 0.45;                  // some seams split at the junctions
      var grow = splits ? easeOut(ph / 0.36) : 0.78 * easeOut(ph / 0.42);   // others stop short of the walls
      var br = splits ? ease((ph - 0.3) / 0.22) : 0;
      var a = ease(ph / 0.3) * (1 - ease((ph - 0.62) / 0.36));
      var peak = 0.5 + 0.5 * hash(s + 7, ep);              // some seams glow brighter, some barely
      a *= peak * (0.92 + 0.08 * Math.sin(t * 0.9 + s * 2));
      if (a > 0.005) this.seam(g, this.paths[key], grow, br, a * inten);
    }
    if (Object.keys(this.paths).length > 40) this.paths = {};
    var vg = g.createLinearGradient(0, 0, W, H);
    vg.addColorStop(0, 'rgba(90,110,150,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  };

  function attach(el, opt) {
    var cv = document.createElement('canvas');
    cv.className = 'hexcv'; cv.setAttribute('aria-hidden', 'true');
    el.insertBefore(cv, el.firstChild);
    var f = new Field(cv, opt), vis = false, t0 = performance.now() - Math.random() * 8000, raf = 0, last = 0;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function size() {
      var r = el.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.5);
      var W = Math.max(2, Math.round(r.width * d)), H = Math.max(2, Math.round(r.height * d));
      if (W === f.W && H === f.H) return;
      cv.width = W; cv.height = H; f.paths = null; f.build(W, H, d); f.draw(still ? 6 : (performance.now() - t0) / 1000);
    }
    function loop(n) { raf = 0; if (!vis || still || !f.W || cv.offsetParent === null) return; if (n - last > 30) { last = n; f.draw((n - t0) / 1000); } raf = requestAnimationFrame(loop); }
    function kick() { if (!raf && vis && !still) raf = requestAnimationFrame(loop); }
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(el); else window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; kick(); }).observe(el); else vis = true;
    size(); kick();
    return { kick: kick, canvas: cv };
  }

  root.RTHex = { attach: attach, Field: Field };
})(this);
