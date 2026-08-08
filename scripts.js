
// ==========================
// 📦 GLOBAL CONSTANTS & STATE
// ==========================

const STORAGE_KEY = "customLinks";
const SETTINGS_KEY = "customSettings";
const SEARCH_ENGINE_KEY = "searchEngine";
const FAVICON_PROVIDER_KEY = "faviconProvider";
const CLOCK_FONT_KEY = "clockFont";
const CLOCK_SIZE_KEY = "clockSize";

const grid = document.getElementById("linkGrid");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchEngineIcon = document.getElementById("searchEngineIcon");
const settingsPanel = document.getElementById("settings");
const linkEditModal = document.getElementById("linkEditModal");


const defaults = {
  focus: {
    target: "addressbar"
  },
  colors: {
    bg: "#202124",
    tile: "#303036",
    highlight: "#404145",
    text: "#ffffff",
    label: "#dddddd",
    clockColor: "#ffffff"
  },
  clock: {
    font: "system-ui, sans-serif",
    size: 5,
    margin: 40
  },
  fonts: {
    clockFont: "Poppins, sans-serif",
    labelFont: "Poppins, sans-serif"
  },
  interface: {
    showClock: true,
    showSearch: true,
    showLinks: true,
    showLinkLabels: true,
    showBookmarks: false
  },
  grid: {
    cols: 8,
    rows: 2
  },
  faviconProvider: "duckduckgo",
  theme: "default",
  more: {
    middleClickBackground: true,
    searchEngine: "duckduckgo"
  }
};

const searchEngines = {
  duckduckgo: {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/",
    icon: "https://duckduckgo.com/favicon.ico"
  },
  google: {
    name: "Google",
    url: "https://www.google.com/search",
    icon: "https://www.google.com/favicon.ico"
  },
  bing: {
    name: "Bing",
    url: "https://www.bing.com/search",
    icon: "https://www.bing.com/favicon.ico"
  },
  yahoo: {
    name: "Yahoo",
    url: "https://search.yahoo.com/search",
    icon: "https://search.yahoo.com/favicon.ico"
  },
  ecosia: {
    name: "Ecosia",
    url: "https://www.ecosia.org/search",
    icon: "https://www.ecosia.org/favicon.ico"
  }
};

const themes = {
  default: {
    colors: {
      bg: "#202124",
      tile: "#303036",
      highlight: "#404145",
      text: "#ffffff",
      label: "#dddddd",
      inputGlow: "rgba(170,170,255,1)",
      match: "rgba(255,221,0,0.85)",
      clockColor: "#ffffff"
    },
    clock: { font: "system-ui, sans-serif", size: 5, margin: 40 }
  },
  fox: {
    colors: {
      bg: "#2b2a33",
      tile: "#42414d",
      highlight: "#55555c",
      text: "#fbfbfe",
      label: "#fbfbfe",
      inputGlow: "rgba(255,144,0,1)",
      match: "rgba(255,200,0,0.85)",
      clockColor: "#fbfbfe"
    },
    clock: { font: "'Poppins', sans-serif", size: 5, margin: 40 }
  },
  black: {
    colors: {
      bg: "#000000",
      tile: "#121212",
      highlight: "#1e1e1e",
      text: "#ffffff",
      label: "#aaaaaa",
      inputGlow: "rgba(170,170,255,1)",
      match: "rgba(255,221,0,0.85)",
      clockColor: "#ffffff"
    },
    clock: { font: "'Roboto', sans-serif", size: 5, margin: 40 }
  },
  "dark-grey": {
    colors: {
      bg: "#1a1a1a",
      tile: "#2a2a2a",
      highlight: "#3a3a3a",
      text: "#ffffff",
      label: "#cccccc",
      inputGlow: "rgba(170,170,255,1)",
      match: "rgba(255,221,0,0.85)",
      clockColor: "#ffffff"
    },
    clock: { font: "'Open Sans', sans-serif", size: 5, margin: 40 }
  },
  light: {
    colors: {
      bg: "#f0f0f0",
      tile: "#f5f5f5",
      highlight: "#e8e8e8",
      text: "#333333",
      label: "#666666",
      inputGlow: "rgba(100,100,255,1)",
      match: "rgba(88,133,255,0.85)",
      clockColor: "#333333"
    },
    clock: { font: "'Montserrat', sans-serif", size: 5, margin: 40 }
  }
};

let TOTAL_TILES = defaults.grid.cols * defaults.grid.rows;
let dragSourceIndex = null;
let focusedTileIndex = 0;
let allowFocusRestore = false;
let currentDropTarget = null;
let lastDropTarget = null;
let dropTimeout = null;
let currentlyEditingIndex = null;
let lastSuggestionQuery = "";
let suggestionTimeout = null;
let currentWallpaperURL = null;

// ==========================
// 🚀 INITIALIZATION
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  setFocus();
  initDB().then(db => loadSavedWallpaper(db));

  applyStoredSettings();
  applyClockStyles();
  loadSearchEngine();

  renderGrid();

  initMorphDefs();
  buildMorphControls();
  applyMorphSettings(getSettings());

  updateClock();
  window.requestIdleCallback(async () => {
    await loadFonts();
    fetchAndRenderBookmarks();
    setupEventListeners();
    setInterval(updateClock, 60_000);
  });
});


/**
 * data-morph USAGE
 *
 * Add `data-morph` to any element to auto-generate Settings controls:
 *
 * Syntax:
 *   data-morph="
 *     targetClass[menuClass[porperty propDef, …]]
 *     menuClass[tab[…]]
 *   "
 *
 * menuClass:
 *   tells script where to put controls
 *   must match html class (e.g. “lg-style”, “lt-inter”, “clock”)
 *   
 * targetClass:
 *   undefined       → the element itself
 *   className  → any descendant matching ".className"
 *
 * property:
 *   any css property
 * 
 * propDef:
 *   propName from<min>to<max> [unit]   → range slider (unit defaults to “px”)
 *   propName color                     → color picker + transparency slider
 * 
 */

