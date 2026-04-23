const TOOLS = [
  {
    key: "tool.listingFindHelper",
    name: "Listing Finder",
    desc: "Imm otop / AtHome / Wortimmo: show popup when a listing is found"
  },
  {
    key: "tool.listingPageFormatCommand",
    name: "Format Changer",
    desc: "pro.immotop.lu: apply formats via upgrade=..."
  },
  {
    key: "tool.addAgentToNexviaSite",
    name: "Add Agent to Nexvia Site",
    desc: "nexvia.lu/buy: add agent portrait button that copies agent email"
  }
];

const CLEANERS = [
  {
    key: "tool.easyUiCleanerV321",
    name: "Easy UI cleaner (v3.21)",
    desc: "easy-serveur: hide form blocks + per-element toggles (remote defaults + CSS)"
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
    TOOLS.map((t) => [t.key, true]).concat(CLEANERS.map((t) => [t.key, true]))
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
  const isTools = tab === "tools";
  document.getElementById("tabTools")?.classList.toggle("is-active", isTools);
  document.getElementById("tabCleaners")?.classList.toggle("is-active", !isTools);
  document.getElementById("tabTools")?.setAttribute("aria-selected", isTools ? "true" : "false");
  document.getElementById("tabCleaners")?.setAttribute("aria-selected", isTools ? "false" : "true");

  document.getElementById("panelTools").hidden = !isTools;
  document.getElementById("panelCleaners").hidden = isTools;
  const rootTitle = document.getElementById("rootTitle");
  if (rootTitle) rootTitle.textContent = isTools ? "Tools" : "Cleaners";
}

function getCurrentTab() {
  const cleanersHidden = document.getElementById("panelCleaners")?.hidden;
  if (typeof cleanersHidden === "boolean" && !cleanersHidden) return "cleaners";
  return "tools";
}

async function render() {
  const tools = document.getElementById("tools");
  const cleaners = document.getElementById("cleaners");
  tools.innerHTML = "";
  cleaners.innerHTML = "";

  const states = await getToolStates();
  TOOLS.forEach((tool) => tools.appendChild(renderToolRow(tool, states[tool.key])));
  CLEANERS.forEach((tool) => cleaners.appendChild(renderToolRow(tool, states[tool.key])));

  // restore last tab
  const saved = (await chrome.storage.local.get({ nnPopupTab: "tools" })).nnPopupTab;
  setTab(saved);

  const enableKeyset = (keys, on) => {
    const next = {};
    keys.forEach((k) => (next[k] = on));
    return next;
  };

  document.getElementById("tabTools").onclick = async () => {
    setTab("tools");
    await chrome.storage.local.set({ nnPopupTab: "tools" });
  };
  document.getElementById("tabCleaners").onclick = async () => {
    setTab("cleaners");
    await chrome.storage.local.set({ nnPopupTab: "cleaners" });
  };

  document.getElementById("enableAll").onclick = async () => {
    const tab = getCurrentTab();
    if (tab === "tools") await setToolStates(enableKeyset(TOOLS.map((t) => t.key), true));
    else await setToolStates(enableKeyset(CLEANERS.map((t) => t.key), true));
    await render();
  };
  document.getElementById("disableAll").onclick = async () => {
    const tab = getCurrentTab();
    if (tab === "tools") await setToolStates(enableKeyset(TOOLS.map((t) => t.key), false));
    else await setToolStates(enableKeyset(CLEANERS.map((t) => t.key), false));
    await render();
  };
}

render();

