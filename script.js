// A refresh starts at the top. Browsers otherwise return to the old scroll position, or to the
// #section left in the address bar by a menu click. Opening a shared link like /#experience still
// goes to that section, because that is a normal navigation, not a reload.
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  if (!nav || nav.type !== "reload") return;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  toTop();
  window.addEventListener("load", toTop, { once: true }); // some browsers jump again on load
})();

document.getElementById("year").textContent = new Date().getFullYear();

// The email address is put together here, in the visitor's browser, so it never appears in the
// page's code where spam bots harvest addresses. Links marked data-email become mailto links.
const EMAIL = ["seanxdas", "gmail.com"].join(String.fromCharCode(64));
document.querySelectorAll("a[data-email]").forEach((a) => {
  // data-subject pre-fills the subject line, e.g. "Resume request"
  a.href = "mailto:" + EMAIL + (a.dataset.subject ? "?subject=" + encodeURIComponent(a.dataset.subject) : "");
  a.dataset.addr = EMAIL; // shown after the link when printed
});

// Theme toggle (light/dark). The saved choice is applied earlier, by theme.js in the <head>.
(function () {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  });
})();

// Copy email buttons with instant tooltip
(function () {
  document.querySelectorAll(".copy-email-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const email = EMAIL;
      navigator.clipboard.writeText(email).then(() => {
        btn.classList.add("copied");
        setTimeout(() => btn.classList.remove("copied"), 2000);
      }).catch(() => {});
    });
  });
})();

// Nav Scrollspy: active section indicator
(function () {
  const navLinks = document.querySelectorAll('.site-nav nav a[href^="#"]');
  // Watch every section, including ones without a nav link (the hero, What I bring and the stats),
  // so scrolling back up to them clears the underline instead of leaving the last link active.
  const sections = Array.from(document.querySelectorAll("main > section"));
  if (!navLinks.length || !sections.length || !("IntersectionObserver" in window)) return;

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach((link) => {
          if (id && link.getAttribute("href") === `#${id}`) link.classList.add("active");
          else link.classList.remove("active");
        });
      }
    });
  }, { rootMargin: "-20% 0px -65% 0px" });

  sections.forEach((s) => spy.observe(s));
})();

// Fade cards in as they scroll into view. Without IntersectionObserver, show them all.
(function () {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const el = e.target;
        el.classList.add("is-visible");
        el.addEventListener("transitionend", () => el.classList.add("is-settled"), { once: true });
        setTimeout(() => el.classList.add("is-settled"), 700);
        io.unobserve(el);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  // Cards already on screen stay visible (no blink on load); only those below the fold fade in.
  items.forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible", "is-settled");
  });
  // Cards are only hidden (see styles.css) once this class is set, so if this script ever
  // fails, the page stays fully visible instead of blank.
  document.documentElement.classList.add("reveal-ready");
  items.forEach((el) => io.observe(el));
})();

// Interactive card spotlight (smooth cursor-tracking glow across glass surfaces, rAF-throttled and paused during scroll)
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let scrolling = false;
  let scrollTimer = 0;
  let rafId = 0;
  let pendingCard = null;
  let pendingX = 0;
  let pendingY = 0;

  const markScrolling = () => {
    scrolling = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrolling = false; }, 120);
  };
  window.addEventListener("scroll", markScrolling, { passive: true });
  window.addEventListener("wheel", markScrolling, { passive: true });

  document.querySelectorAll(".glass").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      if (scrolling) return;
      pendingCard = card;
      pendingX = e.clientX;
      pendingY = e.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!pendingCard || scrolling) return;
        const rect = pendingCard.getBoundingClientRect();
        pendingCard.style.setProperty("--mouse-x", `${pendingX - rect.left}px`);
        pendingCard.style.setProperty("--mouse-y", `${pendingY - rect.top}px`);
      });
    }, { passive: true });
  });
})();