let morphDefs = [];

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function humanize(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
function parseMorphAttribute(el) {
  const raw = el.dataset.morph;
  if (!raw) return [];
  const defs = [];

  for (const segment of splitTopLevel(raw)) {
    const o0 = segment.indexOf('[');
    if (o0 < 0) continue;

    // find matching closing bracket
    let depth = 0, end = -1;
    for (let i = o0; i < segment.length; i++) {
      if (segment[i] === '[') depth++;
      else if (segment[i] === ']' && --depth === 0) { end = i; break; }
    }
    if (end < 0) continue;

    const beforeOuter = segment.slice(0, o0).trim() || 'self';
    const innerOuter = segment.slice(o0 + 1, end).trim();

    if (innerOuter.includes('[')) {
      // nested: split inner on top‐level commas
      for (const ns of splitTopLevel(innerOuter)) {
        const i1 = ns.indexOf('[');
        if (i1 < 0) continue;

        let d2 = 0, e2 = -1;
        for (let j = i1; j < ns.length; j++) {
          if (ns[j] === '[') d2++;
          else if (ns[j] === ']' && --d2 === 0) { e2 = j; break; }
        }
        if (e2 < 0) continue;

        const sect = ns.slice(0, i1).trim() || 'self';
        const body = ns.slice(i1 + 1, e2).trim();
        parseProps(el, beforeOuter, sect, body, defs);
      }
    } else {
      // flat: selector=self, section=beforeOuter
      parseProps(el, 'self', beforeOuter, innerOuter, defs);
    }
  }

  // capture each def’s default computed value
  defs.forEach(d => {
    const cs = getComputedStyle(d.el)[d.prop];
    d.default = d.type === 'range' ? parseFloat(cs) : cs;
  });

  return defs;
}

// Helper to turn "body" into actual defs
function parseProps(el, selector, section, body, defs) {
  for (const part of body.split(/\s*,\s*/)) {
    const tokens = part.trim().split(/\s+/);
    if (!tokens[0]) continue;
    const propRaw = tokens[0];
    const prop = toCamelCase(propRaw);
    const label = humanize(propRaw);

    if (tokens[1] === 'color') {
      defs.push({ el, selector, section, prop, type: 'color', label });
    } else {
      const m = (tokens[1] || '').match(/^from(-?\d+)to(-?\d+)$/);
      if (m) {
        defs.push({
          el, selector, section, prop, type: 'range',
          min: +m[1],
          max: +m[2],
          unit: tokens[2] || 'px',
          label
        });
      }
    }
  }
}

function applyStyle(def, value) {
  // Determine target elements
  let elements;
  if (def.selector === 'self') {
    elements = [def.el];
  } else if (def.selector.startsWith('child')) {
    const idx = parseInt(def.selector.slice(5), 10) - 1;
    elements = def.el.children[idx] ? [def.el.children[idx]] : [];
  } else {
    // Try as ID first
    elements = Array.from(def.el.querySelectorAll(`#${def.selector}`));

    // If no elements found, try as class
    if (!elements.length) {
      elements = Array.from(def.el.querySelectorAll(`.${def.selector}`));
    }

    // If still none, try as tag name
    if (!elements.length) {
      elements = Array.from(def.el.getElementsByTagName(def.selector));
    }

    // Fallback to host element if nothing found
    if (!elements.length) elements = [def.el];
  }

  elements.forEach(target => {
    target.style[def.prop] = value;
  });
}
function initMorphDefs() {
  morphDefs = [];
  document.querySelectorAll('[data-morph]').forEach(el => {
    morphDefs.push(...parseMorphAttribute(el));
  });
}
function morphKey(def) {
  const base = def.selector === 'self'
    ? def.el.id
    : def.selector;
  return `${base}-${def.prop}`;
}
function buildMorphControls() {
  document.querySelectorAll('.settings-group.morph-generated')
    .forEach(g => g.remove());

  const savedMorph = getSettings().morph || {};

  const bySection = morphDefs.reduce((acc, def) => {
    (acc[def.section] = acc[def.section] || []).push(def);
    return acc;
  }, {});

  for (const [section, defs] of Object.entries(bySection)) {
    const pane = document.querySelector(`.${section}`);
    if (!pane) continue;

    const byGroup = defs.reduce((acc, def) => {
      const key = def.selector === 'self' ? def.el.id : def.selector;
      (acc[key] = acc[key] || []).push(def);
      return acc;
    }, {});

    // build one .settings-group per selector-group
    for (const [groupKey, defsForGroup] of Object.entries(byGroup)) {
      const group = document.createElement('div');
      group.className = 'settings-group morph-generated';

      const host = defsForGroup[0].el;
      let targetEls = [];
      if (groupKey === 'self' || groupKey === host.id) {
        targetEls = [host];
      } else if (/^child(\d+)$/.test(groupKey)) {
        const idx = parseInt(groupKey.match(/^child(\d+)$/)[1], 10) - 1;
        targetEls = [host.children[idx] || host];
      } else {
        // try ID → class → kebab-case class → tag → fallback
        let found = host.querySelectorAll(`#${groupKey}`);
        if (!found.length) found = host.querySelectorAll(`.${groupKey}`);
        if (!found.length) {
          const kebab = groupKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          found = host.querySelectorAll(`.${kebab}`);
        }
        if (!found.length) found = host.querySelectorAll(groupKey);
        targetEls = found.length ? Array.from(found) : [host];
      }

      defsForGroup.forEach(def => {
        const wrap = document.createElement('label');
        wrap.className = 'morph-control';

        const lbl = document.createElement('div');
        lbl.textContent = def.label;
        wrap.appendChild(lbl);

        const key = (def.selector === 'self' ? def.el.id : def.selector) + '-' + def.prop;

        if (def.type === 'range') {
          const inp = document.createElement('input');
          inp.type = 'range';
          inp.setAttribute('data-morph-key', key);
          inp.min = def.min; inp.max = def.max; inp.step = def.step || 1;
          inp.value = savedMorph[key] !== undefined
            ? parseFloat(savedMorph[key])
            : def.default;

          const vs = document.createElement('span');
          vs.textContent = `${inp.value}${def.unit}`;

          inp.addEventListener('input', e => {
            const v = e.target.value + def.unit;
            vs.textContent = v;
            targetEls.forEach(t => t.style[def.prop] = v);
          });

          wrap.append(inp, vs);
        }
        else if (def.type === 'color') {
          const col = document.createElement('input');
          col.type = 'color';
          col.setAttribute('data-morph-key', key);
          const init = savedMorph[key] || def.default;
          col.value = rgbToHex(init);

          const alpha = document.createElement('input');
          alpha.type = 'range';
          alpha.setAttribute('data-morph-key', key);
          alpha.min = 0; alpha.max = 100; alpha.step = 1;
          const m = init.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
          alpha.value = m ? Math.round(parseFloat(m[1]) * 100) : 100;

          const aval = document.createElement('span');
          aval.textContent = `${alpha.value}%`;

          const update = () => {
            const { r, g, b } = hexToRgb(col.value);
            const a = alpha.value / 100;
            const rgba = `rgba(${r},${g},${b},${a})`;
            targetEls.forEach(t => t.style[def.prop] = rgba);
            aval.textContent = `${alpha.value}%`;
          };

          col.addEventListener('input', update);
          alpha.addEventListener('input', update);

          wrap.append(alpha, aval, col);
        }

        group.appendChild(wrap);
      });

      pane.appendChild(group);
    }
  }
}

function applyMorphSettings(settings) {
  const morph = settings.morph || {};
  morphDefs.forEach(def => {
    const key = morphKey(def);
    const stored = morph[key];
    if (stored == null) return;

    // apply to page
    applyStyle(def, stored);

    // mirror into inputs
    if (def.type === 'range') {
      const inp = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      const vs = inp.nextElementSibling;
      const num = parseFloat(stored);
      inp.value = num;
      vs.textContent = stored;
    } else {
      const col = document.querySelector(`input[type=color][data-morph-key="${key}"]`);
      const alpha = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      const m = stored.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (m) {
        const [, r, g, b, a] = m.map(Number);
        col.value = rgbToHex(`rgb(${r},${g},${b})`);
        if (alpha) {
          alpha.value = Math.round(a * 100);
          alpha.nextElementSibling.textContent = `${Math.round(a * 100)}%`;
        }
      }
    }
  });
}
function getDefaultValue(def) {
  let value;
  if (def.selector === 'self') value = getComputedStyle(def.el)[def.prop];
  else if (def.selector.startsWith('child')) {
    const idx = parseInt(def.selector.slice(5), 10) - 1;
    const ch = def.el.children[idx]; if (ch) value = getComputedStyle(ch)[def.prop];
  } else {
    const ch = def.el.querySelector('.' + def.selector);
    if (ch) value = getComputedStyle(ch)[def.prop];
  }
  return def.type === 'range' ? parseFloat(value) : value;
}
function splitTopLevel(str) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') depth--;
    else if (str[i] === ',' && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts.filter(Boolean);
}
function collectMorphSettings() {
  const out = {};
  morphDefs.forEach(def => {
    const key = morphKey(def);
    // range?
    const rng = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
    if (rng && def.type === 'range') {
      out[key] = rng.value + def.unit;
      return;
    }
    // color?
    const col = document.querySelector(`input[type=color][data-morph-key="${key}"]`);
    if (col && def.type === 'color') {
      const alpha = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      const a = alpha ? (alpha.value / 100) : 1;
      const { r, g, b } = hexToRgb(col.value);
      out[key] = `rgba(${r},${g},${b},${a})`;
    }
  });
  return out;
}
function saveMorphSettings() {
  const data = collectMorphSettings();
  localStorage.setItem('morphSettings', JSON.stringify(data));
}

////////////////////////////////////////////////////////////

// ==========================
// 🧲 EVENT LISTENERS
// ==========================

// === CACHED ELEMENT REFERENCES ===
const elClock = document.getElementById("clock");
const elClockPreview = document.getElementById("clockPreview");
const elClockFont = document.getElementById("clockFont");
const elClockSize = document.getElementById("clockSize");
const elClockSizeValue = document.getElementById("clockSizeValue");
const elClockMargin = document.getElementById("clockMargin");
const elClockMarginValue = document.getElementById("clockMarginValue");
const elSettingsPanel = document.getElementById("settings");
const elToggleClock = document.getElementById("toggleClock");
const elToggleSearch = document.getElementById("toggleSearch");
const elToggleLinks = document.getElementById("toggleLinks");
const elToggleLinkLabels = document.getElementById("toggleLinkLabels")
const elToggleBookmarks = document.getElementById("toggleBookmarks");
const elLinkGrid = document.getElementById("linkGrid");
const elThemeSelector = document.getElementById("themeSelector");
const elSearchInput = document.getElementById("searchInput");
const elSearchSuggestions = document.getElementById("searchSuggestions");
const elSearchEngine = document.getElementById("searchEngine");
const elWallpaperFile = document.getElementById("wallpaperFile");
const elClearWallpaper = document.getElementById("clearWallpaper");
const elSaveSettings = document.getElementById("saveSettings");
const elCancelSettings = document.getElementById("cancelSettings");
const elResetSettings = document.getElementById("resetSettings");
const elResetAll = document.getElementById("resetAll");

function setupEventListeners() {
  
/*   function enablePanelDimmingOnInteract() {
    const panel = document.querySelector('.settings-panel');
    if (!panel) return;

    // 1) Dim on pointerdown *only* if it’s an input (not checkbox)
    panel.addEventListener('pointerdown', e => {
      const t = e.target;
      if (t.tagName === 'INPUT' && t.type !== 'checkbox') {
        panel.classList.add('interacting');
      }
    });

    // 2) Undim on pointerup unless it's a color still open
    panel.addEventListener('pointerup', e => {
      const t = e.target;
      if (!(t.tagName === 'INPUT' && t.type === 'color' && document.activeElement === t)) {
        panel.classList.remove('interacting');
      }
    });

    // 3) Dim on focusin of any input (bubbles)
    panel.addEventListener('focusin', e => {
      const t = e.target;
      if (t.tagName === 'INPUT' && t.type !== 'checkbox') {
        panel.classList.add('interacting');
      }
    });

    // 4) Undim on focusout of any input
    panel.addEventListener('focusout', e => {
      const t = e.target;
      if (t.tagName === 'INPUT' && t.type !== 'checkbox') {
        panel.classList.remove('interacting');
      }
    });

    // 5) Color‐picker “change” always clears dim
    panel.querySelectorAll('input[type="color"]').forEach(col => {
      col.addEventListener('change', () => {
        panel.classList.remove('interacting');
      });
    });
  }
  enablePanelDimmingOnInteract(); */

  // — CLOCK SETTINGS —
  elClock.addEventListener("dblclick", () => {
    loadSettingsToForm();
    document.dispatchEvent(new Event('settingsOpened'));
    elSettingsPanel.hidden = false;
  });
  elClockFont.addEventListener("change", (e) => {
    const f = e.target.value;
    elClockPreview.style.fontFamily = f;
    elClock.style.fontFamily = f;
  });
  elClockSize.addEventListener("input", (e) => {
    const size = e.target.value;
    elClockSizeValue.textContent = size;
    elClockPreview.style.fontSize = `${size}rem`;
    elClock.style.fontSize = `${size}rem`;
  });
  elClockMargin.addEventListener("input", (e) => {
    const v = e.target.value;
    elClockMarginValue.textContent = v;
    elClock.style.marginBottom = v + "px";
  });

  // — FALLBACK CLOCK DBLCLICK —
  document.body.addEventListener("dblclick", () => {
    if (!elClock.offsetParent && elSettingsPanel.hidden) {
      loadSettingsToForm();
      document.dispatchEvent(new Event('settingsOpened'));
      elSettingsPanel.hidden = false;
    }
  });

  // — INTERFACE TOGGLES —
  [elToggleClock, elToggleSearch, elToggleLinks, elToggleLinkLabels, elToggleBookmarks].forEach(el => {
    el.addEventListener("change", () => {
      applyInterface({
        showClock: elToggleClock.checked,
        showSearch: elToggleSearch.checked,
        showLinks: elToggleLinks.checked,
        showLinkLabels: elToggleLinkLabels.checked,
        showBookmarks: elToggleBookmarks.checked
      });
    });
  });
  elToggleSearch.addEventListener("change", function () {
    elLinkGrid.style.margin = this.checked ? "60px" : "0";
  });

  // — APPEARANCE SETTINGS —
  elThemeSelector.addEventListener("change", (e) => onThemeChange(e.target.value));

  // — WALLPAPER —
  elWallpaperFile.dataset.label = "Choose Wallpaper";
  elWallpaperFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    elWallpaperFile.dataset.label = file.name;
    URL.revokeObjectURL(currentWallpaperURL);
    currentWallpaperURL = URL.createObjectURL(file);
    document.body.style.backgroundImage = `url(${currentWallpaperURL})`;
    const db = await initDB();
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put(file, "wallpaperBlob");
    tx.oncomplete = () => db.close();
  });
  elClearWallpaper.addEventListener("click", async () => {
    if (currentWallpaperURL) {
      URL.revokeObjectURL(currentWallpaperURL);
      currentWallpaperURL = null;
    }
    document.body.style.backgroundImage = "";
    elWallpaperFile.value = "";
    elWallpaperFile.dataset.label = "Choose Wallpaper";
    const db = await initDB();
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").delete("wallpaperBlob");
    tx.oncomplete = () => db.close();
  });

  // — SETTINGS BUTTONS —
  elSaveSettings.addEventListener("click", saveSettings);
  elCancelSettings.addEventListener("click", () => {
    applyStoredSettings();
    elSettingsPanel.hidden = true;
  });
  elResetSettings.addEventListener("click", resetSettings);
  elResetAll.addEventListener("click", resetAllSettings);

  // — LINK EDIT MODAL —
  document.getElementById("saveLinkEdit").addEventListener("click", saveLinkEdit);
  document.getElementById("cancelLinkEdit").addEventListener("click", () => {
    linkEditModal.hidden = true;
    currentlyEditingIndex = null;
  });
  document.getElementById("removeLink").addEventListener("click", removeCurrentLink);

  // — LINK EXPORT/IMPORT —
  document.getElementById("exportLinks").addEventListener("click", exportLinks);
  document.getElementById("importLinks").addEventListener("click", () => document.getElementById("importLinksFile").click());
  document.getElementById("importLinksFile").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      importLinks(e.target.files[0]);
      e.target.value = "";
    }
  });

  // — THEME EXPORT/IMPORT —
  document.getElementById("exportTheme").addEventListener("click", exportTheme);
  document.getElementById("importTheme").addEventListener("click", () => document.getElementById("importThemeFile").click());
  document.getElementById("importThemeFile").addEventListener("change", (e) => {
    if (e.target.files.length) importTheme(e.target.files[0]);
    e.target.value = "";
  });

  // — SEARCH SUGGESTIONS —
  elSearchInput.addEventListener("input", handleSearchInput);
  elSearchInput.addEventListener("focus", showSuggestions);
  elSearchInput.addEventListener("blur", () => {
    setTimeout(() => {
      const hovered = document.querySelector(".suggestion-item:hover");
      if (!hovered) hideSuggestions();
    }, 150);
  });

  // — SEARCH ENGINE SELECTOR —
  elSearchEngine.addEventListener("change", (e) => {
    saveSearchEngine(e.target.value);
  });

  // — SETTINGS PANEL TABS —
  document.querySelectorAll(".settings-sidebar .tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`${button.getAttribute("data-tab")}-tab`).classList.add("active");
    });
  });

  // — NUMBER BUTTONS —
  document.querySelectorAll(".number-btn.plus").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const input = e.target.parentElement.querySelector("input");
      input.stepUp();
      input.dispatchEvent(new Event("change"));
    });
  });
  document.querySelectorAll(".number-btn.minus").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const input = e.target.parentElement.querySelector("input");
      input.stepDown();
      input.dispatchEvent(new Event("change"));
    });
  });

  // — GRID SIZE CONTROLS —
  document.getElementById("cols").addEventListener("change", (e) => {
    applyGridLayout(parseInt(e.target.value), parseInt(document.getElementById("rows").value));
  });
  document.getElementById("rows").addEventListener("change", (e) => {
    applyGridLayout(parseInt(document.getElementById("cols").value), parseInt(e.target.value));
  });

  // — GLOBAL KEYDOWN NAVIGATION —
  window.addEventListener("keydown", (e) => {
    const suggestionsVisible = elSearchSuggestions.classList.contains("visible");
    if (e.key === "Escape") {
      if (suggestionsVisible) {
        hideSuggestions();
        elSearchInput.focus();
      }
      return;
    }
    if (suggestionsVisible && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
      handleSuggestionNavigation(e);
      e.preventDefault();
      return;
    }
    if (suggestionsVisible && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    const cols = parseInt(document.getElementById("cols").value) || 8;
    const rows = parseInt(document.getElementById("rows").value) || 2;
    const x = focusedTileIndex % cols;
    const y = Math.floor(focusedTileIndex / cols);
    let newX = x, newY = y;
    switch (e.key) {
      case "ArrowLeft": newX = x - 1; break;
      case "ArrowRight": newX = x + 1; break;
      case "ArrowUp": newY = y - 1; break;
      case "ArrowDown": newY = y + 1; break;
      default: return;
    }
    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
      focusedTileIndex = newY * cols + newX;
      allowFocusRestore = true;
      renderGrid();
    }
  });
}

