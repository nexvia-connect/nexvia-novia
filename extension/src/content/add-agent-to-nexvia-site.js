(async function () {
  "use strict";

  if (window.nnAddAgentLoaded) return;
  window.nnAddAgentLoaded = true;

  const TOOL_KEY = "tool.addAgentToNexviaSite";
  try {
    const enabled = (await chrome.storage.sync.get({ [TOOL_KEY]: true }))[TOOL_KEY];
    if (!enabled) return;
  } catch {
    // default enabled
  }

  let agentCache = JSON.parse(sessionStorage.getItem("nexvia_agent_cache") || "{}");
  const saveCache = () => sessionStorage.setItem("nexvia_agent_cache", JSON.stringify(agentCache));

  const NORMALIZER = (str) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "");

  const showToast = (message) => {
    const id = "nn-nexvia-toast";
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = id;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(16, 16, 16, 0.92);
      color: #fff;
      padding: 10px 16px;
      border-radius: 999px;
      z-index: 2147483000;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      font-size: 13px;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 10px 30px rgba(0,0,0,0.65);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none;
      opacity: 0;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(-2px)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(2px)";
      setTimeout(() => toast.remove(), 300);
    }, 1800);
  };

  async function processListing(wrapper) {
    if (!wrapper || wrapper.dataset.nnAgentProcessed) return;
    wrapper.dataset.nnAgentProcessed = "true";

    const detailUrl = wrapper.href;
    if (!detailUrl) return;

    try {
      // Cache by URL (safer than name-only)
      const cached = agentCache[detailUrl];
      if (cached?.email) {
        injectPortrait(wrapper, cached.imgSrc, cached.email);
        return;
      }

      const response = await fetch(detailUrl, { credentials: "include" });
      if (!response.ok) return;

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const firstName = doc.querySelector(".team-first-name")?.textContent?.trim() || "";
      const lastName = doc.querySelector(".team-last-name")?.textContent?.trim() || "";
      const imgSrc = doc.querySelector(".team-picture")?.src;

      if (!firstName || !lastName) return;

      const email = `${NORMALIZER(firstName)}.${NORMALIZER(lastName)}@nexvia.lu`;

      agentCache[detailUrl] = { email, imgSrc };
      saveCache();

      injectPortrait(wrapper, imgSrc, email);
    } catch {
      // silent tool: ignore
    }
  }

  function injectPortrait(wrapper, imgSrc, email) {
    const header = wrapper.querySelector(".listings-item-header");
    if (!header || header.querySelector(".nn-agent-contact-circle")) return;

    const container = document.createElement("div");
    container.className = "nn-agent-contact-circle";
    container.style.cssText = `
      position: absolute;
      bottom: 12px;
      right: 12px;
      width: 48px;
      height: 48px;
      border-radius: 999px;
      border: 3px solid #fff;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 5;
      background: #fff;
      transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    const img = document.createElement("img");
    img.src = imgSrc || "https://www.nexvia.lu/build/images/logo-nexvia-v3.png";
    img.style.cssText = "width:100%; height:100%; object-fit:cover; pointer-events:none;";
    container.appendChild(img);

    header.style.position = "relative";
    header.appendChild(container);

    container.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(email).then(() => showToast(`Copied: ${email}`));
      container.style.transform = "scale(0.85)";
      setTimeout(() => {
        container.style.transform = "scale(1)";
      }, 150);
    });

    container.addEventListener("mouseenter", () => (container.style.transform = "scale(1.1)"));
    container.addEventListener("mouseleave", () => (container.style.transform = "scale(1)"));
  }

  function runMain() {
    const separator = document.querySelector(".unavailablePropertiesSeparatorWrapper");
    const allWrappers = Array.from(document.querySelectorAll("a.listings-item-wrapper"));

    const activeWrappers = allWrappers.filter((wrapper) => {
      if (!separator) return true;
      return wrapper.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING;
    });

    activeWrappers.forEach(processListing);
  }

  runMain();

  const observer = new MutationObserver(() => runMain());
  const waitForBody = setInterval(() => {
    if (!document.body) return;
    clearInterval(waitForBody);
    observer.observe(document.body, { childList: true, subtree: true });
  }, 50);
})();