// Stat counter animation (smooth vertical odometer with top/bottom fade mask)
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Wrap each letter of a .stat-spin word so the letters can pan in one after another.
  if (!reduced) document.querySelectorAll(".stat-spin").forEach((el) => {
    const word = el.textContent.trim();
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    [...word].forEach((ch, i) => {
      const letter = document.createElement("span");
      letter.className = "pan-letter";
      letter.textContent = ch;
      letter.style.setProperty("--delay", `${i * 0.05}s`); // ends with the 12+ counter
      wrap.appendChild(letter);
    });
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = word;
    el.replaceChildren(wrap, sr);
  });

  const reels = document.querySelectorAll(".stat-reel-wrap, .stat-spin");
  if (!reels.length) return;
  if (!("IntersectionObserver" in window) || reduced) {
    reels.forEach((r) => r.classList.add("is-animated")); // show the final values
    return;
  }

  // Start "12+ years" and "Millions" at 50% of the load-in sheen/glisten
  // on "Sean Das" and the Web/iOS/Android cards.
  const INTRO_ANIMATIONS = new Set(["name-sheen", "name-glisten", "platform-sheen"]);
  const INTRO_OVERLAP_RATIO = 0.5;
  function waitForHeroIntro() {
    const canAnimate = window.matchMedia("(prefers-reduced-motion: no-preference) and (forced-colors: none)").matches;
    if (!canAnimate) return Promise.resolve();

    // Flush styles so CSS animations triggered by .reveal-ready are registered.
    void document.documentElement.offsetWidth;

    if (typeof document.getAnimations === "function") {
      const anims = document.getAnimations().filter((a) => INTRO_ANIMATIONS.has(a.animationName));
      if (!anims.length) return Promise.resolve();

      const maxRemaining = Math.max(...anims.map((a) => {
        const { delay, duration } = a.effect.getTiming();
        return delay + duration * INTRO_OVERLAP_RATIO - (a.currentTime || 0);
      }), 0);
      return new Promise((resolve) => setTimeout(resolve, maxRemaining));
    }

    return new Promise((resolve) => setTimeout(resolve, 950));
  }

  let introDone = false;
  const heroIntroDone = waitForHeroIntro().then(() => {
    introDone = true;
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target;
        io.unobserve(target);
        if (introDone) {
          setTimeout(() => target.classList.add("is-animated"), 150);
        } else {
          heroIntroDone.then(() => target.classList.add("is-animated"));
        }
      }
    });
  }, { threshold: 0.3 });

  reels.forEach((r) => io.observe(r));
})();