// ==========================
// OTHER/MULTI PURPOSE
// ==========================

function setFocus() {
  const storedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaults;
  const focusTarget = storedSettings.focus?.target || defaults.focus.target;
  // If focusTarget is "searchbar" and we're NOT already redirected
  if (focusTarget === 'searchbar' && !location.search.includes('focus=1')) {
    location.href = 'index.html?focus=1';  // add a query to mark that we've redirected
    return; // important! exit early so nothing else runs yet
  }
}
async function getFavicon(link, providerOverride = null) {
  try {
    const url = new URL(link);
    const hostname = url.hostname;
    const provider = providerOverride || localStorage.getItem(FAVICON_PROVIDER_KEY) || defaults.faviconProvider;

    switch (provider) {
      case "google":
        return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
      case "duckduckgo":
        return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
      case "direct":
        return `${url.protocol}//${hostname}/favicon.ico`;
      default:
        return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
    }
  } catch (e) {
    return `Error getting favicon of ${hostname}`;
  }
}
function applyInterface({ showClock, showSearch, showLinks, showLinkLabels, showBookmarks }) {
  document.getElementById("clock").style.display = showClock ? "" : "none";
  document.querySelector(".search").style.display = showSearch ? "" : "none";
  document.getElementById("linkGrid").style.display = showLinks ? "" : "none";
  document.getElementById("bookmarkBar").style.display = showBookmarks ? "flex" : "none";
  document.querySelectorAll(".link-label").forEach(lbl => {
    lbl.style.display = showLinkLabels ? "" : "none";
  });
}
function rgbToHex(rgbValue) {
  let rgb = rgbValue.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!rgb) {
    const rgba = rgbValue.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/i);
    if (!rgba) {
      return rgbValue;
    }
    rgb = [rgba[0], rgba[1], rgba[2], rgba[3]];
  }

  const hex = (x) => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}
