// Ambient background: a faint stream of dots that drifts across the page,
// snaps into alignment on a lattice (the "lock"), holds for a beat, then releases and flows on.
(() => {
  "use strict";
  const canvas = document.getElementById("ambient");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CELL = 30;            // lattice spacing the dots lock onto
  const FLOW = 7000, SNAP = 1300, HOLD = 2200, RELEASE = 1400;
  const CYCLE = FLOW + SNAP + HOLD + RELEASE;
  const violet = [167, 139, 250], pink = [244, 114, 182];

  let w = 0, h = 0, dpr = 1, particles = [];
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(220, Math.round((w * h) / 7000));
    particles = Array.from({ length: count }, () => {
      const lane = Math.random() * h;
      return {
        x: Math.random() * w, lane, y: lane,
        v: 14 + Math.random() * 34,                 // px/s
        amp: 4 + Math.random() * 10, ph: Math.random() * Math.PI * 2,
        a: 0.05 + Math.random() * 0.12,
        r: 0.8 + Math.random() * 1.1,
        sx: 0, sy: 0,
      };
    });
  }

  function snapTargets() {
    for (const p of particles) {
      p.sx = Math.round(p.x / CELL) * CELL;
      p.sy = Math.round(p.y / CELL) * CELL;
    }
  }

  let last = performance.now(), start = last, prevPhase = "";
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) % CYCLE;
    let phase, k;                                   // k: 0 = free, 1 = locked
    if (t < FLOW) { phase = "flow"; k = 0; }
    else if (t < FLOW + SNAP) { phase = "snap"; k = ease((t - FLOW) / SNAP); }
    else if (t < FLOW + SNAP + HOLD) { phase = "hold"; k = 1; }
    else { phase = "release"; k = 1 - ease((t - FLOW - SNAP - HOLD) / RELEASE); }
    if (phase === "snap" && prevPhase !== "snap") snapTargets();
    prevPhase = phase;

    const moving = phase === "flow" || phase === "release";
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";

    for (const p of particles) {
      if (moving) {
        p.x += p.v * dt;
        p.ph += dt * 0.8;
        p.y = p.lane + Math.sin(p.ph) * p.amp;
        if (p.x > w + 40) { p.x = -40; p.lane = Math.random() * h; }
      }
      const x = p.x + (p.sx - p.x) * k;
      const y = p.y + (p.sy - p.y) * k;
      const mix = Math.max(0, Math.min(1, x / w));
      const r = violet[0] + (pink[0] - violet[0]) * mix;
      const g = violet[1] + (pink[1] - violet[1]) * mix;
      const b = violet[2] + (pink[2] - violet[2]) * mix;
      // fade toward the bottom so the stream stays out of the way of content
      const fall = 1 - Math.min(1, y / (h * 1.1)) * 0.55;
      const alpha = (p.a + k * 0.14) * fall;
      const rgb = `${r | 0},${g | 0},${b | 0}`;
      // a short trail while flowing; it collapses into a crisp point when locked
      const trail = p.v * 0.6 * (1 - k);
      if (trail > 1) {
        ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.45).toFixed(3)})`;
        ctx.lineWidth = p.r * 1.2;
        ctx.beginPath();
        ctx.moveTo(x - trail, y - Math.cos(p.ph) * p.amp * 0.08 * trail);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${rgb},${Math.min(1, alpha * 1.6).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r + k * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  let raf;
  resize();
  window.addEventListener("resize", () => { resize(); if (reduced) drawStatic(); });
  function drawStatic() { snapTargets(); start = performance.now() - (FLOW + SNAP); frame(performance.now()); }
  if (reduced) { drawStatic(); return; }
  raf = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
})();