// Test-automation demo terminal (a scripted animation, not real test output)
(function () {
  const runner = document.querySelector(".smoke-runner");
  if (!runner) return;
  const btn = runner.querySelector(".smoke-btn");
  const btnText = runner.querySelector(".smoke-btn-text");
  const resetBtn = runner.querySelector(".smoke-reset-btn");
  const terminal = runner.querySelector(".smoke-terminal");
  const output = runner.querySelector(".smoke-output");
  if (!btn || !output || !terminal) return;

  const testSteps = [
    { cmd: "/create-e2e-test for JIRA-12345", isPrompt: true, delay: 520 },
    { text: "  Generating an end-to-end test for JIRA-12345", cls: "dim", delay: 620 },
    { text: "  ........................................................", cls: "dim dots", delay: 600 },
    { text: "  Test created for JIRA-12345  ✓", cls: "ai-pass", delay: 580 },
    { text: "  Checking for flakiness…  ✓", cls: "ai-pass", delay: 620 },
    { text: "  Passed 3 runs in a row, alone and in a batch  ✓", cls: "ai-pass", delay: 620 },
    { cmd: "./run-regression.sh --web --android --ios", isPrompt: true, delay: 520 },
    { text: "  Running regression suites across web, Android and iOS…", cls: "dim", delay: 520 },
    { text: "  ✓ [Web] Playwright regression suite — PASS", cls: "pass", delay: 580 },
    { text: "  ✓ [Android] Espresso regression suite — PASS", cls: "pass", delay: 580 },
    { text: "  ✓ [iOS] XCUITest regression suite — PASS", cls: "pass", delay: 550 },
    { text: "  ✓ [Audit] Accessibility (WCAG 2.1 AA) and analytics tag checks — PASS", cls: "pass", delay: 420 },
    { text: "  ✔ All suites green · ready for the release-readiness call", cls: "summary", delay: 250 }
  ];

  let isRunning = false;
  let timerId = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function resetTerminal() {
    if (timerId) clearTimeout(timerId);
    isRunning = false;
    output.replaceChildren();

    const promptLine = document.createElement("div");
    promptLine.className = "smoke-line prompt";
    const pSpan = document.createElement("span");
    pSpan.className = "cmd-prompt";
    pSpan.textContent = "$";
    promptLine.appendChild(pSpan);
    promptLine.appendChild(document.createTextNode("/create-e2e-test for JIRA-12345"));

    const dimLine = document.createElement("div");
    dimLine.className = "smoke-line dim";
    dimLine.textContent = '// Click "Execute" to generate an AI test & run multi-platform suite';

    output.appendChild(promptLine);
    output.appendChild(dimLine);
    terminal.scrollTo({ top: 0, behavior: "instant" });

    btn.classList.remove("is-running", "is-done");
    btnText.textContent = "Execute";
    if (resetBtn) {
      resetBtn.classList.remove("is-visible");
      resetBtn.disabled = false;
    }
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (isRunning) return;
      resetTerminal();
    });
  }

  btn.addEventListener("click", () => {
    if (isRunning) return;
    isRunning = true;
    if (resetBtn) {
      resetBtn.disabled = true;
    }
    btn.classList.add("is-running");
    btn.classList.remove("is-done");
    btnText.textContent = "Executing…";
    output.replaceChildren();
    terminal.scrollTo({ top: 0, behavior: "instant" });

    let stepIndex = 0;
    function nextStep() {
      if (stepIndex >= testSteps.length) {
        isRunning = false;
        btn.classList.remove("is-running");
        btn.classList.add("is-done");
        btnText.textContent = "Run again";
        if (resetBtn) {
          resetBtn.classList.add("is-visible");
          resetBtn.disabled = false;
        }
        return;
      }
      const step = testSteps[stepIndex++];
      const line = document.createElement("div");
      // Auto-scroll so older lines scroll up and at most 4-5 lines stay visible
      const scrollDown = () => requestAnimationFrame(() => { terminal.scrollTop = terminal.scrollHeight; });
      if (step.isPrompt) {
        line.className = "smoke-line prompt";
        const promptSpan = document.createElement("span");
        promptSpan.className = "cmd-prompt";
        promptSpan.textContent = "$";
        line.appendChild(promptSpan);
        const typed = document.createTextNode("");
        line.appendChild(typed);
        output.appendChild(line);
        scrollDown();
        if (reduceMotion.matches) {
          typed.data = step.cmd;
          timerId = setTimeout(nextStep, step.delay);
          return;
        }
        // Typewriter: type the command one character at a time behind a blinking cursor
        const caret = document.createElement("span");
        caret.className = "smoke-caret";
        caret.setAttribute("aria-hidden", "true");
        line.appendChild(caret);
        let i = 0;
        (function typeChar() {
          typed.data = step.cmd.slice(0, ++i);
          if (i < step.cmd.length) {
            timerId = setTimeout(typeChar, 26 + Math.random() * 34);
          } else {
            timerId = setTimeout(() => { caret.remove(); nextStep(); }, step.delay);
          }
        })();
        return;
      }
      line.className = "smoke-line " + step.cls;
      if (step.cls.includes("dots")) line.setAttribute("aria-hidden", "true"); // decoration: keep screen readers quiet
      line.textContent = step.text;
      output.appendChild(line);
      scrollDown();
      timerId = setTimeout(nextStep, step.delay);
    }

    timerId = setTimeout(nextStep, 180);
  });
})();