function hexToRgb(hex) {
  const h = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
    (m, r, g, b) => '#' + r + r + g + g + b + b
  );
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// ==========================
// 🔤 FONT LOADING
// ==========================

async function loadFonts() {
  const fonts = await fetch(chrome.runtime.getURL("fonts.json")).then(r => r.json());
  const sel = document.getElementById("clockFont");
  sel.innerHTML = "";

  // Get the currently selected font from settings
  const settings = getSettings();
  const currentFont = settings.clock?.font || defaults.clock.font;

  // Find the current font in our fonts list
  const currentFontData = fonts.find(f => f.css === currentFont);

  // Load only the current font immediately
  if (currentFontData && currentFontData.importUrl) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = currentFontData.importUrl;
    document.head.appendChild(link);

    // Add it to the dropdown
    const opt = document.createElement("option");
    opt.value = currentFontData.css;
    opt.textContent = currentFontData.label;
    opt.style.fontFamily = currentFontData.css;
    sel.appendChild(opt);
  }

  // Add all other fonts to dropdown but don't load them yet
  fonts.forEach(f => {
    if (f.css !== currentFont) {
      const opt = document.createElement("option");
      opt.value = f.css;
      opt.textContent = f.label;
      opt.style.fontFamily = f.css;
      sel.appendChild(opt);
    }
  });

  // Load remaining fonts when settings panel is opened
  const loadRemainingFonts = () => {
    fonts.forEach(f => {
      if (f.css !== currentFont && f.importUrl) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = f.importUrl;
        document.head.appendChild(link);
      }
    });
    // Remove this listener after first run
    document.removeEventListener('settingsOpened', loadRemainingFonts);
  };

  // Listen for settings panel opening
  document.addEventListener('settingsOpened', loadRemainingFonts);

  // Mark fonts as loaded
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add("fonts-loaded");
    });
  } else {
    document.documentElement.classList.add("fonts-loaded");
  }
}

