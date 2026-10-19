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

  // The hero cycles through these harnesses, one pin → pull → sync round each. Paths follow
  // each harness's profile in hlock (crates/harness-lock-core/profiles/harnesses/).
  const harnesses = [
    {
      id: "claude-code", name: "Claude Code", version: "2.1.285", llm: "anthropic:opus", root: "~/.claude",
      config: "{root}/settings.json, ~/.claude.json /mcpServers",
      writes: ["~/.claude/settings.json", "~/.claude.json /mcpServers"],
    },
    {
      id: "pi", name: "Pi", version: "1.0.0", llm: "openrouter:qwen/qwen3-coder", root: "~/.pi/agent",
      config: "{root}/settings.json, {root}/mcp.json",
      writes: ["~/.pi/agent/settings.json", "~/.pi/agent/mcp.json"],
    },
    {
      id: "codex", name: "Codex CLI", version: "0.50.0", llm: "openai:gpt-5-codex", root: "~/.codex",
      config: "{root}/config.toml",
      writes: ["~/.codex/config.toml"],
    },
    {
      id: "opencode", name: "OpenCode", version: "1.18.18", llm: "anthropic:claude-sonnet-4-5", root: "~/.config/opencode",
      config: "{root}/opencode.json",
      writes: ["~/.config/opencode/opencode.json"],
    },
    {
      id: "hermes", name: "Hermes Agent", version: "0.20.0", llm: "nous:hermes-4-405b", root: "~/.hermes",
      config: "{root}/config.yaml",
      writes: ["~/.hermes/config.yaml"],
    },
  ];
  const heroSkills = ["review-pr", "write-tests"];
  const plan = (kind, title) => kind.padEnd(9) + title;

  // Two scenes per harness, each a terminal on one machine: pin and push on a laptop, then
  // pull and sync on a new one. The hero terminal swipes between them.
  function heroScenes(h) {
    const setup = [
      kv("harness", `${h.id} ${h.version}`),
      kv("llm · default", h.llm),
      kv("mcp", "github (stdio), linear (http)"),
      kv("skills", "2  (2 local)"),
      kv("config", h.config),
      kv("secrets", "1 redacted  " + dim("(supplied as HLOCK_SECRET_* when syncing)")),
    ];
    const copies = heroSkills.map((sk) => `Copy skill ${sk} → ${h.root}/skills/${sk}`);
    const done = [...h.writes.map((w) => "Write " + w), ...copies];
    return [
      {
        title: "laptop — ~/projects/my-app",
        caption: `On your laptop: pin your ${h.name} setup into harness.lock, then push it to GitHub.`,
        steps: [
          { cmd: "hlock pin" },
          { out: [ok("✓") + " pinned " + hi(`${h.id} ${h.version}`) + " → harness.lock  " + dim("(running inside it)")] },
          { out: box(hi("harness.lock · pinned"), setup), gap: 45 },
          { out: [mut(`vendored ${done.length} files into .hlock/vendor/${h.id}/  · review before committing`)] },
          { out: [arrow("next →") + " hlock check  ·  hlock sync"] },
          { wait: 900 },
          { cmd: 'git add harness.lock .hlock/ && git commit -qm "lock my agent"' },
          { cmd: "git push" },
          { out: [dim("To ") + hi("github.com:you/my-app.git"), dim("   b259f53..4e1c9a2  main -> main")] },
          { wait: 2200 },
        ],
      },
      {
        title: "new-laptop — ~",
        caption: `On a new machine: pull the lock from GitHub, then sync it into ${h.root}.`,
        steps: [
          { cmd: "hlock pull github:you/my-app" },
          { out: [ok("✓") + " pulled " + hi("github:you/my-app") + " @ 4e1c9a2 → you"] },
          { out: box(hi("you · pinned"), [...setup, kv("pulled", "github:you/my-app @ 4e1c9a2")]), gap: 45 },
          { out: [warn("!") + " starts MCP servers with: npx  " + mut("· review before syncing into your own config")] },
          { wait: 900 },
          { cmd: "export HLOCK_SECRET_GITHUB_GITHUB_TOKEN=ghp_…" },
          { cmd: "hlock sync you --in-place --yes" },
          { out: [hi("Sync plan") + ` for ${h.name} ${h.version} → your config ${h.root}`] },
          {
            out: [
              ok("✓") + "  " + plan("harness", `${h.name} ${h.version}`),
              ok("✓") + "  " + plan("mcp", "`npx` for MCP servers: github"),
              ok("✓") + "  " + plan("secret", "HLOCK_SECRET_GITHUB_GITHUB_TOKEN (mcp github GITHUB_TOKEN)"),
              ...h.writes.map((w) => auto("●") + "  " + plan("config", "Write " + w)),
              ...copies.map((c) => auto("●") + "  " + plan("skill", c)),
            ],
            gap: 120,
          },
          { out: done.map((d) => ok("✓") + " " + d), gap: 160 },
          { out: [ok("✓") + " in sync with ~/.hlock/pulls/you/harness.lock"] },
          { wait: 3600 },
        ],
      },
    ];
  }

  // A checklist marker that a later { mark } step ticks off.
  const todo = (id) => `<span class="t-mark t-mut" data-m="${id}">○</span>`;

  const scenes = {
    meta: {
      title: "~/projects/my-app",
      steps: [
        { cmd: "hlock meta run install" },
        { out: [dim("▶ meta harness · built-in agent · job: install")] },
        { wait: 300 },
        { out: [arrow("→") + " agent reads the sync plan"] },
        {
          out: [
            mut("  2 steps hlock can't do on its own:"),
            "    " + todo("mcp") + " mcp server " + hi("github") + "    " + dim("needs npm"),
            "    " + todo("plugin") + " plugin " + hi("code-review") + "   " + dim("needs the claude CLI"),
          ],
          gap: 220,
        },
        { wait: 700 },
        { out: [warn("?") + " agent asks to run:", "    npm i -g @modelcontextprotocol/server-github", warn("  allow? [y/N] ")], gap: 140 },
        { reply: "y" },
        { out: ["  " + ok("✓") + " installed"] },
        { mark: "mcp" },
        { wait: 500 },
        { out: [warn("?") + " agent asks to run:", "    claude plugin install code-review@1.4.0", warn("  allow? [y/N] ")], gap: 140 },
        { reply: "y" },
        { out: ["  " + ok("✓") + " installed"] },
        { mark: "plugin" },
        { wait: 500 },
        { out: [arrow("→") + " agent runs " + hi("hlock sync --yes")] },
        { out: ["  " + ok("✓") + " config, skills, and plugins restored"], gap: 400 },
        { out: [arrow("→") + " agent verifies with " + hi("hlock check")] },
        { out: [ok("✓ in sync with harness.lock") + dim("  · job done")], gap: 300 },
        { wait: 4200 },
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
          } else if (step.reply) await this.reply(step.reply, alive);
          else if (step.mark) { this.mark(step.mark); await sleep(350); }
          else if (step.wait) await sleep(step.wait);
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
        if (step.reply) html[html.length - 1] += span("t-cmd", step.reply);
      }
      this.body.innerHTML = html.join("\n");
      scene.steps.forEach((step) => step.mark && this.mark(step.mark));
    }
    // Tick off a todo() marker printed earlier.
    mark(id) {
      const m = this.body.querySelector(`[data-m="${id}"]`);
      if (m) { m.textContent = "✓"; m.classList.add("is-done"); }
    }
    // Wait at a prompt on the current line, then type an answer.
    async reply(text, alive) {
      this.body.insertAdjacentHTML("beforeend", '<span class="t-cmd"></span><span class="cursor"></span>');
      const all = this.body.querySelectorAll(".t-cmd");
      const el = all[all.length - 1];
      await sleep(900);
      if (!alive()) return;
      el.textContent = text;
      await sleep(300);
      this.removeCursor();
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
  // Each harness gets two scenes (laptop, then new machine); the window swipes between them
  // and the caption under it says what's happening.
  const heroTerm = document.getElementById("hero-term");
  if (heroTerm) {
    const all = harnesses.flatMap(heroScenes);
    const player = new Player(heroTerm);
    const caption = heroTerm.querySelector(".term__caption");
    const always = () => true;
    // Size the font to the widest line across every scene, so it doesn't jump between them.
    player.body.style.setProperty("--cols", Math.max(...all.map(colsOf)) + 1);

    const show = (i) => {
      player.title.textContent = all[i].title;
      caption.innerHTML = `<span class="term__step">${i % 2 + 1}/2</span>` + escape(all[i].caption);
      player.body.innerHTML = "";
    };
    // Slide the window out to the left and a fresh one in from the right, like switching to
    // another machine; `swap` runs while it's off screen.
    const swipe = async (swap) => {
      heroTerm.classList.add("is-leaving");
      await sleep(450);
      swap();
      heroTerm.classList.remove("is-leaving");
      heroTerm.classList.add("is-entering");
      void heroTerm.offsetWidth;
      heroTerm.classList.remove("is-entering");
      await sleep(450);
    };
    const playSteps = async (scene) => {
      for (const step of scene.steps) {
        if (step.cmd) await player.type(step.cmd, always);
        else if (step.out) {
          for (const l of step.out) { player.line(l); await sleep(step.gap ?? 90); }
          await sleep(180);
        } else if (step.wait) await sleep(step.wait);
      }
    };

    if (reduced) {
      // No animation: print the first harness's two scenes in one window, each under its
      // machine's name.
      heroTerm.classList.add("is-static");
      player.title.textContent = all[0].title;
      caption.remove();
      player.body.innerHTML = all.slice(0, 2).flatMap((sc, i) => [
        ...(i ? ["", dim("# " + sc.title)] : []),
        dim("# " + sc.caption),
        ...sc.steps.flatMap((s) => s.cmd ? [span("t-pr", "$ ") + span("t-cmd", escape(s.cmd))] : s.out || []),
      ]).join("\n");
    } else {
      (async () => {
        show(0);
        for (let i = 0; ; i = (i + 1) % all.length) {
          await playSteps(all[i]);
          const next = (i + 1) % all.length;
          await swipe(() => show(next));
        }
      })();
    }
  }

  // ── meta harness terminal ──────────────────────────────────────────────────
  const metaTerm = document.getElementById("meta-term");
  if (metaTerm) onView(metaTerm, () => new Player(metaTerm).play(scenes.meta, { loop: true }), 0.4);

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
      if (reduced) {
        opt.classList.add("is-live", "is-done"); reg.classList.add("is-live");
        trials.textContent = "done"; query.textContent = query.dataset.query;
        return;
      }
      // registry first: type the search, show the results
      query.textContent = "";
      [...query.dataset.query].forEach((ch, i) => later(() => { query.textContent += ch; }, 400 + i * 85));
      const found = 400 + query.dataset.query.length * 85 + 250;
      later(() => reg.classList.add("is-live"), found);
      // then optimization: run the trials and pick a winner
      const go = found + 700;
      trials.textContent = "running trials";
      later(() => opt.classList.add("is-live"), go);
      later(() => { opt.classList.add("is-done"); trials.textContent = "done"; }, go + 3400);
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