// Skills cards: click an area to move it to the top, widen it across the row and show every skill (one open at a time).
// While a card is open, a "See all" card sits right after it; opening it shows every area in one table.
(function () {
  const container = document.querySelector(".skills");
  if (!container) return;
  const areas = Array.from(container.querySelectorAll(".skill-card"));
  if (!areas.length) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  container.classList.add("js-cards"); // collapses the cards (see styles.css)

  // Build the "See all" card: a table of every area and its skills, copied from the cards
  const total = areas.reduce((n, c) => n + c.querySelectorAll("li").length, 0);
  const allCard = document.createElement("div");
  allCard.className = "skill-group skill-card skill-card-all";
  allCard.innerHTML = `<h3><button class="skill-card-head" type="button" aria-expanded="false" aria-controls="skills-all">
      <svg class="platform-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <span class="skill-card-title">See all</span>
      <span class="skill-card-count">${total} skills in ${areas.length} areas</span>
      <svg class="skill-card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </button></h3>
    <div class="skills-table-wrap" id="skills-all"><table class="skills-table"><tbody></tbody></table></div>`;
  const tbody = allCard.querySelector("tbody");
  areas.forEach((c) => {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = c.querySelector(".skill-card-title").textContent;
    const td = document.createElement("td");
    td.appendChild(c.querySelector("ul").cloneNode(true)).removeAttribute("id");
    row.append(th, td);
    tbody.appendChild(row);
  });
  container.appendChild(allCard);

  const cards = [...areas, allCard];
  cards.forEach((card) => card.querySelectorAll("li").forEach((li, i) => li.style.setProperty("--i", Math.min(i, 12))));

  // Change the layout, sliding each card from its old spot in the grid to its new one (FLIP)
  function relayout(change) {
    const before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    change();
    if (reduceMotion.matches) return;
    cards.forEach((c) => {
      const was = before.get(c);
      if (!was.width) return; // was hidden (the "See all" card appearing)
      const now = c.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if ((!dx && !dy) || !c.animate) return;
      c.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
      );
    });
  }

  function setOpen(card, open) {
    card.classList.toggle("is-open", open);
    card.querySelector(".skill-card-head").setAttribute("aria-expanded", String(open));
  }

  // Open one card (or none): it moves to the top with "See all" right after it, so it's easy to spot;
  // the other areas keep their order
  function show(card) {
    relayout(() => {
      cards.forEach((c) => setOpen(c, c === card));
      container.classList.toggle("has-open", Boolean(card));
      const rest = cards.filter((c) => c !== card && c !== allCard);
      (card ? [card, ...(card === allCard ? [] : [allCard]), ...rest] : cards).forEach((c) => container.appendChild(c));
    });
  }

  cards.forEach((card) => {
    card.querySelector(".skill-card-head").addEventListener("click", () => {
      show(card.classList.contains("is-open") ? null : card);
    });
  });

  // The hero's platform cards and tool chips ask for an area to be opened (see "Hero shortcuts" below)
  document.addEventListener("open-skill-area", (e) => {
    const card = areas.find((c) => c.dataset.category === e.detail);
    if (card && !card.classList.contains("is-open")) show(card);
  });

  container.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const card = cards.find((c) => c.classList.contains("is-open"));
    if (!card) return;
    show(null);
    (card === allCard ? areas[0] : card).querySelector(".skill-card-head").focus(); // "See all" hides once closed
  });
})();

