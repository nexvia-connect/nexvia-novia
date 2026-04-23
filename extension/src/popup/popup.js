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
  const defaults = Object.fromEntries(TOOLS.map((t) => [t.key, true]));
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

async function render() {
  const container = document.getElementById("tools");
  container.innerHTML = "";

  const states = await getToolStates();
  TOOLS.forEach((tool) => container.appendChild(renderToolRow(tool, states[tool.key])));

  document.getElementById("enableAll").onclick = async () => {
    await setToolStates(Object.fromEntries(TOOLS.map((t) => [t.key, true])));
    await render();
  };
  document.getElementById("disableAll").onclick = async () => {
    await setToolStates(Object.fromEntries(TOOLS.map((t) => [t.key, false])));
    await render();
  };
}

render();

