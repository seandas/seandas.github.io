// Digital-twin chat. Only appears when its backend answers /api/health (the Cloudflare
// Worker), so a down backend never shows a broken button.
(function () {
  // Public backend (Cloudflare Worker, see worker/). Empty = no chat on the live site.
  const WORKER_URL = "https://sean-twin.seandas.workers.dev";

  // The production Worker only allows https://seandas.github.io, so on a local preview the chat
  // stays hidden (nothing answers /api/health). Test the chat with tests/site-test.mjs instead.
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const useWorker = !isLocal;
  if (useWorker && !WORKER_URL) return;
  const API = useWorker ? `${WORKER_URL}/api` : "/api";
  const SUGGESTIONS = [
    "What's your experience with mobile automation?",
    "How do you use AI in testing?",
    "What did you do at The New York Times?",
  ];
  const GREETING = "Hi! I'm Sean's AI digital twin. Ask me about my career, experience or skills.";
  const STORAGE_KEY = "twin_chat_v1";

  const history = []; // {role, content}
  let busy = false;

  function saveSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-12)));
    } catch {}
  }

  function restoreSession(log, addMsg, attachCopyBtn, renderChips) {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (!data) return false;
      const saved = JSON.parse(data);
      if (Array.isArray(saved) && saved.length > 0) {
        history.length = 0;
        log.replaceChildren();
        saved.forEach((m) => {
          if (m && m.role && m.content) {
            history.push(m);
            const b = addMsg(m.role, m.content);
            if (m.role === "assistant") attachCopyBtn(b, m.content);
          }
        });
        const lastUser = saved.filter((m) => m.role === "user").pop();
        const lastAsst = saved.filter((m) => m.role === "assistant").pop();
        if (lastUser && lastAsst) {
          renderChips(getFollowUps(lastUser.content, lastAsst.content));
        }
        return true;
      }
    } catch {}
    return false;
  }

  function el(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children) n.append(c);
    return n;
  }

  // Safe formatting: text, **bold**, `code`, and https links (bare or [text](url)). Never uses innerHTML.
  const TOKENS = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^\s)]+\)|https:\/\/[^\s<>"')\]]+)/g;

  function link(href, label) {
    return el("a", { href, target: "_blank", rel: "noopener noreferrer" }, label);
  }

  function renderInline(container, text) {
    text.split(TOKENS).forEach((part) => {
      if (!part) return;
      let m;
      if ((m = part.match(/^\*\*([^*]+)\*\*$/))) {
        container.append(el("strong", null, m[1]));
      } else if ((m = part.match(/^`([^`]+)`$/))) {
        container.append(el("code", { class: "twin-code" }, m[1]));
      } else if ((m = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/))) {
        container.append(link(m[2], m[1]));
      } else if (/^https:\/\//.test(part)) {
        const url = part.replace(/[.,;:!?]+$/, ""); // keep sentence punctuation out of the link
        container.append(link(url, url), part.slice(url.length));
      } else {
        container.append(part);
      }
    });
  }

  function render(node, text) {
    node.replaceChildren();
    const lines = text.split("\n");
    let currentList = null;
    let blockCount = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        if (!currentList) {
          currentList = el("ul", { class: "twin-list" });
          node.append(currentList);
          blockCount++;
        }
        const li = el("li");
        renderInline(li, listMatch[1]);
        currentList.append(li);
      } else {
        currentList = null;
        if (!trimmed) return;
        const p = el("p", { class: "twin-p" });
        renderInline(p, line);
        node.append(p);
        blockCount++;
      }
    });

    // For single short blocks with no bullet lists, flatten directly into the bubble for clean inline display
    if (blockCount === 1 && node.firstElementChild && node.firstElementChild.tagName === "P") {
      const p = node.firstElementChild;
      node.replaceChildren(...p.childNodes);
    }
  }

  function attachCopyButton(bubble, text) {
    const copyBtn = el("button", {
      class: "twin-copy-btn",
      type: "button",
      "aria-label": "Copy answer",
      title: "Copy answer",
      onclick: (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.classList.add("copied");
          setTimeout(() => copyBtn.classList.remove("copied"), 2000);
        }).catch(() => {});
      },
    });
    bubble.append(copyBtn);
  }

  function getFollowUps(question, answer) {
    const text = (question + " " + answer).toLowerCase();
    if (text.includes("certif") || text.includes("istqb") || text.includes("astqb")) {
      return ["What did you do at The New York Times?", "What was the toughest framework you built?"];
    }
    if (text.includes("times") || text.includes("nyt") || text.includes("games")) {
      return ["How do you use AI in testing?", "What mobile frameworks have you built?"];
    }
    if (text.includes("mobile") || text.includes("espresso") || text.includes("xcui") || text.includes("appium")) {
      return ["What did you do at Butterfly Network?", "What was the toughest framework you built?"];
    }
    return ["What did you do at The New York Times?", "How do you use AI in testing?"];
  }

  function build() {
    const launcher = el("button", {
      class: "twin-launcher", type: "button", "aria-expanded": "false", "aria-controls": "twin-panel",
    }, el("span", { class: "twin-dot", "aria-hidden": "true" }), "Chat with my AI twin");

    const log = el("div", { class: "twin-log", role: "log", "aria-live": "polite" });
    const chips = el("div", { class: "twin-chips" });
    const input = el("textarea", {
      class: "twin-input", rows: "1", maxlength: "1000", placeholder: "Ask about my experience…",
      "aria-label": "Your question",
    });
    const send = el("button", { class: "twin-send", type: "submit", "aria-label": "Send" }, "Send");
    const form = el("form", { class: "twin-form" }, input, send);
    function renderChips(list) {
      chips.replaceChildren();
      (list || []).forEach((s) => {
        chips.append(el("button", { class: "twin-chip", type: "button", onclick: () => ask(s) }, s));
      });
    }

    const reset = el("button", {
      class: "twin-reset", type: "button", "aria-label": "Clear conversation", title: "Clear conversation",
      onclick: () => {
        history.length = 0;
        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
        log.replaceChildren();
        addMsg("assistant", GREETING);
        renderChips(SUGGESTIONS);
      },
    }, "↺");
    const close = el("button", { class: "twin-close", type: "button", "aria-label": "Close chat" }, "×");

    const panel = el("section", {
      class: "twin-panel", id: "twin-panel", role: "dialog", "aria-modal": "false",
      "aria-label": "Chat with Sean's AI twin", hidden: "",
    },
      el("header", { class: "twin-head" },
        el("div", { class: "twin-head-info" },
          el("div", { class: "twin-head-title-row" },
            el("img", { class: "twin-head-avatar", src: "assets/profile.jpg", alt: "Sean Das", width: "24", height: "24" }),
            el("p", { class: "twin-title" }, "Sean's AI twin")),
          el("p", { class: "twin-sub" }, "Answers from my background. AI can make mistakes. Please don't share sensitive information; chats are processed by AI providers.")),
        el("div", { class: "twin-head-actions" }, reset, close)),
      log, chips, form);

    // Start hidden when the hero chat button will control it (see below), so it doesn't flash and fade out on load
    const heroBtn = document.querySelector(".twin-cta");
    const watchHero = heroBtn && "IntersectionObserver" in window;
    if (watchHero) launcher.classList.add("twin-launcher-hidden");
    document.body.append(launcher, panel);

    function addMsg(role, text) {
      const bubble = el("div", { class: `twin-msg twin-${role}` });
      render(bubble, text);
      log.append(bubble);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    let opener = launcher; // where focus returns on close
    function setOpen(open, from) {
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", String(open));
      launcher.hidden = open;
      if (open) { opener = from || launcher; input.focus(); }
      else (opener.isConnected && opener.offsetParent ? opener : launcher).focus();
    }

    function resize() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 140) + "px";
    }

    async function ask(question) {
      question = question.trim();
      if (!question || busy) return;
      busy = true;
      send.disabled = true;
      chips.replaceChildren();
      addMsg("user", question);
      history.push({ role: "user", content: question });
      input.value = "";
      resize();

      const bubble = addMsg("assistant", "");
      bubble.classList.add("twin-typing");
      // Screen readers: hold announcements while the answer streams in, then read it once.
      log.setAttribute("aria-busy", "true");
      let answer = "";
      let failed = "";

      // A little longer than the Worker's own 60 s limit, so its clearer error arrives first.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 75_000);
      let reader;
      try {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          // The backends only use the last 12 messages; sending more could exceed the body limit.
          body: JSON.stringify({ messages: history.slice(-12) }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Something went wrong. Please try again.");
        }
        reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        outer: while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 2);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") break outer;
            let msg;
            try { msg = JSON.parse(data); } catch { continue; } // skip a garbled chunk instead of showing a parse error
            if (msg.error) { failed = msg.error; break outer; }
            if (msg.delta) {
              answer += msg.delta;
              bubble.classList.remove("twin-typing");
              bubble.textContent = answer; // plain while streaming; formatted once at the end
              log.scrollTop = log.scrollHeight;
            }
          }
        }
      } catch (e) {
        failed = e.name === "AbortError"
          ? "The chat took too long to respond. Please try again."
          : e.message || "Couldn't reach the chat. Please try again.";
      } finally {
        clearTimeout(timeout);
        if (reader) reader.cancel().catch(() => {});
      }

      bubble.classList.remove("twin-typing");
      answer = answer.trim();
      if (answer) {
        render(bubble, answer);
        attachCopyButton(bubble, answer);
        history.push({ role: "assistant", content: answer });
        saveSession();
        renderChips(getFollowUps(question, answer));
      } else {
        if (!failed) failed = "No answer came back. Please try again.";
        bubble.remove();
        history.pop(); // drop the unanswered question so a retry starts clean
      }
      if (failed) addMsg("error", `${failed} You can also email me at ${["seanxdas", "gmail.com"].join(String.fromCharCode(64))}.`);
      log.setAttribute("aria-busy", "false");
      busy = false;
      send.disabled = false;
      input.focus();
    }

    if (!restoreSession(log, addMsg, attachCopyButton, renderChips)) {
      addMsg("assistant", GREETING);
      renderChips(SUGGESTIONS);
    }

    launcher.addEventListener("click", () => setOpen(true));
    // Any [data-open-twin] button on the page (e.g. the hero "Ask my AI twin") opens the chat.
    document.querySelectorAll("[data-open-twin]").forEach((b) =>
      b.addEventListener("click", () => setOpen(true, b)));
    document.documentElement.dataset.twin = "on"; // reveals those buttons (see styles.css)

    // Only show the floating launcher when the hero "Ask my AI twin" button is scrolled out of view
    if (watchHero) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            launcher.classList.add("twin-launcher-hidden");
          } else {
            launcher.classList.remove("twin-launcher-hidden");
          }
        });
      }, { threshold: 0 });
      io.observe(heroBtn);
    }
    close.addEventListener("click", () => setOpen(false));
    // Escape closes the chat wherever focus is, not only inside the panel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) setOpen(false);
    });
    form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
    input.addEventListener("input", resize);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); }
    });
  }

  fetch(`${API}/health`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && d.ok) build(); })
    .catch(() => {});
})();