// Case study preview: show the summary and a faded start of the story; a button reveals the full story.
// Without JS everything stays visible.
(function () {
  const card = document.querySelector(".case-card");
  const body = document.getElementById("case-full");
  const btn = card && card.querySelector(".case-toggle");
  if (!card || !body || !btn) return;
  const text = btn.querySelector(".case-toggle-text");
  const arrow = btn.querySelector(".case-toggle-arrow");

  // Preview height: about seven lines of the story, fading out (the summary above already gives the gist)
  function previewHeight() {
    const first = body.children[0];
    const line = first ? parseFloat(getComputedStyle(first).lineHeight) || 28 : 28;
    return Math.round(line * 7.2);
  }
  function collapse(scroll) {
    body.style.maxHeight = body.scrollHeight + "px";
    void body.offsetHeight; // start the animation from the full height
    card.classList.add("is-collapsed");
    body.style.maxHeight = previewHeight() + "px";
    btn.setAttribute("aria-expanded", "false");
    text.textContent = "Read the full case study";
    arrow.textContent = "↓";
    if (scroll && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: "start" });
  }
  function expand() {
    card.classList.remove("is-collapsed");
    body.style.maxHeight = body.scrollHeight + "px";
    btn.setAttribute("aria-expanded", "true");
    text.textContent = "Show less";
    arrow.textContent = "↑";
    body.addEventListener("transitionend", function done() {
      body.removeEventListener("transitionend", done);
      if (!card.classList.contains("is-collapsed")) body.style.maxHeight = "none";
    });
  }

  btn.hidden = false;
  card.classList.add("is-collapsed");
  body.style.maxHeight = previewHeight() + "px";
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", () => (card.classList.contains("is-collapsed") ? expand() : collapse(true)));
  const refit = () => { if (card.classList.contains("is-collapsed")) body.style.maxHeight = previewHeight() + "px"; };
  window.addEventListener("resize", refit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit); // web fonts change line heights
  // Print the full story, then restore the preview
  let wasCollapsed = false;
  window.addEventListener("beforeprint", () => { wasCollapsed = card.classList.contains("is-collapsed"); if (wasCollapsed) { card.classList.remove("is-collapsed"); body.style.maxHeight = "none"; } });
  window.addEventListener("afterprint", () => { if (wasCollapsed) { card.classList.add("is-collapsed"); body.style.maxHeight = previewHeight() + "px"; } });
})();

// Case study narration (pre-generated with the open-source Kokoro voice model): one Listen/Pause button with progress.
(function () {
  const btn = document.querySelector(".case-listen");
  const audio = document.querySelector(".case-audio");
  if (!btn || !audio || !audio.canPlayType("audio/mpeg")) return;
  const label = btn.querySelector(".case-listen-text");
  const toggle = document.querySelector(".case-toggle");
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const total = () => (isFinite(audio.duration) ? audio.duration : 211.4);

  // Times are shown in real listening time, so they shrink or grow with the chosen speed
  function render() {
    const playing = !audio.paused && !audio.ended;
    const rate = audio.playbackRate || 1;
    const now = audio.currentTime / rate, len = total() / rate;
    btn.classList.toggle("is-playing", playing);
    btn.style.setProperty("--p", `${(audio.currentTime / total()) * 100}%`);
    if (audio.ended) label.textContent = `Listen again · ${fmt(len)}`;
    else if (playing || audio.currentTime > 0) label.textContent = `${playing ? "Pause" : "Resume"} · ${fmt(now)} / ${fmt(len)}`;
    else label.textContent = `Listen · ${fmt(len)}`;
    btn.setAttribute("aria-label", playing ? "Pause the case study narration" : "Listen to the case study");
  }

  // Speed button: cycles through common listening speeds; the choice is remembered in this browser
  const speedBtn = document.querySelector(".case-speed");
  const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
  let speed = 1;
  try { const saved = parseFloat(localStorage.getItem("caseSpeed")); if (SPEEDS.includes(saved)) speed = saved; } catch (e) {}
  function setSpeed(v) {
    speed = v;
    audio.playbackRate = v;
    if ("preservesPitch" in audio) audio.preservesPitch = true;
    if (speedBtn) {
      speedBtn.textContent = `Speed ${v}×`;
      speedBtn.setAttribute("aria-label", `Playback speed: ${v} times. Press to change.`);
    }
    try { localStorage.setItem("caseSpeed", String(v)); } catch (e) {}
    render();
  }
  if (speedBtn) {
    speedBtn.hidden = false;
    speedBtn.addEventListener("click", () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]));
  }
  setSpeed(speed);
  audio.addEventListener("loadedmetadata", () => { audio.playbackRate = speed; }); // some browsers reset it on load

  btn.hidden = false;
  btn.addEventListener("click", () => {
    if (audio.paused || audio.ended) {
      // open the full story so listeners can read along
      if (toggle && toggle.getAttribute("aria-expanded") === "false") toggle.click();
      audio.play().catch((e) => { if (e && e.name !== "AbortError") label.textContent = "Audio unavailable"; else render(); }); // AbortError = paused before it started
    } else {
      audio.pause();
    }
  });
  ["play", "pause", "timeupdate", "ended", "loadedmetadata"].forEach((ev) => audio.addEventListener(ev, render));
  // Pause when the visitor switches tabs, backgrounds the mobile browser or leaves the page;
  // the button then shows "Resume" from the same spot.
  const pauseIfHidden = () => { if (document.hidden && !audio.paused) audio.pause(); };
  document.addEventListener("visibilitychange", pauseIfHidden);
  window.addEventListener("pagehide", () => { if (!audio.paused) audio.pause(); });
})();

