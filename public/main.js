(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── tiny markup helpers for terminal output ────────────────────────────────
  const span = (cls, text) => `<span class="${cls}">${text}</span>`;
  const ok = (t) => span("t-ok", t);
  const bad = (t) => span("t-bad", t);
  const warn = (t) => span("t-warn", t);
  const auto = (t) => span("t-auto", t);
  const dim = (t) => span("t-dim", t);
  const mut = (t) => span("t-mut", t);
  const key = (t) => span("t-key", t);
  const hi = (t) => span("t-hi", t);
  const arrow = (t) => span("t-arrow", t);
  const plainLen = (html) => html.replace(/<[^>]+>/g, "").length;

  // A rounded box like hlock's rich output; pads each row to the widest one.
  function box(title, rows) {
    const inner = Math.max(plainLen(title) + 6, ...rows.map((r) => plainLen(r) + 4));
    const b = (t) => span("t-box", t);
    const top = b("╭─ ") + title + " " + b("─".repeat(inner - plainLen(title) - 3) + "╮");
    const pad = (r) => b("│") + "  " + r + " ".repeat(inner - plainLen(r) - 2) + b("│");
    const blank = b("│") + " ".repeat(inner) + b("│");
    const bottom = b("╰" + "─".repeat(inner) + "╯");
    return [top, blank, ...rows.map(pad), blank, bottom];
  }
  const kv = (k, v) => key(k.padEnd(15)) + v;

  // ── scenes: each is a list of steps ────────────────────────────────────────
  // { cmd } is typed; { out } lines appear one at a time; { wait } pauses.
  const pinBox = box(hi("harness.lock · pinned"), [
    kv("harness", "claude-code 2.1.285"),
    kv("llm · default", "anthropic:opus"),
    kv("mcp", "github (stdio), linear (http)"),
    kv("skills", "3  (1 local, 2 third-party)"),
    kv("plugins", "code-review@1.4.0"),
    kv("config", "{root}/settings.json, ~/.claude.json /mcpServers"),
    kv("secrets", "1 redacted  " + dim("(HLOCK_SECRET_* when syncing)")),
  ]);

  const scenes = {
    hero: {
      title: "~/projects/my-app",
      steps: [
        { cmd: "hlock pin" },
        { out: [ok("✓") + " pinned " + hi("claude-code 2.1.285") + " → harness.lock  " + dim("(only harness installed)")] },
        { out: pinBox, gap: 45 },
        { out: [mut("vendored 3 files → .hlock/vendor/claude-code/ · review, then commit")] },
        { out: [arrow("next →") + " hlock check  ·  hlock sync"] },
        { wait: 900 },
        { cmd: 'git add harness.lock .hlock/ && git commit -qm "lock my agent"' },
        { out: [dim("[main 4e1c9a2] lock my agent · 5 files changed")] },
        { wait: 3600 },
      ],
    },
    pin: {
      title: "laptop — zsh",
      steps: [
        { cmd: "hlock harness list" },
        {
          out: [
            dim("Agent CLIs"),
            dim("   harness       installed  source                          support"),
            ok("●") + "  " + hi("claude-code") + "   2.1.285    brew-cask:claude-code@2.1.285   full",
            "   codex         —                                          full",
            "   pi            1.0.0      npm:@earendil-works/pi-coding…  full",
            "   opencode      1.18.18    brew:opencode@1.18.18           full",
            dim("   …"),
            "",
            ok("●") + mut(" you're running inside Claude Code"),
          ],
          gap: 60,
        },
        { wait: 600 },
        { cmd: "hlock pin" },
        { out: [ok("✓") + " pinned " + hi("claude-code 2.1.285") + " → harness.lock"] },
        { out: [mut("  harness · 1 llm · 2 mcp · 3 skills · 1 plugin · 2 config · 1 secret")] },
        { out: [arrow("next →") + " hlock check  ·  hlock sync"] },
      ],
    },
    check: {
      title: "laptop — zsh  ·  a week later",
      steps: [
        { cmd: "hlock check" },
        { out: [bad("✗ drift:") + " your claude-code setup changed since harness.lock was pinned"] },
        {
          out: [
            "  " + warn("~") + " llm default: anthropic:opus " + arrow("→") + " anthropic:sonnet",
            "  " + warn("~") + " config {root}/settings.json: 016233bf39 " + arrow("→") + " d5aaa91f9e",
            "  " + ok("+") + " skill " + hi("write-tests") + "  " + dim("(local)"),
            "  " + mut("hint: re-pin with hlock pin, or restore it with hlock sync"),
          ],
          gap: 220,
        },
        { wait: 1100 },
        { cmd: "hlock sync --yes" },
        { out: [ok("✓") + " Write ~/.claude/settings.json", ok("✓") + " in sync with harness.lock"], gap: 260 },
      ],
    },
    sync: {
      title: "new-laptop — zsh",
      steps: [
        { cmd: "git clone git@github.com:you/my-app && cd my-app" },
        { cmd: "hlock sync" },
        { out: [hi("Sync plan") + " for Claude Code 2.1.285 → your config"] },
        {
          out: [
            ok("✓") + "  harness  Claude Code 2.1.285",
            ok("✓") + "  mcp      `npx` for MCP servers: github",
            auto("●") + "  config   Write ~/.claude/settings.json",
            auto("●") + "  config   Write ~/.claude.json /mcpServers",
            auto("●") + "  skill    Copy skill review-pr → ~/.claude/skills/review-pr",
            auto("●") + "  plugin   claude plugin install code-review@1.4.0",
            span("t-mut", "○") + "  secret   HLOCK_SECRET_GITHUB_GITHUB_TOKEN  " + warn("not set"),
          ],
          gap: 140,
        },
        { out: ["Run 4 automatic steps? [Y/n]: " + hi("y")] },
        {
          out: [
            ok("✓") + " Write ~/.claude/settings.json",
            ok("✓") + " Write ~/.claude.json /mcpServers",
            ok("✓") + " Copy skill review-pr",
            ok("✓") + " Install plugin code-review@1.4.0",
          ],
          gap: 160,
        },
        { out: ["", warn("1 step needs you:") + " export HLOCK_SECRET_GITHUB_GITHUB_TOKEN=…"] },
        { out: [arrow("next →") + " hlock sync --skill " + dim("(let your agent do it)")] },
      ],
    },
    launch: {
      title: "ci-runner — bash",
      steps: [
        { cmd: "hlock launch" },
        {
          out: [
            ok("✓") + " Write .hlock/env/claude-code/config/settings.json",
            ok("✓") + " Write .hlock/env/claude-code/config/.claude.json /mcpServers",
            ok("✓") + " Copy skill review-pr → .hlock/env/claude-code/config/skills/",
            auto("▶") + " " + hi("Claude Code") + "  " + dim("CLAUDE_CONFIG_DIR=.hlock/env/claude-code/config claude"),
          ],
          gap: 220,
        },
        { wait: 1000 },
        { cmd: 'hlock run "summarize README.md"' },
        { out: [dim("▶ claude -p, on the locked setup")] },
        { out: [mut("README.md describes a CLI that pins an agent harness's setup…")], gap: 400 },
        { wait: 600 },
        { cmd: "hlock launch opencode --dry-run" },
        {
          out: [
            ok("✓") + " wrote 1 MCP server to .hlock/env/opencode/xdg/opencode/opencode.json",
            ok("✓") + " copied 1 skill to .hlock/env/opencode/xdg/opencode/skills",
            warn("!") + " translating a Claude Code lock into OpenCode",
          ],
          gap: 200,
        },
      ],
    },
  };

  // Widest line in a scene, in characters; the terminal scales its font to fit it.
  const colsOf = (scene) => Math.max(...scene.steps.flatMap((s) =>
    s.cmd ? [s.cmd.length + 2] : (s.out || []).map(plainLen)));

  // ── terminal player ────────────────────────────────────────────────────────
  class Player {
    constructor(el) {
      this.body = el.querySelector(".term__body");
      this.title = el.querySelector(".term__title");
      this.run = 0;
    }
    stop() { this.run++; }
    async play(scene, { loop = false } = {}) {
      const id = ++this.run;
      const alive = () => id === this.run;
      do {
        if (this.title && scene.title) this.title.textContent = scene.title;
        this.body.style.setProperty("--cols", colsOf(scene) + 1);
        this.body.innerHTML = "";
        if (reduced) { this.renderStatic(scene); return; }
        for (const step of scene.steps) {
          if (!alive()) return;
          if (step.cmd) await this.type(step.cmd, alive);
          else if (step.out) {
            for (const line of step.out) {
              if (!alive()) return;
              this.line(line);
              await sleep(step.gap ?? 90);
            }
            await sleep(180);
          } else if (step.wait) await sleep(step.wait);
        }
        if (!alive()) return;
        this.prompt(true);
        if (loop) await sleep(1200);
      } while (loop && alive());
    }
    renderStatic(scene) {
      const html = [];
      for (const step of scene.steps) {
        if (step.cmd) html.push(span("t-pr", "$ ") + span("t-cmd", escape(step.cmd)));
        if (step.out) html.push(...step.out);
      }
      this.body.innerHTML = html.join("\n");
    }
    line(html) {
      this.removeCursor();
      this.body.insertAdjacentHTML("beforeend", (this.body.innerHTML ? "\n" : "") + html);
      this.body.scrollTop = this.body.scrollHeight;
    }
    prompt(withCursor) {
      this.line(span("t-pr", "$ ") + (withCursor ? '<span class="cursor"></span>' : ""));
    }
    removeCursor() { this.body.querySelectorAll(".cursor").forEach((c) => c.remove()); }
    async type(text, alive) {
      this.line(span("t-pr", "$ ") + '<span class="t-cmd"></span><span class="cursor"></span>');
      const target = this.body.querySelectorAll(".t-cmd");
      const el = target[target.length - 1];
      await sleep(350);
      for (const ch of text) {
        if (!alive()) return;
        el.textContent += ch;
        await sleep(18 + Math.random() * 38);
      }
      await sleep(380);
      this.removeCursor();
    }
  }
  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // Run something once when an element scrolls into view.
  function onView(el, fn, threshold = 0.35) {
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { fn(); io.disconnect(); }
    }, { threshold });
    io.observe(el);
  }

  // ── hero terminal ──────────────────────────────────────────────────────────
  const heroTerm = document.getElementById("hero-term");
  if (heroTerm) new Player(heroTerm).play(scenes.hero, { loop: true });

  // ── workflow tabs ──────────────────────────────────────────────────────────
  const flow = document.querySelector(".flow");
  const flowTerm = document.getElementById("flow-term");
  if (flow && flowTerm) {
    const player = new Player(flowTerm);
    const tabs = [...flow.querySelectorAll(".flow__tab")];
    let current = 0;
    let timer;
    let manual = false;

    const durationOf = (scene) => {
      let ms = 0;
      for (const s of scene.steps) {
        if (s.cmd) ms += 350 + s.cmd.length * 40 + 380;
        if (s.out) ms += s.out.length * (s.gap ?? 90) + 180;
        if (s.wait) ms += s.wait;
      }
      return ms + 3200;
    };

    const select = (i) => {
      current = i;
      const name = tabs[i].dataset.scene;
      const scene = scenes[name];
      const dur = durationOf(scene);
      tabs.forEach((t, j) => {
        const on = j === i;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on);
        t.style.setProperty("--dur", dur + "ms");
        const bar = t.querySelector(".flow__bar");
        bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
      });
      player.play(scene);
      clearTimeout(timer);
      if (!manual && !reduced) timer = setTimeout(() => select((current + 1) % tabs.length), dur);
    };

    tabs.forEach((t, i) => t.addEventListener("click", () => {
      manual = true;
      flow.classList.add("is-manual");
      tabs.forEach((x) => x.style.setProperty("--dur", "0ms"));
      select(i);
      tabs[i].querySelector(".flow__bar").style.animation = "none";
      tabs[i].querySelector(".flow__bar").style.transform = "scaleX(1)";
    }));

    onView(flow, () => select(0), 0.3);
  }

  // ── problem → lock convergence ─────────────────────────────────────────────
  const stage = document.getElementById("lockstage");
  if (stage) {
    stage.querySelectorAll(".lockfile__body .l").forEach((l, i) => l.style.setProperty("--i", i));
    stage.querySelectorAll(".fly").forEach((f, i) => f.style.setProperty("--d", -i * 0.9 + "s"));
    // let the scattered pieces float in place for a few seconds before they converge
    const LINGER = 3000;
    let pending;
    const lock = () => stage.classList.add("is-locked");
    if (reduced) lock(); else onView(stage, () => { pending = setTimeout(lock, LINGER); }, 0.45);
    document.getElementById("lock-replay")?.addEventListener("click", () => {
      clearTimeout(pending);
      stage.classList.remove("is-locked");
      pending = setTimeout(lock, LINGER);
    });
  }

  // ── secrets redaction ──────────────────────────────────────────────────────
  const redact = document.getElementById("redact");
  if (redact) {
    if (reduced) redact.classList.add("is-redacted");
    else onView(redact, () => {
      setTimeout(() => redact.classList.add("is-redacted"), 900);
      // keep demonstrating it, slowly
      setInterval(() => {
        redact.classList.remove("is-redacted");
        setTimeout(() => redact.classList.add("is-redacted"), 1400);
      }, 7000);
    }, 0.6);
  }

  // ── pareto chart ───────────────────────────────────────────────────────────
  const pareto = document.getElementById("pareto");
  if (pareto) onView(pareto, () => pareto.classList.add("is-in"), 0.5);

  // ── reveal-on-scroll for section blocks ────────────────────────────────────
  if (!reduced) {
    const els = document.querySelectorAll(
      ".section h2, .section .sub, .section .kicker, .pain, .analogy__row, .target, .card, .agentskill, .scatter, .quick"
    );
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => {
      el.classList.add("reveal");
      const sib = [...el.parentElement.children].filter((c) => c.classList.contains(el.classList[0]));
      const idx = sib.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx, 5) * 80 + "ms";
      io.observe(el);
      // once revealed, drop the reveal transition so hover effects stay snappy
      el.addEventListener("transitionend", () => {
        if (el.classList.contains("is-in")) { el.classList.remove("reveal"); el.style.transitionDelay = ""; }
      }, { once: false });
    });
  }

  // ── cursor glow on cards ───────────────────────────────────────────────────
  document.querySelectorAll(".target, .card").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // ── copy buttons ───────────────────────────────────────────────────────────
  async function copy(text, btn, label) {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    btn.classList.add("is-copied");
    const prev = btn.textContent;
    if (label) btn.textContent = label;
    setTimeout(() => { btn.classList.remove("is-copied"); if (label) btn.textContent = prev; }, 1600);
  }
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy, b)));
  document.querySelectorAll("[data-copy-target]").forEach((b) => b.addEventListener("click", () => {
    const pre = document.getElementById(b.dataset.copyTarget);
    const cmds = pre.textContent.split("\n").map((l) => l.replace(/^\$\s*/, "").replace(/\s+#.*$/, "").trim()).filter(Boolean);
    copy(cmds.join("\n"), b, "Copied");
  }));

  // ── sign up modal (hlock cloud waitlist) ───────────────────────────────────
  const signup = document.getElementById("signup");
  if (signup) {
    const opt = signup.querySelector(".pv--opt");
    const reg = signup.querySelector(".pv--reg");
    const trials = signup.querySelector(".pv__trials");
    const query = signup.querySelector(".reg__query");
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    // replay the product preview each time the modal opens
    const playPreview = () => {
      timers.forEach(clearTimeout); timers = [];
      for (const pv of [opt, reg]) { pv.classList.remove("is-live", "is-done"); void pv.offsetWidth; }
      const total = 48;
      if (reduced) {
        opt.classList.add("is-live", "is-done"); reg.classList.add("is-live");
        trials.textContent = `${total} trials · done`; query.textContent = query.dataset.query;
        return;
      }
      // registry first: type the search, show the results
      query.textContent = "";
      [...query.dataset.query].forEach((ch, i) => later(() => { query.textContent += ch; }, 400 + i * 85));
      const found = 400 + query.dataset.query.length * 85 + 250;
      later(() => reg.classList.add("is-live"), found);
      // then optimization: run the trials and pick a winner
      const go = found + 700;
      trials.textContent = `trial 0 / ${total}`;
      later(() => opt.classList.add("is-live"), go);
      for (let n = 1; n <= total; n++) later(() => { trials.textContent = `trial ${n} / ${total}`; }, go + 300 + n * 62);
      later(() => { opt.classList.add("is-done"); trials.textContent = `${total} trials · done`; }, go + 3500);
    };

    const open = () => {
      if (signup.open) return;
      signup.showModal();
      playPreview();
      signup.querySelector('input[name="email"]')?.focus();
    };
    document.querySelectorAll("[data-signup]").forEach((b) => b.addEventListener("click", open));
    signup.querySelector("[data-signup-close]").addEventListener("click", () => signup.close());
    signup.addEventListener("click", (e) => { if (e.target === signup) signup.close(); });   // backdrop
    signup.addEventListener("close", () => { timers.forEach(clearTimeout); timers = []; });
    if (location.hash === "#signup") open();

    // Submits to a HubSpot form through the Forms API (no key needed; the ids are public).
    const form = document.getElementById("waitlist");
    const status = form.querySelector(".waitlist__status");
    const submit = form.querySelector(".waitlist__submit");
    const email = form.elements.email;
    const hsUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${form.dataset.hsPortal}/${form.dataset.hsForm}`;
    const cookie = (name) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
    const field = (name, value) => ({ objectTypeId: "0-1", name, value });   // 0-1 = contact property
    const post = (fields) => fetch(hsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields,
        context: { pageUri: location.href, pageName: "hlock · waitlist", ...(cookie("hubspotutk") && { hutk: cookie("hubspotutk") }) },
      }),
    });

    email.addEventListener("input", () => email.removeAttribute("aria-invalid"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "";
      if (!email.checkValidity()) {
        email.setAttribute("aria-invalid", "true");
        status.textContent = "Enter a valid email address.";
        email.focus();
        return;
      }
      if (form.elements.company_website.value) return;                    // honeypot: bots fill it in
      const base = [field("email", email.value.trim())];
      // HubSpot internal property names (labels: hlock-ai-harness, hlock-ai-interests)
      const extra = [
        field("harness", form.elements.harness.value),
        field("hlockinterests", [...form.querySelectorAll('[name="interest"]:checked')].map((c) => c.value).join(";")),
      ].filter((f) => f.value);
      submit.disabled = true;
      try {
        let res = await post([...base, ...extra]);
        // If the HubSpot form is missing a field (or rejects a value), still capture the email.
        if (res.status === 400 && extra.length) res = await post(base);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err.errors?.some((x) => x.errorType === "INVALID_EMAIL")) {
            email.setAttribute("aria-invalid", "true");
            throw new Error("Enter a valid email address.");
          }
          throw new Error();
        }
        form.hidden = true;
        signup.querySelector(".waitlist__done").hidden = false;
      } catch (err) {
        status.textContent = err.message || "Something went wrong. Please try again in a moment.";
      } finally {
        submit.disabled = false;
      }
    });
  }

  // ── nav border on scroll ───────────────────────────────────────────────────
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
