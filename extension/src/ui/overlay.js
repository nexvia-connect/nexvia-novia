// Shared UI overlay for all helpers.
// Uses Shadow DOM to prevent CSS collisions with host pages.
//
// Content scripts are not ES modules, so we expose a single global:
//   window.NexviaNoviaUI.{ createCard, getBody, icons }

const OVERLAY_ID = "nn-overlay-host";

// Inline theme CSS to avoid any resource fetching issues
// (some sites + MV3 setups can block loading extension CSS via <link>).
const NN_THEME_CSS = `
:host, :root {
  --nn-font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --nn-z: 2147483000;
  --nn-bg: #0f0f10;
  --nn-panel: #1e1e1e;
  --nn-panel-2: #252525;
  --nn-border: #333;
  --nn-border-2: #404040;
  --nn-text: #eaeaea;
  --nn-text-dim: #a3a3a3;
  --nn-green: #2e7d32;
  --nn-green-2: #10a37f;
  --nn-red: #d9534f;
  --nn-radius: 12px;
  --nn-radius-sm: 10px;
  --nn-shadow: 0 10px 40px rgba(0, 0, 0, 0.40);
  --nn-shadow-2: 0 10px 30px rgba(0, 0, 0, 0.80);
}
.nn-overlay { position: fixed; inset: 0; pointer-events: none; z-index: var(--nn-z); font-family: var(--nn-font); }
.nn-card { pointer-events: auto; background: var(--nn-panel); color: var(--nn-text); border: 1px solid var(--nn-border); border-radius: var(--nn-radius); box-shadow: var(--nn-shadow); overflow: hidden; }
.nn-header { background: var(--nn-panel-2); border-bottom: 1px solid var(--nn-border); padding: 14px 20px; display:flex; align-items:center; justify-content:space-between; cursor: grab; user-select:none; }
.nn-header-left { display:flex; align-items:center; gap: 12px; min-width: 0; }
.nn-brand { display:inline-flex; align-items:center; justify-content:center; height: 24px; padding: 0 10px; border-radius: 999px; background: #101010; border: 1px solid var(--nn-border); color: #fff; font-weight: 850; letter-spacing: 1.2px; font-size: 11px; }
.nn-title { font-size: 14px; font-weight: 650; letter-spacing: 0.5px; }
.nn-close { cursor:pointer; color: var(--nn-text-dim); font-size: 16px; line-height:1; padding: 4px 6px; border-radius: 8px; }
.nn-close:hover { color: var(--nn-text); background: rgba(255,255,255,0.06); }
.nn-body { padding: 20px; }
.nn-img { width:100%; height: 220px; object-fit: cover; display:block; border-radius: var(--nn-radius-sm); border: 1px solid var(--nn-border); margin-bottom: 12px; box-sizing: border-box; }
.nn-row { display:flex; gap: 12px; align-items: stretch; }
.nn-input { flex:1; height: 38px; padding: 0 12px; border: 1px solid var(--nn-border); background: #000; color: var(--nn-text); border-radius: var(--nn-radius-sm); font-size: 13px; outline:none; box-shadow:none; }
.nn-input:focus { border-color: rgba(16, 163, 127, 0.55); box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.12); }
.nn-btn { height: 38px; min-width: 38px; padding: 0 12px; border-radius: var(--nn-radius-sm); cursor:pointer; border: 1px solid #555; background: #333; color: var(--nn-text); display:inline-flex; align-items:center; justify-content:center; gap: 8px; font-weight: 700; font-size: 12px; letter-spacing: 0.3px; transition: background 0.18s ease, border-color 0.18s ease, transform 0.06s ease, box-shadow 0.18s ease, color 0.18s ease; }
.nn-btn:hover { border-color: #666; background: #3b3b3b; }
.nn-btn:active { transform: translateY(1px); }
.nn-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.nn-btn-primary { background: var(--nn-green-2); border-color: rgba(16, 163, 127, 0.65); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.nn-btn-primary:hover { background: #0e906f; }
.nn-btn-ghost { background: transparent; border-color: var(--nn-border-2); color: var(--nn-text-dim); }
.nn-btn-ghost:hover { color: var(--nn-text); background: rgba(255,255,255,0.06); border-color: #555; }
.nn-tooltip { position:absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: var(--nn-green); color:#fff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; opacity: 0; transition: opacity 0.2s; pointer-events:none; white-space:nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
.nn-badges { display:flex; flex-wrap: wrap; gap: 8px; }
.nn-badge { background: #2c2c2c; color: var(--nn-text-dim); padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 650; border: 1px solid var(--nn-border-2); }
.nn-badge.nn-active { background: rgba(16, 163, 127, 0.15); color: var(--nn-green-2); border-color: rgba(16, 163, 127, 0.4); }

/* Minimized pill */
.nn-minipill {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: var(--nn-z);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--nn-border);
  background: rgba(16, 16, 16, 0.92);
  color: #fff;
  box-shadow: var(--nn-shadow-2);
  cursor: pointer;
  user-select: none;
  transition: transform 180ms ease, opacity 180ms ease;
}
.nn-minipill:hover { background: rgba(22, 22, 22, 0.96); border-color: #444; }
.nn-minipill:active { transform: translateY(1px); }
.nn-minipill-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(16, 163, 127, 0.55);
  background: rgba(16, 163, 127, 0.18);
  color: var(--nn-green-2);
  font-weight: 950;
  letter-spacing: 0.5px;
  font-size: 12px;
}
.nn-minipill-label { font-weight: 850; letter-spacing: 1.2px; font-size: 11px; }

/* Morph-ish transitions */
.nn-hidden {
  opacity: 0;
  transform: scale(0.96);
  pointer-events: none !important;
}
.nn-card {
  transition: opacity 180ms ease, transform 180ms ease;
}
`;

