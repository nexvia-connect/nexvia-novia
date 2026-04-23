const ASSIST = [
  {
    key: "tool.listingFindHelper",
    name: "Listing Finder",
    desc: "Imm otop / AtHome / Wortimmo: show popup when a listing is found"
  },
  {
    key: "tool.listingPageFormatCommand",
    name: "Format Changer",
    desc: "pro.immotop.lu: apply formats via upgrade=..."
  }
];

const ENHANCEMENTS = [
  {
    key: "tool.addAgentToNexviaSite",
    name: "Agent Chip",
    desc: "nexvia.lu/buy: add a small portrait chip; click copies the agent email"
  },
  {
    key: "tool.easyUiCleanerV321",
    name: "Easy Cleaner",
    desc: "easy-serveur: hide noisy form blocks; includes remote defaults + editor"
  }
];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

async function getToolStates() {
  const defaults = Object.fromEntries(
    ASSIST.map((t) => [t.key, true]).concat(ENHANCEMENTS.map((t) => [t.key, true]))
  );
  const res = await chrome.storage.sync.get(defaults);
  return res;
}

async function setToolStates(next) {
  await chrome.storage.sync.set(next);
}

function renderToolRow(tool, enabled) {
  const checkboxId = `sw-${tool.key.replace(/[^a-z0-9]/gi, "-")}`;

  const left = el("div", { class: "tool-text" }, [
    el("div", { class: "tool-name", text: tool.name }),
    el("div", { class: "tool-desc", text: tool.desc })
  ]);

  const input = el("input", { id: checkboxId, type: "checkbox" });
  input.checked = Boolean(enabled);

  const pill = el("span", { class: "pill" });
  const label = el("label", { class: "switch", for: checkboxId }, [input, pill]);

  input.addEventListener("change", async () => {
    await setToolStates({ [tool.key]: input.checked });
  });

  return el("div", { class: "tool" }, [left, label]);
}

function setTab(tab) {
  const isAssist = tab === "assist";
  document.getElementById("tabAssist")?.classList.toggle("is-active", isAssist);
  document.getElementById("tabEnhancements")?.classList.toggle("is-active", !isAssist);
  document.getElementById("tabAssist")?.setAttribute("aria-selected", isAssist ? "true" : "false");
  document.getElementById("tabEnhancements")?.setAttribute("aria-selected", isAssist ? "false" : "true");

  document.getElementById("panelAssist").hidden = !isAssist;
  document.getElementById("panelEnhancements").hidden = isAssist;
  const rootTitle = document.getElementById("rootTitle");
  const rootSubtitle = document.getElementById("rootSubtitle");
  if (rootTitle) rootTitle.textContent = isAssist ? "Assist" : "Enhancements";
  if (rootSubtitle) {
    rootSubtitle.textContent = isAssist
      ? "Active workflows and actions your team uses daily"
      : "Quiet page improvements, chips, cleaners, micro-UI that stays out of the way";
  }
}

async function render() {
  const tools = document.getElementById("tools");
  const cleaners = document.getElementById("cleaners");
  tools.innerHTML = "";
  cleaners.innerHTML = "";

  const states = await getToolStates();
  ASSIST.forEach((tool) => tools.appendChild(renderToolRow(tool, states[tool.key])));
  ENHANCEMENTS.forEach((tool) => cleaners.appendChild(renderToolRow(tool, states[tool.key])));

  // restore last tab
  const raw = (await chrome.storage.local.get({ nnPopupTab: "assist" })).nnPopupTab;
  // migrate old tab ids
  const saved =
    raw === "tools"
      ? "assist"
      : raw === "cleaners"
        ? "enhancements"
        : raw === "assist" || raw === "enhancements"
          ? raw
          : "assist";

  setTab(saved);
  if (raw !== saved) {
    await chrome.storage.local.set({ nnPopupTab: saved });
  }

  document.getElementById("tabAssist").onclick = async () => {
    setTab("assist");
    await chrome.storage.local.set({ nnPopupTab: "assist" });
  };
  document.getElementById("tabEnhancements").onclick = async () => {
    setTab("enhancements");
    await chrome.storage.local.set({ nnPopupTab: "enhancements" });
  };
}

render();