// ==========================
// 🗃️ INDEXEDDB UTILS
// ==========================

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("MorphNewTabDB", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("settings");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ==========================
// ⏰ CLOCK
// ==========================

function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("clock").textContent = timeString;
}
function applyClockStyles() {
  const clock = document.getElementById("clock");
  const preview = document.getElementById("clockPreview");
  const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

  // 1) Font & size
  const font = stored.clock?.font || defaults.clock.font;
  const size = stored.clock?.size || defaults.clock.size;
  clock.style.fontFamily = font;
  clock.style.fontSize = `${size}rem`;
  if (preview) {
    preview.style.fontFamily = font;
    preview.style.fontSize = `${size}rem`;
  }

  // 2) Color
  const color = stored.colors?.clockColor || defaults.colors.clockColor;
  clock.style.color = color;
  if (preview) preview.style.color = color;

  // 3) Spacing (margin)
  const margin = stored.clock?.margin ?? defaults.clock.margin;
  clock.style.marginBottom = `${margin}px`;
  if (preview) preview.style.marginBottom = "";
}

// ==========================
// 🔍 SEARCH ENGINE SETUP
// ==========================

function loadSearchEngine() {
  const engine = localStorage.getItem(SEARCH_ENGINE_KEY) || "duckduckgo";
  const currentEngine = searchEngines[engine];

  searchForm.action = currentEngine.url;
  searchInput.placeholder = `Search with ${currentEngine.name}...`;
  searchEngineIcon.src = currentEngine.icon;

  document.getElementById("searchEngine").value = engine;
}
function saveSearchEngine(engine) {
  localStorage.setItem(SEARCH_ENGINE_KEY, engine);
  loadSearchEngine();
}



// ==========================
// 📑 BOOKMARK BAR
// ==========================

async function fetchAndRenderBookmarks() {
  if (!chrome.bookmarks || !chrome.bookmarks.getTree) return;
  // wrap callback API in a Promise
  const tree = await new Promise(resolve => chrome.bookmarks.getTree(resolve));
  const barNode = findBarNode(tree);
  const container = document.getElementById("bookmarkBar");
  container.innerHTML = "";

  if (barNode && Array.isArray(barNode.children)) {
    barNode.children.forEach(node => {
      container.appendChild(makeBookmarkNode(node));
    });
  }
}
function makeBookmarkNode(node) {
  // If it's a bookmark URL:
  if (node.url) {
    const a = document.createElement("a");
    a.className = "bookmark-item";
    a.href = node.url;
    a.target = "_blank";

    // Favicon
    const img = document.createElement("img");
    const host = new URL(node.url).hostname;
    img.src = `https://icons.duckduckgo.com/ip3/${host}.ico`;
    img.alt = "";
    a.appendChild(img);

    // Title
    const span = document.createElement("span");
    span.textContent = node.title || host;
    a.appendChild(span);

    return a;

    // If it's a folder:
  } else if (Array.isArray(node.children)) {
    const div = document.createElement("div");
    div.className = "bookmark-folder";

    // Folder icon
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("folder.png");
    icon.alt = "";
    icon.className = "folder-icon";
    div.appendChild(icon);

    // Folder label
    const label = document.createElement("span");
    label.textContent = node.title || "Folder";
    div.appendChild(label);

    // Child container
    const childContainer = document.createElement("div");
    childContainer.className = "folder-children";
    node.children.forEach(child => {
      childContainer.appendChild(makeBookmarkNode(child));
    });
    div.appendChild(childContainer);

    return div;
  }

  // Fallback empty node
  return document.createDocumentFragment();
}
function findBarNode(nodes) {
  for (const n of nodes) {
    if (n.id === "1") return n;
    if (Array.isArray(n.children)) {
      const found = findBarNode(n.children);
      if (found) return found;
    }
  }
  return null;
}

// ==========================
// 🎨 THEME
// ==========================

function exportTheme() {
  const settings = getSettings();
  const fullMorph = {};
  morphDefs.forEach(def => {
    const key = morphKey(def);
    if (settings.morph[key] != null) {
      fullMorph[key] = settings.morph[key];
    } else {
      fullMorph[key] = def.type === 'range'
        ? `${def.default}${def.unit}`
        : def.default;
    }
  });
  settings.morph = fullMorph;

  const data = JSON.stringify(settings, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "newtab-complete-theme.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function importTheme(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(imported));
      applyStoredSettings();
      alert("Theme imported and applied!");
    } catch (err) {
      console.error("Import failed:", err);
      alert("Invalid theme file.");
    }
  };
  reader.readAsText(file);
}

function onThemeChange(name) {
  applyTheme(name);

  const themeMorph = (themes[name] || {}).morph || {};
  morphDefs.forEach(def => {
    const key = morphKey(def);
    const val = (themeMorph[key] != null) ? themeMorph[key] : def.default;
    applyStyle(def, val);
    // mirror into UI controls:
    if (def.type === 'range') {
      const inp = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      const vs = inp && inp.nextElementSibling;
      if (inp) inp.value = parseFloat(val);
      if (vs) vs.textContent = val;
    } else {
      const col = document.querySelector(`input[type=color][data-morph-key="${key}"]`);
      const alpha = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      if (col && alpha) {
        const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (m) {
          col.value = rgbToHex(`rgb(${m[1]},${m[2]},${m[3]})`);
          alpha.value = Math.round(parseFloat(m[4]) * 100);
          alpha.nextElementSibling.textContent = `${alpha.value}%`;
        }
      }
    }
  });
}