function ensureOverlayHost() {
  let host = document.getElementById(OVERLAY_ID);
  if (host) return host;

  host = document.createElement("div");
  host.id = OVERLAY_ID;
  host.style.cssText = "position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;";
  document.documentElement.appendChild(host);
  return host;
}

function ensureThemeCss(shadow) {
  if (shadow.getElementById("nn-theme-style")) return;
  const styleEl = document.createElement("style");
  styleEl.id = "nn-theme-style";
  styleEl.textContent = NN_THEME_CSS;
  shadow.prepend(styleEl);
}

function makeDraggable({ dragHandleEl, targetEl }) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let moved = false;

  const onMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && (Math.abs(dx) + Math.abs(dy) >= 4)) moved = true;
    startX = e.clientX;
    startY = e.clientY;

    const left = parseInt(targetEl.style.left || "0", 10) + dx;
    const top = parseInt(targetEl.style.top || "0", 10) + dy;
    targetEl.style.left = `${left}px`;
    targetEl.style.top = `${top}px`;
  };

  const onUp = () => {
    isDragging = false;
    dragHandleEl.style.cursor = "grab";
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);

    // If the user dragged, suppress the immediate click that can fire on mouseup.
    if (moved) {
      targetEl.dataset.nnJustDragged = "1";
      window.setTimeout(() => {
        delete targetEl.dataset.nnJustDragged;
      }, 0);
    }
  };

  dragHandleEl.addEventListener("mousedown", (e) => {
    isDragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;

    const rect = targetEl.getBoundingClientRect();
    targetEl.style.transform = "none";
    targetEl.style.left = `${rect.left}px`;
    targetEl.style.top = `${rect.top}px`;

    dragHandleEl.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

function clampToViewport(el) {
  const rect = el.getBoundingClientRect();
  const maxX = Math.max(0, window.innerWidth - rect.width);
  const maxY = Math.max(0, window.innerHeight - rect.height);
  const x = Math.min(Math.max(0, rect.left), maxX);
  const y = Math.min(Math.max(0, rect.top), maxY);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
}

function ensureMinipill(overlay, id) {
  const pillId = `nn-minipill-${id}`;
  let pill = overlay.querySelector(`#${CSS.escape(pillId)}`);
  if (pill) return pill;

  pill = document.createElement("div");
  pill.id = pillId;
  pill.className = "nn-minipill nn-hidden";
  pill.innerHTML = `<span class="nn-minipill-badge">N</span><span class="nn-minipill-label">NOVIA</span>`;
  overlay.appendChild(pill);

  // make pill draggable by itself
  makeDraggable({ dragHandleEl: pill, targetEl: pill });

  // Convert from bottom/right anchoring to left/top once dragged
  pill.addEventListener("mousedown", () => {
    const rect = pill.getBoundingClientRect();
    pill.style.left = `${rect.left}px`;
    pill.style.top = `${rect.top}px`;
    pill.style.right = "auto";
    pill.style.bottom = "auto";
  }, { once: true });

  return pill;
}

function nnMinimizeCard({ overlay, card }) {
  const id = card.dataset.nnId || "card";
  const pill = ensureMinipill(overlay, id);

  // ensure card has absolute position (so restore is "where you left it")
  if (card.style.transform && card.style.transform.includes("translate")) {
    const rect = card.getBoundingClientRect();
    card.style.transform = "none";
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;
    card.style.right = "auto";
  }

  clampToViewport(card);

  // hide card, show pill
  card.classList.add("nn-hidden");
  pill.classList.remove("nn-hidden");

  pill.onclick = () => {
    if (pill.dataset.nnJustDragged === "1") return;
    pill.classList.add("nn-hidden");
    card.classList.remove("nn-hidden");
    clampToViewport(card);
  };
}

async function ensureOverlay() {
  const host = ensureOverlayHost();
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });

  // Create overlay container once
  let overlay = shadow.getElementById("nn-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "nn-overlay";
    overlay.className = "nn-overlay";
    shadow.appendChild(overlay);
  }

  // Ensure theme CSS is loaded once
  ensureThemeCss(shadow);

  return { host, shadow, overlay };
}

