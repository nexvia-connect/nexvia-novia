(async function () {
  "use strict";

  if (window.nnEasyUiCleanerV321) return;
  window.nnEasyUiCleanerV321 = true;

  const TOOL_KEY = "tool.easyUiCleanerV321";
  try {
    const enabled = (await chrome.storage.sync.get({ [TOOL_KEY]: true }))[TOOL_KEY];
    if (!enabled) return;
  } catch {
    // default enabled
  }

  const STORAGE_KEY = "hidden_form_elements";
  const DEFAULT_HIDDEN = new Set();

  let hiddenInputs = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  const DEFAULT_LIST_URL = "https://nexvia-connect.github.io/easy-scripts/cleaner-default.txt";
  const STYLES_URL = "https://nexvia-connect.github.io/easy-scripts/styles/ui-cleaner-style.css";
  const MATERIAL_ICONS_URL = "https://fonts.googleapis.com/icon?family=Material+Icons+Outlined";

  async function initDefaults() {
    try {
      const res = await fetch(DEFAULT_LIST_URL, { cache: "no-store" });
      const txt = await res.text();
      txt
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((id) => DEFAULT_HIDDEN.add(id));
    } catch {
      // ignore: defaults still empty
    }

    if (!localStorage.getItem(STORAGE_KEY) && DEFAULT_HIDDEN.size > 0) {
      hiddenInputs = new Set(DEFAULT_HIDDEN);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenInputs)));
      applyHiddenStates();
    }
  }

  let editMode = false;
  let mutationLock = false;

  function getFullPath(el) {
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      const tag = current.tagName;
      const siblings = Array.from(current.parentNode.children).filter((e) => e.tagName === tag);
      const index = siblings.indexOf(current);
      path.unshift(`${tag}:nth-of-type(${index + 1})`);
      current = current.parentNode;
    }
    return path.join(" > ");
  }

  function getElementIdentifier(el) {
    return getFullPath(el);
  }

  function getHideableElements() {
    return Array.from(
      document.querySelectorAll(
        [
          ".form-group",
          ".row.mb-3",
          "fieldset",
          "legend",
          ".badges",
          ".fa-plus",
          ".fa-compass",
          ".fa-star",
          ".fa-heart",
          ".leftpanel-item",
          ".col > .form-group",
          ".col .form-group button",
          ".fiche-footing .btn-left button",
          ".fiche-footing .btn-right button",
          ".mat-tab-label",
          ".card.col-3"
        ].join(", ")
      )
    ).filter(Boolean);
  }

  function applyHiddenStates() {
    if (mutationLock) return;
    mutationLock = true;
    requestAnimationFrame(() => {
      getHideableElements().forEach((el) => {
        const id = getElementIdentifier(el);
        if (!id) return;
        el.style.display = hiddenInputs.has(id) ? "none" : "";
        if (editMode) {
          el.style.display = "";
          el.classList.toggle("dimmed-input", hiddenInputs.has(id));
        } else {
          el.classList.remove("dimmed-input");
        }
      });
      mutationLock = false;
    });
  }

  function addEditButtons() {
    getHideableElements().forEach((el) => {
      const id = getElementIdentifier(el);
      if (!id) return;
      if (el.querySelector(".input-hide-button")) return;

      const btn = document.createElement("div");
      btn.className = "input-hide-button";
      btn.setAttribute("data-id", id);
      btn.textContent = hiddenInputs.has(id) ? "+" : "-";
      if (hiddenInputs.has(id)) btn.classList.add("restore");

      btn.style.position = "absolute";
      btn.style.zIndex = "10";
      if (el.tagName === "LEGEND") {
        btn.style.top = "0";
        btn.style.right = "4px";
      } else if (el.tagName === "FIELDSET") {
        btn.style.top = "0";
        btn.style.right = "28px";
      } else {
        btn.style.top = "4px";
        btn.style.right = "4px";
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (hiddenInputs.has(id)) {
          hiddenInputs.delete(id);
          el.classList.remove("dimmed-input");
          btn.textContent = "-";
          btn.classList.remove("restore");
        } else {
          hiddenInputs.add(id);
          el.classList.add("dimmed-input");
          btn.textContent = "+";
          btn.classList.add("restore");
        }
      });

      btn.addEventListener("mouseenter", () => el.classList.add("hovered"));
      btn.addEventListener("mouseleave", () => el.classList.remove("hovered"));

      el.classList.add("edit-overlay");
      el.style.position = "relative";
      el.appendChild(btn);
    });
  }

  function removeEditButtons() {
    document.querySelectorAll(".input-hide-button").forEach((btn) => btn.remove());
    document.querySelectorAll(".edit-overlay").forEach((el) => {
      el.classList.remove("edit-overlay");
      el.classList.remove("hovered");
    });
  }

  function confirmEditState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hiddenInputs)));
    editMode = false;
    const toggle = document.getElementById("nn-toggle-edit");
    if (toggle) {
      toggle.innerHTML = '<span class="material-icons-outlined button-icon">visibility</span>Show/Hide elements';
    }
    removeEditButtons();
    applyHiddenStates();
  }

  function showHiddenEditor() {
    const popup = document.createElement("div");
    popup.className = "popup-editor";
    popup.innerHTML = `
            <div style="margin-bottom: 6px; font-size: 13px; color: #fff;">Hidden elements:</div>
            <textarea>${Array.from(hiddenInputs).join("\n")}</textarea>
            <button id="nn-save-editor">Save</button>
            <button id="nn-close-editor">Close</button>
            <button id="nn-reset-default-popup">Set default hidden state</button>
        `;
    document.body.appendChild(popup);

    document.getElementById("nn-close-editor").onclick = () => popup.remove();
    document.getElementById("nn-save-editor").onclick = () => {
      const textarea = popup.querySelector("textarea");
      hiddenInputs = new Set(textarea.value.split("\n").map((x) => x.trim()).filter(Boolean));
      confirmEditState();
      popup.remove();
    };
    document.getElementById("nn-reset-default-popup").onclick = () => {
      if (window.confirm("Reset to default hidden fields? This will overwrite current settings.")) {
        hiddenInputs = new Set(DEFAULT_HIDDEN);
        confirmEditState();
        popup.remove();
      }
    };
  }

  const ui = document.createElement("div");
  ui.className = "floating-ui-cleaner";
  ui.innerHTML = `
        <h3>UI cleaner</h3>
        <button id="nn-toggle-edit" type="button">
            <span class="material-icons-outlined button-icon">visibility</span>Show/Hide elements
        </button>
        <button id="nn-edit-hidden" type="button">
            <span class="material-icons-outlined button-icon">settings</span>Options
        </button>
    `;
  document.body.appendChild(ui);

  document.getElementById("nn-toggle-edit").addEventListener("click", () => {
    editMode = !editMode;
    const btn = document.getElementById("nn-toggle-edit");
    btn.innerHTML = editMode
      ? '<span class="material-icons-outlined button-icon">check_circle</span>Confirm'
      : '<span class="material-icons-outlined button-icon">visibility</span>Show/Hide elements';
    if (editMode) addEditButtons();
    else confirmEditState();
    applyHiddenStates();
  });

  document.getElementById("nn-edit-hidden").addEventListener("click", showHiddenEditor);

  new MutationObserver(() => {
    if (!editMode) applyHiddenStates();
  }).observe(document.body, { childList: true, subtree: true });

  async function injectRemoteAssets() {
    if (!document.getElementById("nn-material-icons-outlined")) {
      const iconLink = document.createElement("link");
      iconLink.id = "nn-material-icons-outlined";
      iconLink.rel = "stylesheet";
      iconLink.href = MATERIAL_ICONS_URL;
      document.head.appendChild(iconLink);
    }

    if (!document.getElementById("nn-easy-ui-cleaner-css")) {
      const style = document.createElement("style");
      style.id = "nn-easy-ui-cleaner-css";
      try {
        const res = await fetch(STYLES_URL, { cache: "no-store" });
        if (res.ok) style.textContent = await res.text();
      } catch {
        // ignore
      }
      document.head.appendChild(style);
    }
  }

  await injectRemoteAssets();
  await initDefaults();

  applyHiddenStates();
})();