function applyTheme(id) {
  const t = themes[id] || themes.default;

  // 1) Apply all CSS vars for colors
  Object.entries(t.colors).forEach(([k, v]) => {
    document.documentElement.style.setProperty(`--${k}`, v);
  });

  // 2) Sync the inputs
  document.getElementById("themeSelector").value = id;
  Object.entries(t.colors).forEach(([k, v]) => {
    const inp = document.getElementById(k);
    if (inp) inp.value = v;
  });

  // 3) Apply clock settings
  document.getElementById("clockFont").value = t.clock.font;
  document.getElementById("clockSize").value = t.clock.size;
  document.getElementById("clockSizeValue").textContent = t.clock.size;
  document.getElementById("clockMargin").value = t.clock.margin;
  document.getElementById("clockMarginValue").textContent = t.clock.margin;
  applyClockStyles();
}

// ==========================
// 🔗 LINK MANAGEMENT
// ==========================

function showLinkEditModal(index) {
  currentlyEditingIndex = index;
  const links = loadLinks();
  const link = links[index];

  document.getElementById("editUrl").value = link.url || "";
  document.getElementById("editTitle").value = link.title || "";

  // Set the favicon provider if it exists in the link data
  if (link.faviconProvider) {
    document.getElementById("faviconProvider").value = link.faviconProvider;
  } else {
    document.getElementById("faviconProvider").value =
      localStorage.getItem(FAVICON_PROVIDER_KEY) || defaults.faviconProvider;
  }

  linkEditModal.hidden = false;
}
function saveLinkEdit() {
  const links = loadLinks();
  const url = document.getElementById("editUrl").value.trim();
  const title = document.getElementById("editTitle").value.trim();
  const faviconProvider = document.getElementById("faviconProvider").value;

  if (url) {
    let fullUrl = url;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = "https://" + fullUrl;
    }

    links[currentlyEditingIndex] = {
      url: fullUrl,
      title: title || fullUrl,
      faviconProvider: faviconProvider
    };

    saveLinks(links);
    renderGrid();
  }

  linkEditModal.hidden = true;
  currentlyEditingIndex = null;
}
function removeCurrentLink() {
  const links = loadLinks();
  links[currentlyEditingIndex] = { url: "", title: "" };
  saveLinks(links);
  renderGrid();
  linkEditModal.hidden = true;
  currentlyEditingIndex = null;
}
function loadLinks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : Array(TOTAL_TILES).fill({ url: "", title: "" });
}
function saveLinks(links) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}
function exportLinks() {
  const links = loadLinks();
  const data = JSON.stringify(links, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "newtab-links.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importLinks(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const links = JSON.parse(e.target.result);
      if (Array.isArray(links)) {
        saveLinks(links);
        renderGrid();
        alert("Links imported successfully!");
      } else {
        alert("Invalid links format");
      }
    } catch (err) {
      alert("Error parsing file");
    }
  };
  reader.readAsText(file);
}

// ==========================
// ⚙️ SETTINGS LOGIC
// ==========================

function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  const saved = raw ? JSON.parse(raw) : {};

  return {
    grid: { ...defaults.grid, ...(saved.grid || {}) },
    clock: { ...defaults.clock, ...(saved.clock || {}) },
    interface: { ...defaults.interface, ...(saved.interface || {}) },
    focus: { ...defaults.focus, ...(saved.focus || {}) },
    theme: saved.theme || defaults.theme,
    morph: saved.morph || {},
    more: { ...defaults.more, ...(saved.more || {}) }
  };
}
function applyStoredSettings() {
  const settings = getSettings();

  // Theme
  const themeEl = document.getElementById("themeSelector");
  if (themeEl) {
    themeEl.value = settings.theme;
    applyTheme(settings.theme);
  }

  // Grid
  const colsEl = document.getElementById("cols");
  const rowsEl = document.getElementById("rows");
  if (colsEl && rowsEl) {
    colsEl.value = settings.grid.cols;
    rowsEl.value = settings.grid.rows;
    applyGridLayout(settings.grid.cols, settings.grid.rows);
  }

  // Clock
  const fontEl = document.getElementById("clockFont");
  const sizeEl = document.getElementById("clockSize");
  const marginEl = document.getElementById("clockMargin");
  if (fontEl && sizeEl && marginEl) {
    fontEl.value = settings.clock.font;
    sizeEl.value = settings.clock.size;
    document.getElementById("clockSizeValue").textContent = settings.clock.size;
    marginEl.value = settings.clock.margin;
    document.getElementById("clockMarginValue").textContent = settings.clock.margin;
    applyClockStyles();
  }

  // Interface toggles (including Link Labels)
  const iface = settings.interface;
  [
    ["toggleClock", iface.showClock],
    ["toggleSearch", iface.showSearch],
    ["toggleLinks", iface.showLinks],
    ["toggleLinkLabels", iface.showLinkLabels],
    ["toggleBookmarks", iface.showBookmarks]
  ].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });
  applyInterface(iface);

  // Middle-click background
  const mid = document.getElementById("middleClickBackground");
  if (mid) mid.checked = settings.more.middleClickBackground;

  // Focus target
  const focusEl = document.getElementById("focusTarget");
  if (focusEl) focusEl.value = settings.focus.target;
}