// Scroll progress in the top bar: sets --scroll (0 to 1) on the nav, once per frame while scrolling
(function () {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    nav.style.setProperty("--scroll", p.toFixed(4));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  // the page gets taller when a skill card or the case study opens, so re-measure then too
  if ("ResizeObserver" in window) new ResizeObserver(queue).observe(document.body);
  update();
})();

// Hero shortcuts: each platform card and tool chip jumps to Skills and opens the matching area
(function () {
  const items = document.querySelectorAll(".hero [data-skill]");
  const skills = document.getElementById("skills");
  if (!items.length || !skills) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const go = (el) => {
    document.dispatchEvent(new CustomEvent("open-skill-area", { detail: el.dataset.skill }));
    skills.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  items.forEach((el) => {
    const name = el.textContent.trim();
    el.setAttribute("role", "link");
    el.tabIndex = 0;
    el.setAttribute("aria-label", `${name}: see my skills`);
    el.addEventListener("click", () => go(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(el); }
    });
  });
})();

// Site-wide search dialog: search skills, experience, projects, the case study and About, then jump to the match
(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function tokenize(q) {
    return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  // Render text with <mark class="search-mark"> around matched tokens using safe DOM nodes
  function appendHighlighted(parent, text, tokens) {
    if (!tokens.length) {
      parent.appendChild(document.createTextNode(text));
      return;
    }
    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(${escaped.join("|")})`, "gi");
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      const mark = document.createElement("mark");
      mark.className = "search-mark";
      mark.textContent = m[0];
      parent.appendChild(mark);
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function flashHit(el) {
    if (!el) return;
    el.classList.remove("search-hit");
    void el.offsetWidth;
    el.classList.add("search-hit");
    window.setTimeout(() => el.classList.remove("search-hit"), 2000);
  }

  function jumpToTarget(targetEl, options) {
    if (!targetEl) return;
    const { skillCategory, skillText, expandCaseStudy } = options || {};
    if (skillCategory) {
      document.dispatchEvent(new CustomEvent("open-skill-area", { detail: skillCategory }));
    }
    if (expandCaseStudy) {
      const toggle = document.querySelector("#case-study .case-toggle");
      if (toggle && toggle.getAttribute("aria-expanded") === "false") toggle.click();
    }
    requestAnimationFrame(() => {
      let highlightEl = targetEl;
      if (skillCategory && skillText) {
        const card = document.querySelector(`#skills .skill-card[data-category="${skillCategory}"]`);
        const matchLi = card && Array.from(card.querySelectorAll("li")).find((li) => li.textContent.trim() === skillText);
        if (matchLi) highlightEl = matchLi;
      }
      const scrollTarget = highlightEl.closest(".skill-card, .timeline > li, .project-card, .bring-card, section") || highlightEl;
      scrollTarget.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
      flashHit(highlightEl);
    });
  }

  // Site-wide search dialog
  const modal = document.getElementById("search-modal");
  const openBtn = document.querySelector(".nav-search-btn");
  if (!modal || !openBtn) return;

  const input = document.getElementById("site-search-input");
  const clearBtn = modal.querySelector(".search-clear");
  const closeEls = modal.querySelectorAll("[data-search-close]");
  const emptyState = document.getElementById("search-empty-state");
  const resultsMeta = document.getElementById("search-results-meta");
  const resultsList = document.getElementById("search-results");
  const noResults = document.getElementById("search-no-results");

  let index = null;
  let lastFocused = null;
  let activeIdx = -1;

  function buildIndex() {
    const items = [];

    // Skills (highest priority for recruiters)
    document.querySelectorAll("#skills .skill-card:not(.skill-card-all)").forEach((card) => {
      const cat = card.dataset.category || "";
      const catTitle = (card.querySelector(".skill-card-title") || {}).textContent?.trim() || "Skills";
      card.querySelectorAll("ul li").forEach((li) => {
        const name = li.textContent.trim();
        items.push({
          type: "skill",
          badge: `Skill · ${catTitle}`,
          title: name,
          snippet: `Listed under ${catTitle}`,
          searchText: `${name} ${catTitle} skill`.toLowerCase(),
          el: li,
          skillCategory: cat,
          skillText: name
        });
      });
    });

    // Experience
    document.querySelectorAll("#experience .timeline > li").forEach((li) => {
      const h3 = li.querySelector("h3");
      const when = li.querySelector(".when");
      const title = h3 ? h3.textContent.trim() : "Experience";
      const period = when ? when.textContent.trim() : "";
      const details = Array.from(li.querySelectorAll("li, p:not(.when):not(.case-link)"))
        .map((n) => n.textContent.trim())
        .filter(Boolean)
        .join(" · ");
      items.push({
        type: "experience",
        badge: period ? `Experience · ${period}` : "Experience",
        title,
        snippet: details || period,
        searchText: `${title} ${period} ${details}`.toLowerCase(),
        el: li
      });
    });

    // Projects
    document.querySelectorAll("#projects .project-card").forEach((card) => {
      const title = (card.querySelector("h3") || {}).textContent?.trim() || "Project";
      const summary = (card.querySelector(".project-summary") || {}).textContent?.trim() || "";
      const tags = Array.from(card.querySelectorAll(".project-tags li")).map((t) => t.textContent.trim()).join(", ");
      items.push({
        type: "project",
        badge: "Project",
        title,
        snippet: `${summary}${tags ? ` (${tags})` : ""}`,
        searchText: `${title} ${summary} ${tags} project`.toLowerCase(),
        el: card
      });
    });

    // Case study
    const caseStudy = document.getElementById("case-study");
    if (caseStudy) {
      const title = (caseStudy.querySelector(".case-title") || {}).textContent?.trim() || "Case study";
      const text = Array.from(caseStudy.querySelectorAll(".case-summary, .case-full p, .case-full li"))
        .map((n) => n.textContent.trim())
        .filter(Boolean)
        .join(" ");
      items.push({
        type: "case-study",
        badge: "Case study",
        title,
        snippet: text,
        searchText: `${title} ${text} case study`.toLowerCase(),
        el: caseStudy,
        expandCaseStudy: true
      });
    }

    // What I bring
    document.querySelectorAll("#bring .bring-card").forEach((card) => {
      const title = (card.querySelector("h3") || {}).textContent?.trim() || "Highlight";
      const body = (card.querySelector("p") || {}).textContent?.trim() || "";
      items.push({
        type: "about",
        badge: "What I bring",
        title,
        snippet: body,
        searchText: `${title} ${body}`.toLowerCase(),
        el: card
      });
    });

    // About
    const about = document.getElementById("about");
    if (about) {
      const text = Array.from(about.querySelectorAll("p")).map((p) => p.textContent.trim()).join(" ");
      items.push({
        type: "about",
        badge: "About",
        title: "About Sean Das",
        snippet: text,
        searchText: `about sean susanta das ${text}`.toLowerCase(),
        el: about
      });
    }

    return items;
  }

  function scoreItem(item, qLower, tokens) {
    if (!tokens.every((t) => item.searchText.includes(t))) return -1;
    let score = item.type === "skill" ? 100 : item.type === "project" ? 50 : item.type === "experience" ? 40 : 20;
    const titleLower = item.title.toLowerCase();
    if (titleLower === qLower) score += 200;
    else if (titleLower.startsWith(qLower)) score += 120;
    else if (titleLower.includes(qLower)) score += 70;
    return score;
  }

  function setActive(idx) {
    const btns = resultsList.querySelectorAll(".search-result-btn");
    btns.forEach((b, i) => {
      const active = i === idx;
      b.classList.toggle("is-active", active);
      if (active) b.scrollIntoView({ block: "nearest" });
    });
    activeIdx = idx;
  }

  function renderResults() {
    if (!index) index = buildIndex();
    const raw = input.value;
    const qLower = raw.trim().toLowerCase();
    const tokens = tokenize(raw);
    clearBtn.hidden = !raw.length;

    if (!tokens.length) {
      emptyState.hidden = false;
      resultsMeta.hidden = true;
      resultsList.hidden = true;
      noResults.hidden = true;
      resultsList.replaceChildren();
      activeIdx = -1;
      return;
    }

    emptyState.hidden = true;
    const matched = index
      .map((item) => ({ item, score: scoreItem(item, qLower, tokens) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map((entry) => entry.item);

    resultsList.replaceChildren();
    if (!matched.length) {
      resultsMeta.hidden = true;
      resultsList.hidden = true;
      noResults.hidden = false;
      activeIdx = -1;
      return;
    }

    noResults.hidden = true;
    resultsMeta.textContent = `${matched.length}${matched.length === 24 ? "+" : ""} ${matched.length === 1 ? "result" : "results"}`;
    resultsMeta.hidden = false;

    matched.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "search-result-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result-btn";

      const top = document.createElement("div");
      top.className = "search-result-top";

      const title = document.createElement("span");
      title.className = "search-result-title";
      appendHighlighted(title, item.title, tokens);

      const badge = document.createElement("span");
      badge.className = "search-badge";
      badge.dataset.type = item.type;
      badge.textContent = item.badge;

      top.append(title, badge);
      btn.appendChild(top);

      if (item.snippet) {
        const snippet = document.createElement("span");
        snippet.className = "search-result-snippet";
        appendHighlighted(snippet, item.snippet, tokens);
        btn.appendChild(snippet);
      }

      btn.addEventListener("click", () => {
        closeModal();
        jumpToTarget(item.el, {
          skillCategory: item.skillCategory,
          skillText: item.skillText,
          expandCaseStudy: item.expandCaseStudy
        });
      });
      btn.addEventListener("mouseenter", () => setActive(idx));

      li.appendChild(btn);
      resultsList.appendChild(li);
    });

    resultsList.hidden = false;
    setActive(0);
  }

  function openModal(initialQuery) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (typeof initialQuery === "string") input.value = initialQuery;
    renderResults();
    requestAnimationFrame(() => input.focus());
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  openBtn.addEventListener("click", () => openModal());
  closeEls.forEach((el) => el.addEventListener("click", closeModal));
  clearBtn.addEventListener("click", () => {
    input.value = "";
    renderResults();
    input.focus();
  });
  input.addEventListener("input", renderResults);

  modal.querySelectorAll("[data-quick-query]").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.quickQuery || "";
      renderResults();
      input.focus();
    });
  });

  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // close only the search, not the chat panel behind it (chat.js listens on document)
      closeModal();
      return;
    }
    // Keep Tab inside the dialog while it's open
    if (e.key === "Tab") {
      const focusables = Array.from(modal.querySelectorAll("input, button")).filter((el) => !el.hidden && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    const btns = resultsList.querySelectorAll(".search-result-btn");
    if (!btns.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIdx + 1) % btns.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIdx - 1 + btns.length) % btns.length);
    } else if (e.key === "Enter" && activeIdx >= 0 && document.activeElement === input) {
      e.preventDefault();
      btns[activeIdx].click();
    }
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const inEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (modal.hidden) openModal();
      else closeModal();
    } else if (e.key === "/" && !inEditable && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (modal.hidden) openModal();
    }
  });
})();