async function nnCreateCard({ id, title, width = 420, anchor = "center" }) {
  const { overlay } = await ensureOverlay();

  // If already exists, return it
  const existing = overlay.querySelector(`[data-nn-id="${CSS.escape(id)}"]`);
  if (existing) return existing;

  const card = document.createElement("div");
  card.dataset.nnId = id;
  card.className = "nn-card";
  card.style.width = `${width}px`;
  card.style.position = "fixed";
  card.style.pointerEvents = "auto";

  if (anchor === "top-right") {
    card.style.top = "100px";
    card.style.right = "20px";
  } else {
    card.style.top = "50%";
    card.style.left = "50%";
    card.style.transform = "translate(-50%, -50%)";
  }

  card.innerHTML = `
    <div class="nn-header" data-nn-drag>
      <div class="nn-header-left">
        <div class="nn-brand" aria-label="NOVIA">NOVIA</div>
        <div class="nn-title"></div>
      </div>
      <div class="nn-close" data-nn-close aria-label="Close">✕</div>
    </div>
    <div class="nn-body" data-nn-body></div>
  `;

  card.querySelector(".nn-title").textContent = title || "Nexvia Novia";

  overlay.appendChild(card);

  // Wire close button (minimize to NOVIA pill)
  card.querySelector("[data-nn-close]").addEventListener("click", () => nnMinimizeCard({ overlay, card }));

  // Enable dragging by header
  makeDraggable({
    dragHandleEl: card.querySelector("[data-nn-drag]"),
    targetEl: card
  });

  return card;
}

function nnGetBody(cardEl) {
  return cardEl.querySelector("[data-nn-body]");
}

function nnIcons() {
  return {
    copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  };
}

(function expose() {
  if (window.NexviaNoviaUI) return;
  window.NexviaNoviaUI = {
    createCard: nnCreateCard,
    getBody: nnGetBody,
    icons: nnIcons
  };
})();

