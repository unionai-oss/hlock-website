// Ambient background: faint dots float around freely, then snap into a regular grid
// (the "lock"), hold for a beat, then release and drift apart again.
(() => {
  "use strict";
  const canvas = document.getElementById("ambient");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FLOAT = 4500, SNAP = 1400, HOLD = 3200, RELEASE = 1400;
  const CYCLE = FLOAT + SNAP + HOLD + RELEASE;
  const violet = [167, 139, 250], pink = [244, 114, 182];

  let w = 0, h = 0, dpr = 1, particles = [], cols = 0, rows = 0, gap = 0;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // one dot per grid cell, with square cells that cover the viewport
    gap = Math.max(46, Math.sqrt((w * h) / 240));
    cols = Math.ceil(w / gap); rows = Math.ceil(h / gap);
    particles = Array.from({ length: cols * rows }, () => {
      const ang = Math.random() * Math.PI * 2, v = 6 + Math.random() * 14;   // px/s
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        a: 0.06 + Math.random() * 0.12,
        r: 0.8 + Math.random() * 1.1,
        gx: 0, gy: 0, col: 0, row: 0,
      };
    });
    assignGrid();
  }

  // Give each dot a grid slot near where it is: bucket by y into rows, then by x into columns.
  function assignGrid() {
    const ox = (w - (cols - 1) * gap) / 2, oy = (h - (rows - 1) * gap) / 2;
    const byY = [...particles].sort((a, b) => a.y - b.y);
    for (let r = 0; r < rows; r++) {
      const row = byY.slice(r * cols, (r + 1) * cols).sort((a, b) => a.x - b.x);
      row.forEach((p, c) => { p.row = r; p.col = c; p.gx = ox + c * gap; p.gy = oy + r * gap; });
    }
  }

  let last = performance.now(), start = last, prevPhase = "";
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) % CYCLE;
    let phase, k;                                   // k: 0 = free, 1 = locked
    if (t < FLOAT) { phase = "float"; k = 0; }
    else if (t < FLOAT + SNAP) { phase = "snap"; k = ease((t - FLOAT) / SNAP); }
    else if (t < FLOAT + SNAP + HOLD) { phase = "hold"; k = 1; }
    else { phase = "release"; k = 1 - ease((t - FLOAT - SNAP - HOLD) / RELEASE); }
    if (phase === "snap" && prevPhase !== "snap") assignGrid();
    prevPhase = phase;

    ctx.clearRect(0, 0, w, h);
    const pos = new Array(particles.length);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // free motion keeps running underneath; a gentle wander keeps it from looking linear
      const turn = (Math.random() - 0.5) * 0.6 * dt;
      const c = Math.cos(turn), s = Math.sin(turn);
      [p.vx, p.vy] = [p.vx * c - p.vy * s, p.vx * s + p.vy * c];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (phase === "float") {                      // only wrap while free, so the snap never jumps
        if (p.x < -20) p.x += w + 40; else if (p.x > w + 20) p.x -= w + 40;
        if (p.y < -20) p.y += h + 40; else if (p.y > h + 20) p.y -= h + 40;
      }
      pos[i] = [p.x + (p.gx - p.x) * k, p.y + (p.gy - p.y) * k];
    }

    // faint lattice lines fade in while the dots are locked
    if (k > 0.6) {
      const la = (k - 0.6) / 0.4 * 0.06;
      const idx = new Map(particles.map((p, i) => [p.row * cols + p.col, i]));
      ctx.strokeStyle = `rgba(167,139,250,${la.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      particles.forEach((p, i) => {
        const right = idx.get(p.row * cols + p.col + 1), down = idx.get((p.row + 1) * cols + p.col);
        if (p.col < cols - 1 && right !== undefined) { ctx.moveTo(...pos[i]); ctx.lineTo(...pos[right]); }
        if (down !== undefined) { ctx.moveTo(...pos[i]); ctx.lineTo(...pos[down]); }
      });
      ctx.stroke();
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i], [x, y] = pos[i];
      const mix = Math.max(0, Math.min(1, x / w));
      const r = violet[0] + (pink[0] - violet[0]) * mix;
      const g = violet[1] + (pink[1] - violet[1]) * mix;
      const b = violet[2] + (pink[2] - violet[2]) * mix;
      // fade toward the bottom so the dots stay out of the way of content
      const fall = 1 - Math.min(1, y / (h * 1.1)) * 0.55;
      const alpha = (p.a + k * 0.14) * fall;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, alpha * 1.6).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r + k * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  let raf;
  resize();
  window.addEventListener("resize", () => { resize(); if (reduced) drawStatic(); });
  function drawStatic() { start = performance.now() - (FLOAT + SNAP); prevPhase = "snap"; frame(performance.now()); }
  if (reduced) { drawStatic(); return; }
  raf = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
})();