function saveSettings() {
  const settings = {
    grid: {
      cols: parseInt(document.getElementById("cols").value, 10),
      rows: parseInt(document.getElementById("rows").value, 10)
    },
    clock: {
      font: document.getElementById("clockFont").value,
      size: parseFloat(document.getElementById("clockSize").value),
      margin: parseInt(document.getElementById("clockMargin").value, 10)
    },
    interface: {
      showClock: document.getElementById("toggleClock").checked,
      showSearch: document.getElementById("toggleSearch").checked,
      showLinks: document.getElementById("toggleLinks").checked,
      showLinkLabels: document.getElementById("toggleLinkLabels").checked,
      showBookmarks: document.getElementById("toggleBookmarks").checked
    },
    focus: {
      target: document.getElementById("focusTarget").value
    },
    theme: document.getElementById("themeSelector").value,

    morph: collectMorphSettings(),
    more: {
      middleClickBackground: document.getElementById("middleClickBackground").checked
    }
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyStoredSettings();
  settingsPanel.hidden = true;
}

function loadSettingsToForm() {
  const settings = getSettings();

  // Grid
  document.getElementById("cols").value = settings.grid.cols;
  document.getElementById("rows").value = settings.grid.rows;
  applyGridLayout(settings.grid.cols, settings.grid.rows);

  // Clock
  document.getElementById("clockFont").value = settings.clock.font;
  document.getElementById("clockSize").value = settings.clock.size;
  document.getElementById("clockSizeValue").textContent = settings.clock.size;
  document.getElementById("clockMargin").value = settings.clock.margin;
  document.getElementById("clockMarginValue").textContent = settings.clock.margin;
  applyClockStyles();

  // Interface toggles
  const iface = settings.interface;
  document.getElementById("toggleClock").checked = iface.showClock;
  document.getElementById("toggleSearch").checked = iface.showSearch;
  document.getElementById("toggleLinks").checked = iface.showLinks;
  document.getElementById("toggleLinkLabels").checked = iface.showLinkLabels;
  document.getElementById("toggleBookmarks").checked = iface.showBookmarks;
  applyInterface(iface);

  // Focus target
  document.getElementById("focusTarget").value = settings.focus.target;

  // Theme
  if (settings.theme) {
    document.getElementById("themeSelector").value = settings.theme;
  }
}


function resetSettings() {
  if (!confirm("Are you sure you want to reset Appearance (including all morphs)?")) return;

  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

  delete settings.morph;

  settings.theme = 'default';

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  applyStoredSettings();

  settingsPanel.hidden = true;
}

function resetAllSettings() {
  if (!confirm("Are you sure you want to reset ALL settings and links?")) return;

  localStorage.clear();
  resetSettings();

  applyGridLayout(defaults.grid.cols, defaults.grid.rows);
  renderGrid();
  loadSearchEngine();
  applyInterface(defaults.interface);
  saveSettings();
  settingsPanel.hidden = true;
  alert("All settings have been reset to defaults");
}

// ==========================
// 🧱 GRID LAYOUT
// ==========================

function applyGridLayout(cols, rows) {
  grid.style.gridTemplateColumns = `repeat(${cols}, 96px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 127.2px)`;
  TOTAL_TILES = cols * rows;

  // Resize link array
  let links = loadLinks();
  if (links.length < TOTAL_TILES) {
    const diff = TOTAL_TILES - links.length;
    links = links.concat(Array(diff).fill({ url: "", title: "" }));
  } else if (links.length > TOTAL_TILES) {
    links = links.slice(0, TOTAL_TILES);
  }
  saveLinks(links);
  renderGrid();
}
function renderGrid() {
  const links = loadLinks();
  const frag = document.createDocumentFragment();

  links.forEach((item, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "link-wrapper";
    wrapper.tabIndex = 1;
    wrapper.setAttribute("draggable", true);

    const tile = document.createElement("div");
    tile.className = "link-tile";

    const label = document.createElement("div");
    label.className = "link-label";

    if (item.url) {
      const img = document.createElement("img");
      getFavicon(item.url, item.faviconProvider).then((faviconUrl) => {
        img.src = faviconUrl;
      });

      img.alt = "favicon";
      img.draggable = false;
      img.style.pointerEvents = "none";
      tile.appendChild(img);
      label.textContent = item.title || item.url;

      // Variables to track drag vs click
      let isDragging = false;
      let mouseDownTime = 0;
      const dragThreshold = 5; // pixels
      let startX, startY;

      tile.addEventListener("mousedown", (e) => {
        // Middle Click
        if (e.button === 1) {
          e.preventDefault();
          const openInBg = document.getElementById("middleClickBackground").checked;
          chrome.tabs.create({
            url: item.url,
            active: !openInBg
          });
          return;
        }

        // Left Click
        if (e.button === 0) {
          mouseDownTime = Date.now();
          startX = e.clientX;
          startY = e.clientY;
          isDragging = false;
        }
      });

      tile.addEventListener("mousemove", (e) => {
        if (mouseDownTime > 0) {
          // Check if mouse has moved enough to be considered a drag
          const dx = Math.abs(e.clientX - startX);
          const dy = Math.abs(e.clientY - startY);
          if (dx > dragThreshold || dy > dragThreshold) {
            isDragging = true;
          }
        }
      });

      tile.addEventListener("mouseup", (e) => {
        if (e.button === 0 && !isDragging && mouseDownTime > 0) {
          // Only open link if it was a quick click (not a drag)
          const clickDuration = Date.now() - mouseDownTime;
          if (clickDuration < 200) {
            // 200ms threshold
            window.open(item.url, "_self");
          }
        }
        mouseDownTime = 0;
        isDragging = false;
      });

      tile.addEventListener("mouseleave", () => {
        mouseDownTime = 0;
        isDragging = false;
      });

      tile.oncontextmenu = (e) => {
        e.preventDefault();
        showLinkEditModal(i);
      };
    } else {
      tile.textContent = "+";
      tile.style.fontSize = "1.5rem";
      tile.onclick = () => {
        showLinkEditModal(i);
      };
    }

    // Drag events
    wrapper.addEventListener("dragstart", (e) => {
      dragSourceIndex = i;
      wrapper.style.opacity = "0.5";
      e.dataTransfer.setData("text/plain", i); // Store the index
      e.dataTransfer.effectAllowed = "move";

      // Clear any existing drag classes
      document.querySelectorAll(".link-wrapper.drag-active").forEach((el) => {
        el.classList.remove("drag-active");
      });
    });

    wrapper.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      // Clear any previous timeout
      if (dropTimeout) {
        clearTimeout(dropTimeout);
        dropTimeout = null;
      }

      // Remove class from previous target if different
      if (lastDropTarget && lastDropTarget !== wrapper) {
        lastDropTarget.classList.remove("drag-active");
      }

      // Set new target
      if (dragSourceIndex !== i) {
        // Only highlight if not dragging over self
        wrapper.classList.add("drag-active");
        lastDropTarget = wrapper;
      }
    });

    wrapper.addEventListener("dragleave", (e) => {
      e.preventDefault();
      // Only remove class if leaving the entire wrapper
      if (!e.relatedTarget || !wrapper.contains(e.relatedTarget)) {
        // Add slight delay to prevent flickering
        dropTimeout = setTimeout(() => {
          wrapper.classList.remove("drag-active");
          if (lastDropTarget === wrapper) {
            lastDropTarget = null;
          }
        }, 50);
      }
    });

    wrapper.addEventListener("drop", (e) => {
      e.preventDefault();
      // Clear any pending timeout
      if (dropTimeout) {
        clearTimeout(dropTimeout);
        dropTimeout = null;
      }

      wrapper.classList.remove("drag-active");
      lastDropTarget = null;

      const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
      if (sourceIndex !== i) {
        const links = loadLinks();
        const tmp = links[sourceIndex];
        links[sourceIndex] = links[i];
        links[i] = tmp;
        saveLinks(links);
        renderGrid();
      }
    });

    wrapper.addEventListener("dragend", () => {
      // Reset styles
      document.querySelectorAll(".link-wrapper").forEach((el) => {
        el.style.opacity = "1";
        el.classList.remove("drag-active");
      });

      // Clear any pending timeout
      if (dropTimeout) {
        clearTimeout(dropTimeout);
        dropTimeout = null;
      }

      dragSourceIndex = null;
      lastDropTarget = null;
    });

    // Keyboard focus
    if (i === focusedTileIndex && allowFocusRestore) {
      setTimeout(() => {
        wrapper.focus();
        allowFocusRestore = false;
      }, 0);
    }

    // Enter key support
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && item.url) {
        window.open(item.url, "_self");
      }
    });

    wrapper.appendChild(tile);
    wrapper.appendChild(label);
    frag.appendChild(wrapper);
  });

  grid.innerHTML = "";
  grid.appendChild(frag);

  initMorphDefs();
  buildMorphControls();
  applyMorphSettings(getSettings());
  applyInterface(getSettings().interface);
}

// ==========================
// 🖼️ WALLPAPER
// ==========================

async function loadSavedWallpaper(db) {
  const tx = db.transaction("settings", "readonly");
  const store = tx.objectStore("settings");
  const req = store.get("wallpaperBlob");
  req.onsuccess = () => {
    const blob = req.result;
    if (blob) {
      currentWallpaperURL = URL.createObjectURL(blob);
      document.body.style.backgroundImage = `url(${currentWallpaperURL})`;
    }
  };
  await tx.complete;
  db.close();
}

// ==========================
// 🧠 SEARCH SUGGESTIONS
// ==========================

async function handleSearchInput(e) {
  const query = e.target.value.trim();

  clearTimeout(suggestionTimeout);
  suggestionTimeout = setTimeout(() => {
    fetchSuggestions(query);
  }, 100);
}
function showSuggestions() {
  const suggestions = document.getElementById("searchSuggestions");
  if (searchInput.value.trim() && suggestions.children.length > 0) {
    suggestions.classList.add("visible");
  }
}
function hideSuggestions() {
  lastSuggestionQuery = "";
  document.getElementById("searchSuggestions").classList.remove("visible");
}
async function fetchSuggestions(query) {
  if (query === lastSuggestionQuery) return;
  lastSuggestionQuery = query;

  try {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const [historyItems, topSites] = await Promise.all([
      chrome.history
        ? chrome.history.search({
          text: query,
          startTime: twoWeeksAgo,
          maxResults: 10
        })
        : Promise.resolve([]),
      chrome.topSites
        ? chrome.topSites.get()
        : Promise.resolve([])
    ]);

    const allItems = query
      ? [...historyItems, ...topSites]
      : topSites;

    // filter out entries without URLs
    const validItems = allItems.filter(item => item.url);

    // dedupe by URL, favoring history items first
    const seen = new Set();
    const uniqueItems = [];
    for (const item of validItems) {
      try {
        const urlObj = new URL(item.url);
        const urlKey = urlObj.hostname + urlObj.pathname;
        if (!seen.has(urlKey)) {
          seen.add(urlKey);
          uniqueItems.push(item);
        }
      } catch {
        // skip invalid URLs
      }
    }

    // sort by relevance
    uniqueItems.sort((a, b) => {
      const qLower = query.toLowerCase();
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();

      if (aTitle.startsWith(qLower) && !bTitle.startsWith(qLower)) return -1;
      if (!aTitle.startsWith(qLower) && bTitle.startsWith(qLower)) return 1;
      if (aTitle.includes(qLower) && !bTitle.includes(qLower)) return -1;
      if (!aTitle.includes(qLower) && bTitle.includes(qLower)) return 1;
      return 0;
    });

    displaySuggestions(uniqueItems.slice(0, 6));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    // fallback to topSites only
    if (chrome.topSites) {
      chrome.topSites.get().then(sites => {
        displaySuggestions(sites.slice(0, 6));
      });
    }
  }
}
function displaySuggestions(items) {
  const container = document.getElementById("searchSuggestions");
  container.innerHTML = "";
  const query = searchInput.value.trim().toLowerCase();

  // Deduplicate items
  const seen = new Map();
  const uniqueItems = [];

  items.forEach((item) => {
    try {
      const url = new URL(item.url);
      const normalizedUrl = `${url.hostname}${url.pathname}`.toLowerCase();

      if (!seen.has(normalizedUrl)) {
        seen.set(normalizedUrl, true);
        uniqueItems.push(item);
      }
    } catch (e) {
      console.warn("Invalid URL in suggestions:", item.url);
    }
  });

  if (uniqueItems.length === 0) {
    hideSuggestions();
    return;
  }

  uniqueItems.forEach((item) => {
    const suggestion = document.createElement("div");
    suggestion.className = "suggestion-item";
    suggestion.dataset.url = item.url;

    const icon = document.createElement("img");
    icon.className = "suggestion-icon";
    icon.src = `https://icons.duckduckgo.com/ip3/${new URL(item.url).hostname}.ico`;

    // Highlight matching text in the title
    const title = document.createElement("span");
    const titleText = item.title || item.url;
    title.innerHTML = highlightMatches(titleText, query);

    // Display URL (without highlighting for cleaner look)
    const url = document.createElement("span");
    url.className = "suggestion-url";
    url.textContent = new URL(item.url).hostname;

    suggestion.appendChild(icon);
    suggestion.appendChild(title);
    suggestion.appendChild(url);

    suggestion.addEventListener("click", () => {
      window.location.href = item.url;
    });

    container.appendChild(suggestion);
  });

  showSuggestions();
}
function highlightMatches(text, query) {
  if (!query || !text) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let result = "";
  let lastIndex = 0;

  // Find all occurrences of the query in the text
  for (let i = 0; i < text.length;) {
    const matchIndex = lowerText.indexOf(lowerQuery, i);
    if (matchIndex === -1) break;
    result += text.substring(lastIndex, matchIndex);
    // Add highlighted match
    result += `<span class="highlight-match">${text.substring(matchIndex, matchIndex + query.length)}</span>`;

    i = matchIndex + query.length;
    lastIndex = i;
  }

  // Add remaining text
  result += text.substring(lastIndex);

  return result || text; // Fallback if no matches
}
function handleSuggestionNavigation(e) {
  const suggestions = document.querySelectorAll(".suggestion-item");
  let currentIndex = -1;

  suggestions.forEach((item, index) => {
    if (item.classList.contains("selected")) {
      currentIndex = index;
      item.classList.remove("selected");
    }
  });

  if (e.key === "ArrowDown") {
    currentIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % suggestions.length;
    suggestions[currentIndex].classList.add("selected");
    suggestions[currentIndex].scrollIntoView({ block: "nearest" });
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    currentIndex =
      currentIndex === -1 ? suggestions.length - 1 : (currentIndex - 1 + suggestions.length) % suggestions.length;
    suggestions[currentIndex].classList.add("selected");
    suggestions[currentIndex].scrollIntoView({ block: "nearest" });
    e.preventDefault();
  } else if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (currentIndex !== -1) {
      window.location.href = suggestions[currentIndex].dataset.url;
    } else if (query) {
      const engineKey = localStorage.getItem(SEARCH_ENGINE_KEY) || "duckduckgo";
      const engine = searchEngines[engineKey];
      window.location.href = `${engine.url}?q=${encodeURIComponent(query)}`;
    }
    e.preventDefault();
  }
}