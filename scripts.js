
// ==========================
// 📦 GLOBAL CONSTANTS & STATE
// ==========================

const STORAGE_KEY = "customLinks";
const SETTINGS_KEY = "customSettings";
const SEARCH_ENGINE_KEY = "searchEngine";
const FAVICON_PROVIDER_KEY = "faviconProvider";

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
    placeholder: "rgba(255,255,255,0.55)",
    label: "#dddddd",
    clockColor: "#ffffff"
  },
  clock: {
    font: "system-ui, sans-serif",
    size: 5,
    margin: 66
  },
  fonts: {
    clockFont: "Poppins, sans-serif",
    labelFont: "Poppins, sans-serif"
  },
  interface: {
    showClock: true,
    showSearch: true,
    showLinks: true,
    showLinkLabels: true
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
    queryParam: "p",
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
      placeholder: "rgba(255,255,255,0.55)",
      label: "#dddddd",
      inputGlow: "rgba(170,170,255,1)",
      match: "rgba(255,221,0,0.85)",
      clockColor: "#ffffff"
    },
    clock: { font: "system-ui, sans-serif", size: 5, margin: 66 },
    interface: { ...defaults.interface }
  },
  fox: {
    colors: {
      bg: "#2b2a33",
      tile: "#42414d",
      highlight: "#55555c",
      text: "#fbfbfe",
      placeholder: "rgba(251,251,254,0.55)",
      label: "#fbfbfe",
      inputGlow: "rgba(255,144,0,1)",
      match: "rgba(255,200,0,0.85)",
      clockColor: "#fbfbfe"
    },
    clock: { font: "'Poppins', sans-serif", size: 5, margin: 66 },
    interface: { ...defaults.interface }
  },
  black: {
    colors: {
      bg: "#000000",
      tile: "#121212",
      highlight: "#1e1e1e",
      text: "#ffffff",
      placeholder: "rgba(255,255,255,0.55)",
      label: "#aaaaaa",
      inputGlow: "rgba(170,170,255,1)",
      match: "rgba(255,221,0,0.85)",
      clockColor: "#ffffff"
    },
    clock: { font: "'Roboto', sans-serif", size: 5, margin: 66 },
    interface: { ...defaults.interface }
  },
  "dark-grey": {
    colors: {
      bg: "#1a1a1a",
      tile: "#2a2a2a",
      highlight: "#3a3a3a",
      text: "#ffffff",
      placeholder: "rgba(255,255,255,0.55)",
      label: "#cccccc",
      inputGlow: "rgba(170,170,255,1)",
      match: "rgba(255,221,0,0.85)",
      clockColor: "#ffffff"
    },
    clock: { font: "'Open Sans', sans-serif", size: 5, margin: 66 },
    interface: { ...defaults.interface }
  },
  light: {
    colors: {
      bg: "#f0f0f0",
      tile: "#f5f5f5",
      highlight: "#e8e8e8",
      text: "#333333",
      placeholder: "rgba(51,51,51,0.55)",
      label: "#666666",
      inputGlow: "rgba(100,100,255,1)",
      match: "rgba(88,133,255,0.85)",
      clockColor: "#333333"
    },
    clock: { font: "'Montserrat', sans-serif", size: 5, margin: 66 },
    interface: { ...defaults.interface }
  }
};

let TOTAL_TILES = defaults.grid.cols * defaults.grid.rows;
let dragSourceIndex = null;
let focusedTileIndex = 0;
let allowFocusRestore = false;
let lastDropTarget = null;
let dropTimeout = null;
let currentlyEditingIndex = null;
let lastSuggestionQuery = "";
let suggestionTimeout = null;
let currentWallpaperURL = null;
let pendingWallpaper;
let lastFocusedElement = null;
let settingsSessionSnapshot = null;
let fontCatalog = [];
const fontLoadPromises = new Map();
let clockFontRequest = 0;

const extensionApi = typeof chrome !== "undefined" ? chrome : null;

// ==========================
// 🚀 INITIALIZATION
// ==========================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    setFocus();
    applyStoredSettings();
    updateClock();
    setupEventListeners();
    setInterval(updateClock, 60_000);

    loadFonts()
      .then(() => applyClockFont(elClockFont.value || getSettings().clock.font))
      .catch(error => console.warn("Could not initialize the selected clock font:", error))
      .finally(() => elClock.classList.remove("clock-font-pending"));

    try {
      const db = await initDB();
      await loadSavedWallpaper(db);
    } catch (error) {
      console.warn("Wallpaper storage is unavailable:", error);
    }

  } catch (error) {
    console.error("New tab initialization failed:", error);
  }
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
 *   must match an HTML class (e.g. “grid-background-style”, “lt-inter”)
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
 *   backdrop-blur range                → range slider rendered as blur(<value>)
 * 
 */

let morphDefs = [];
let morphRuleValues = new Map();

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function humanize(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
function morphLabel(el, selector, propRaw, prop) {
  const contextualLabels = {
    'linkGrid:self:marginTop': 'Search-to-Grid Gap',
    'linkGrid:linkLabel:marginTop': 'Tile-to-Label Gap',
    'linkGrid:link-wrapper:paddingBlock': 'Tile Area Vertical Padding',
    'linkGrid:link-wrapper:marginBlockEnd': 'Link Wrapper Bottom Margin',
    'searchContainer:#searchInput::placeholder:color': 'Placeholder Text Color'
  };
  const contextual = contextualLabels[`${el.id}:${selector}:${prop}`];
  if (contextual) return contextual;

  const commonLabels = {
    color: 'Text Color',
    backdropBlur: 'Backdrop Blur',
    backgroundShadowColor: 'Background Shadow Color',
    backgroundShadowX: 'Background Shadow X',
    backgroundShadowY: 'Background Shadow Y',
    backgroundShadowBlur: 'Background Shadow Blur',
    backgroundShadowSpread: 'Background Shadow Spread',
    positionOffsetX: 'Horizontal Offset',
    positionOffsetY: 'Vertical Offset',
    padding: 'Inner Padding',
    paddingBlock: 'Vertical Padding',
    paddingInline: 'Horizontal Padding'
  };
  return commonLabels[prop] || humanize(propRaw);
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

  // Capture defaults from the actual target, not always from the host element.
  defs.forEach(d => {
    d.default = getDefaultValue(d);
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
    const label = morphLabel(el, selector, propRaw, prop);

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

function selectorFor(def, stripPseudo = false) {
  if (def.selector === 'self') return null;
  if (def.selector.startsWith('child')) {
    const index = parseInt(def.selector.slice(5), 10);
    return `:scope > :nth-child(${index})`;
  }

  const aliases = {
    linkTile: '.link-tile',
    linkLabel: '.link-label'
  };
  let selector = aliases[def.selector] || def.selector;
  if (!['.', '#', '[', ':'].includes(selector[0]) && !selector.includes(' ')) {
    const kebab = selector.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    selector = `.${kebab}`;
  }
  return stripPseudo ? selector.replace(/:{1,2}[\w-]+(?:\([^)]*\))?/g, '') : selector;
}

const morphCustomProperties = {
  clockShadowColor: '--clock-shadow-color',
  clockShadowX: '--clock-shadow-x',
  clockShadowY: '--clock-shadow-y',
  clockShadowBlur: '--clock-shadow-blur',
  backgroundShadowColor: '--background-shadow-color',
  backgroundShadowX: '--background-shadow-x',
  backgroundShadowY: '--background-shadow-y',
  backgroundShadowBlur: '--background-shadow-blur',
  backgroundShadowSpread: '--background-shadow-spread',
  positionOffsetX: '--position-offset-x',
  positionOffsetY: '--position-offset-y'
};

const selectorMorphCustomProperties = {
  'linkTile-width': '--link-tile-width',
  'linkTile-height': '--link-tile-height'
};

const functionalMorphProperties = {
  backdropBlur: { cssProperty: 'backdrop-filter', functionName: 'blur' }
};

function cssPropertyFor(def) {
  return selectorMorphCustomProperties[`${def.selector}-${def.prop}`]
    || morphCustomProperties[def.prop]
    || functionalMorphProperties[def.prop]?.cssProperty
    || def.prop.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);
}

function cssPropertiesFor(def) {
  const property = cssPropertyFor(def);
  return property === 'backdrop-filter'
    ? ['backdrop-filter', '-webkit-backdrop-filter']
    : [property];
}

function targetElements(def) {
  if (def.selector === 'self') return [def.el];
  try {
    return Array.from(def.el.querySelectorAll(selectorFor(def, true)));
  } catch (error) {
    console.warn(`Invalid Morph selector: ${def.selector}`, error);
    return [];
  }
}

function morphNumber(value) {
  if (String(value ?? '').trim().toLowerCase() === 'none') return 0;
  const match = String(value ?? '').match(/-?(?:\d+(?:\.\d+)?|\.\d+)/);
  return match ? Number(match[0]) : NaN;
}

function formatMorphRangeValue(def, number) {
  const value = `${number}${def.unit}`;
  const functional = functionalMorphProperties[def.prop];
  if (!functional) return value;
  return number === 0 ? 'none' : `${functional.functionName}(${value})`;
}

function normalizeMorphValue(def, value) {
  if (def.type === 'range') {
    const parsed = morphNumber(value);
    const fallback = morphNumber(def.default);
    const number = Number.isFinite(parsed)
      ? Math.min(def.max, Math.max(def.min, parsed))
      : (Number.isFinite(fallback) ? fallback : def.min);
    return formatMorphRangeValue(def, number);
  }
  const targetProperty = cssPropertyFor(def);
  const validationProperty = def.type === 'color' && targetProperty.startsWith('--')
    ? 'color'
    : targetProperty;
  return typeof value === 'string' && CSS.supports(validationProperty, value) ? value : def.default;
}

function renderMorphRules() {
  let style = document.getElementById('morphRuntimeStyles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'morphRuntimeStyles';
    document.head.appendChild(style);
  }
  style.textContent = Array.from(morphRuleValues.values()).map(({ def, value }) => {
    const selector = selectorFor(def);
    const declarations = cssPropertiesFor(def)
      .map(property => `${property}: ${value} !important;`)
      .join(' ');
    return `#${def.el.id} ${selector} { ${declarations} }`;
  }).join('\n');
}

function applyStyle(def, value) {
  const normalized = normalizeMorphValue(def, value);
  if (def.selector === 'self') {
    cssPropertiesFor(def).forEach(property => def.el.style.setProperty(property, normalized));
    return;
  }
  morphRuleValues.set(morphKey(def), { def, value: normalized });
  renderMorphRules();
}

function clearMorphStyles() {
  morphDefs.forEach(def => {
    if (def.selector !== 'self') return;
    cssPropertiesFor(def).forEach(property => def.el.style.removeProperty(property));
  });
  morphRuleValues.clear();
  renderMorphRules();
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
function buildMorphControls(morphValues = null) {
  document.querySelectorAll('.morph-generated-control')
    .forEach(control => control.remove());
  document.querySelectorAll('.settings-group.morph-generated')
    .forEach(group => group.remove());

  const savedMorph = morphValues || getSettings().morph || {};

  const bySection = morphDefs.reduce((acc, def) => {
    (acc[def.section] = acc[def.section] || []).push(def);
    return acc;
  }, {});

  for (const [section, defs] of Object.entries(bySection)) {
    const pane = document.querySelector(`.${section}`);
    if (!pane) continue;

    // Append to a handmade group when one exists; otherwise create a group for
    // this section. Different CSS targets still share one visual group.
    const usesExistingGroup = pane.classList.contains('morph-controls-host');
    const group = usesExistingGroup ? pane : document.createElement('div');
    if (!usesExistingGroup) group.className = 'settings-group morph-generated';

    defs.forEach(def => {
      const wrap = document.createElement('label');
      wrap.className = 'morph-control morph-generated-control';

      const lbl = document.createElement('div');
      lbl.textContent = def.label;
      wrap.appendChild(lbl);

      const key = (def.selector === 'self' ? def.el.id : def.selector) + '-' + def.prop;

      if (def.type === 'range') {
        const inp = document.createElement('input');
        inp.type = 'range';
        inp.setAttribute('data-morph-key', key);
        inp.min = def.min; inp.max = def.max; inp.step = def.step || 1;
        const savedNumber = morphNumber(savedMorph[key]);
        inp.value = Number.isFinite(savedNumber) ? savedNumber : def.default;

        const vs = document.createElement('span');
        vs.textContent = `${inp.value}${def.unit}`;

        inp.addEventListener('input', e => {
          const v = e.target.value + def.unit;
          vs.textContent = v;
          applyStyle(def, v);
        });

        wrap.append(inp, vs);
      }
      else if (def.type === 'color') {
        const col = document.createElement('input');
        col.type = 'color';
        col.setAttribute('data-morph-key', key);
        const init = normalizeMorphValue(def, savedMorph[key] || def.default);
        col.value = rgbToHex(init);

        const alpha = document.createElement('input');
        alpha.type = 'range';
        alpha.setAttribute('data-morph-key', key);
        alpha.min = 0; alpha.max = 100; alpha.step = 1;
        alpha.value = Math.round(colorToRgba(init).a * 100);

        const aval = document.createElement('span');
        aval.textContent = `${alpha.value}%`;

        const update = () => {
          const { r, g, b } = hexToRgb(col.value);
          const a = alpha.value / 100;
          const rgba = `rgba(${r},${g},${b},${a})`;
          applyStyle(def, rgba);
          aval.textContent = `${alpha.value}%`;
        };

        col.addEventListener('input', update);
        alpha.addEventListener('input', update);

        wrap.append(alpha, aval, col);
      }

      group.appendChild(wrap);
    });

    if (!usesExistingGroup) pane.appendChild(group);
  }
}

function applyMorphSettings(settings) {
  const morph = settings.morph || {};
  morphDefs.forEach(def => {
    const key = morphKey(def);
    const stored = morph[key];
    if (stored == null) return;
    const normalized = normalizeMorphValue(def, stored);

    // apply to page
    applyStyle(def, normalized);

    // mirror into inputs
    if (def.type === 'range') {
      const inp = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      if (!inp) return;
      const vs = inp.nextElementSibling;
      const num = morphNumber(normalized);
      inp.value = num;
      vs.textContent = `${num}${def.unit}`;
    } else {
      const col = document.querySelector(`input[type=color][data-morph-key="${key}"]`);
      const alpha = document.querySelector(`input[type=range][data-morph-key="${key}"]`);
      if (col) {
        const { r, g, b, a } = colorToRgba(normalized);
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
  const property = cssPropertyFor(def);
  let value = '';

  if (def.selector !== 'self' && selectorFor(def).includes(':')) {
    const wantedSelector = selectorFor(def);
    const findRuleValue = rules => {
      for (const rule of rules) {
        if (rule.cssRules) {
          const nested = findRuleValue(rule.cssRules);
          if (nested) return nested;
        }
        if (rule.selectorText && rule.selectorText.split(',').some(item => item.trim() === wantedSelector)) {
          const candidate = rule.style.getPropertyValue(property);
          if (candidate) return candidate;
        }
      }
      return '';
    };
    for (const sheet of document.styleSheets) {
      try {
        value = findRuleValue(sheet.cssRules);
      } catch {
        // Ignore stylesheets that are not readable in the current origin.
      }
      if (value) break;
    }
  }

  if (!value) {
    const target = targetElements(def)[0] || def.el;
    value = getComputedStyle(target).getPropertyValue(property) || getComputedStyle(target)[def.prop];
  }

  value = value.trim().replace(/var\((--[\w-]+)\)/g, (_, variable) =>
    getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  );
  if (def.type === 'range') {
    const number = morphNumber(value);
    return Number.isFinite(number) ? number : def.min;
  }
  return value || 'rgba(0, 0, 0, 0)';
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
////////////////////////////////////////////////////////////

// ==========================
// 🧲 EVENT LISTENERS
// ==========================

// === CACHED ELEMENT REFERENCES ===
const elClock = document.getElementById("clock");
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
let settingsPanelTransitionId = 0;

function isSettingsPanelOpen() {
  return elSettingsPanel.classList.contains("is-open");
}

function showSettingsPanel() {
  settingsPanelTransitionId++;
  elSettingsPanel.hidden = false;
  // Flush the closed state before activating the transition.
  void elSettingsPanel.offsetWidth;
  elSettingsPanel.classList.add("is-open");
}

function hideSettingsPanel() {
  if (elSettingsPanel.hidden) return Promise.resolve();
  const transitionId = ++settingsPanelTransitionId;
  elSettingsPanel.classList.remove("is-open");

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elSettingsPanel.hidden = true;
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      elSettingsPanel.removeEventListener("transitionend", onTransitionEnd);
      if (transitionId === settingsPanelTransitionId) elSettingsPanel.hidden = true;
      resolve();
    };
    const onTransitionEnd = event => {
      if (event.target === elSettingsPanel && event.propertyName === "transform") finish();
    };
    elSettingsPanel.addEventListener("transitionend", onTransitionEnd);
    setTimeout(finish, 150);
  });
}

function openSettings() {
  lastFocusedElement = document.activeElement;
  settingsSessionSnapshot = {
    settings: localStorage.getItem(SETTINGS_KEY),
    links: localStorage.getItem(STORAGE_KEY),
    searchEngine: localStorage.getItem(SEARCH_ENGINE_KEY),
    legacyMorph: localStorage.getItem('morphSettings')
  };
  pendingWallpaper = undefined;
  loadSettingsToForm();
  showSettingsPanel();
  elSettingsPanel.querySelector('.tab-button.active')?.focus();
}

function restoreStorageValue(key, value) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

function restoreSettingsSession() {
  if (!settingsSessionSnapshot) return;
  restoreStorageValue(SETTINGS_KEY, settingsSessionSnapshot.settings);
  restoreStorageValue(STORAGE_KEY, settingsSessionSnapshot.links);
  restoreStorageValue(SEARCH_ENGINE_KEY, settingsSessionSnapshot.searchEngine);
  restoreStorageValue('morphSettings', settingsSessionSnapshot.legacyMorph);
  settingsSessionSnapshot = null;
}

async function cancelSettings() {
  restoreSettingsSession();
  clearMorphStyles();
  applyStoredSettings();
  pendingWallpaper = undefined;
  await restoreSavedWallpaper();
  await hideSettingsPanel();
  lastFocusedElement?.focus();
}

function closeLinkEditModal() {
  linkEditModal.hidden = true;
  currentlyEditingIndex = null;
  lastFocusedElement?.focus();
}

function trapFocus(container, event) {
  const focusable = Array.from(container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter(element => !element.hidden && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setupEventListeners() {
  // — CLOCK SETTINGS —
  elClock.addEventListener("dblclick", openSettings);
  elClock.addEventListener("keydown", event => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      openSettings();
    }
  });
  elClockFont.addEventListener("change", (e) => {
    const f = e.target.value;
    applyClockFont(f);
  });
  elClockSize.addEventListener("input", (e) => {
    const size = e.target.value;
    elClockSizeValue.textContent = size;
    elClock.style.fontSize = `${size}rem`;
  });
  elClockMargin.addEventListener("input", (e) => {
    const v = e.target.value;
    elClockMarginValue.textContent = v;
    elClock.style.marginBottom = v + "px";
  });

  // — FALLBACK CLOCK DBLCLICK —
  document.body.addEventListener("dblclick", () => {
    if (!elClock.offsetParent && !isSettingsPanelOpen()) {
      openSettings();
    }
  });

  // — LAYOUT VISIBILITY TOGGLES —
  [elToggleClock, elToggleSearch, elToggleLinks, elToggleLinkLabels].forEach(el => {
    el.addEventListener("change", () => {
      applyInterface({
        showClock: elToggleClock.checked,
        showSearch: elToggleSearch.checked,
        showLinks: elToggleLinks.checked,
        showLinkLabels: elToggleLinkLabels.checked
      });
    });
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
    pendingWallpaper = file;
  });
  elClearWallpaper.addEventListener("click", () => {
    if (currentWallpaperURL) {
      URL.revokeObjectURL(currentWallpaperURL);
      currentWallpaperURL = null;
    }
    document.body.style.backgroundImage = "";
    elWallpaperFile.value = "";
    elWallpaperFile.dataset.label = "Choose Wallpaper";
    pendingWallpaper = null;
  });

  // — SETTINGS BUTTONS —
  elSaveSettings.addEventListener("click", saveSettings);
  elCancelSettings.addEventListener("click", cancelSettings);
  elResetSettings.addEventListener("click", resetSettings);
  elResetAll.addEventListener("click", resetAllSettings);

  // — LINK EDIT MODAL —
  document.getElementById("saveLinkEdit").addEventListener("click", saveLinkEdit);
  document.getElementById("cancelLinkEdit").addEventListener("click", () => {
    closeLinkEditModal();
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
    applySearchEngine(e.target.value);
  });

  // — SETTINGS PANEL TABS —
  document.querySelectorAll(".settings-sidebar .tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
      document.querySelectorAll(".tab-button").forEach(btn => btn.setAttribute('aria-selected', 'false'));
      button.classList.add("active");
      button.setAttribute('aria-selected', 'true');
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
      } else if (!linkEditModal.hidden) {
        closeLinkEditModal();
      } else if (isSettingsPanelOpen()) {
        cancelSettings();
      }
      return;
    }
    if (e.key === "Tab" && !linkEditModal.hidden) {
      trapFocus(linkEditModal, e);
      return;
    }
    if (e.key === "Tab" && isSettingsPanelOpen()) {
      trapFocus(elSettingsPanel, e);
      return;
    }
    if (!linkEditModal.hidden || isSettingsPanelOpen()) return;
    if (suggestionsVisible && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
      handleSuggestionNavigation(e);
      e.preventDefault();
      return;
    }
    if (suggestionsVisible && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.target.matches("input, select, textarea, button")) return;
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
  const focusTarget = getSettings().focus.target;
  const searchFocusRequested = new URLSearchParams(location.search).get('focus') === '1';

  if (focusTarget === 'searchbar') {
    if (!searchFocusRequested) {
      location.replace('index.html?focus=1');
      return;
    }
    searchInput.focus({ preventScroll: true });
  } else if (document.activeElement === searchInput) {
    searchInput.blur();
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
    return "favicon.png";
  }
}
function applyInterface({ showClock, showSearch, showLinks, showLinkLabels }) {
  document.getElementById("clock").style.display = showClock ? "" : "none";
  document.querySelector(".search").style.display = showSearch ? "" : "none";
  document.getElementById("linkGrid").style.display = showLinks ? "" : "none";
  grid.classList.toggle("search-hidden", !showSearch);
  grid.classList.toggle("link-labels-hidden", !showLinkLabels);
  document.querySelectorAll(".link-label").forEach(lbl => {
    lbl.style.display = showLinkLabels ? "" : "none";
  });
}
function colorToRgba(value) {
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.hidden = true;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const parts = computed.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 1];
  return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] ?? 1 };
}
function rgbToHex(rgbValue) {
  const { r, g, b } = colorToRgba(rgbValue);
  const hex = (x) => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + hex(r) + hex(g) + hex(b);
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

function fontFamilyName(cssValue) {
  return String(cssValue).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
}

function ensureFontLoaded(cssValue) {
  const font = fontCatalog.find(item => item.css === cssValue);
  if (!font) return Promise.resolve(cssValue === defaults.clock.font);
  if (!font.importUrl) return Promise.resolve(true);
  if (fontLoadPromises.has(font.importUrl)) return fontLoadPromises.get(font.importUrl);

  const family = fontFamilyName(cssValue);
  const fontSpec = `400 1em "${family.replace(/"/g, '\\"')}"`;
  const fontReady = new Promise((resolve, reject) => {
    let link = Array.from(document.querySelectorAll('link[data-font-url]'))
      .find(item => item.dataset.fontUrl === font.importUrl);
    if (link?.sheet) {
      resolve();
      return;
    }
    const isNew = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font.importUrl;
      link.dataset.fontUrl = font.importUrl;
    }
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", () => reject(new Error(`Could not load ${family}`)), { once: true });
    if (isNew) document.head.appendChild(link);
  })
    .then(() => document.fonts.load(fontSpec))
    .then(() => true);

  let timeoutId;
  const timeout = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(false), 2500);
  });
  const promise = Promise.race([fontReady, timeout])
    .catch(error => {
      console.warn("Could not load the selected clock font:", error);
      return false;
    })
    .then(loaded => {
      clearTimeout(timeoutId);
      if (!loaded) fontLoadPromises.delete(font.importUrl);
      return loaded;
    });

  fontLoadPromises.set(font.importUrl, promise);
  return promise;
}

async function applyClockFont(cssValue) {
  const request = ++clockFontRequest;
  const loaded = await ensureFontLoaded(cssValue);
  if (loaded && request === clockFontRequest) elClock.style.fontFamily = cssValue;
}

async function loadFonts() {
  const sel = document.getElementById("clockFont");
  try {
    const fontsUrl = extensionApi?.runtime?.getURL?.("fonts.json") || "fonts.json";
    const response = await fetch(fontsUrl);
    if (!response.ok) throw new Error(`Font catalog returned ${response.status}`);
    fontCatalog = await response.json();
    if (!Array.isArray(fontCatalog)) throw new Error("Font catalog is invalid");

    const currentFont = getSettings().clock.font;
    sel.replaceChildren(...fontCatalog.map(font => {
      const option = document.createElement("option");
      option.value = font.css;
      option.textContent = font.label;
      return option;
    }));
    sel.value = currentFont;
    await ensureFontLoaded(currentFont);
  } catch (error) {
    console.warn("Could not load the optional font catalog:", error);
    const option = document.createElement("option");
    option.value = defaults.clock.font;
    option.textContent = "System Default";
    sel.replaceChildren(option);
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
  const stored = getSettings();

  // 1) Font & size
  const font = stored.clock.font;
  const size = stored.clock.size;
  applyClockFont(font);
  clock.style.fontSize = `${size}rem`;

  // Color comes from the active theme or Morph controls.
  clock.style.removeProperty("color");

  // 3) Spacing (margin)
  const margin = stored.clock.margin;
  clock.style.marginBottom = `${margin}px`;
}

// ==========================
// 🔍 SEARCH ENGINE SETUP
// ==========================

function applySearchEngine(engine) {
  if (!searchEngines[engine]) engine = defaults.more.searchEngine;
  const currentEngine = searchEngines[engine];

  searchForm.action = currentEngine.url;
  searchInput.name = currentEngine.queryParam || "q";
  searchInput.placeholder = `Search with ${currentEngine.name}...`;
  searchEngineIcon.src = currentEngine.icon;

  document.getElementById("searchEngine").value = engine;
}
// ==========================
// 🎨 THEME
// ==========================

function exportTheme() {
  const settings = isSettingsPanelOpen() ? settingsFromForm() : getSettings();
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
      const imported = sanitizeSettings(JSON.parse(e.target.result));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(imported));
      localStorage.removeItem(SEARCH_ENGINE_KEY);
      applyStoredSettings();
      alert("Theme imported. Choose Save & Close to keep it, or Cancel to restore the previous theme.");
    } catch (err) {
      console.error("Import failed:", err);
      alert("Invalid theme file.");
    }
  };
  reader.readAsText(file);
}

function onThemeChange(name) {
  clearMorphStyles();
  applyTheme(name, true);
  initMorphDefs();
  buildMorphControls({});
}

function applyTheme(id, useClockPreset = false) {
  const t = themes[id] || themes.default;
  const variableNames = { inputGlow: "input-glow", clockColor: "clockColor" };

  // 1) Apply all CSS vars for colors
  Object.entries(t.colors).forEach(([k, v]) => {
    document.documentElement.style.setProperty(`--${variableNames[k] || k}`, v);
  });

  // 2) Sync the inputs
  document.getElementById("themeSelector").value = id;
  Object.entries(t.colors).forEach(([k, v]) => {
    const inp = document.getElementById(k);
    if (inp) inp.value = v;
  });

  if (useClockPreset) {
    document.getElementById("clockFont").value = t.clock.font;
    document.getElementById("clockSize").value = t.clock.size;
    document.getElementById("clockSizeValue").textContent = t.clock.size;
    document.getElementById("clockMargin").value = t.clock.margin;
    document.getElementById("clockMarginValue").textContent = t.clock.margin;
    applyClockFont(t.clock.font);
    elClock.style.fontSize = `${t.clock.size}rem`;
    elClock.style.marginBottom = `${t.clock.margin}px`;

    const themeInterface = t.interface || defaults.interface;
    [
      [elToggleClock, themeInterface.showClock],
      [elToggleSearch, themeInterface.showSearch],
      [elToggleLinks, themeInterface.showLinks],
      [elToggleLinkLabels, themeInterface.showLinkLabels]
    ].forEach(([element, checked]) => {
      element.checked = checked;
    });
    applyInterface(themeInterface);
  }
}

// ==========================
// 🔗 LINK MANAGEMENT
// ==========================

function showLinkEditModal(index) {
  lastFocusedElement = document.activeElement;
  currentlyEditingIndex = index;
  const links = loadLinks();
  const link = links[index] || { url: "", title: "" };

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
  document.getElementById("editUrl").focus();
}
function saveLinkEdit() {
  const links = loadLinks();
  const url = document.getElementById("editUrl").value.trim();
  const title = document.getElementById("editTitle").value.trim();
  const faviconProvider = document.getElementById("faviconProvider").value;

  if (url) {
    const fullUrl = normalizeHttpUrl(url);
    if (!fullUrl) {
      alert("Please enter a valid http or https URL.");
      return;
    }
    links[currentlyEditingIndex] = {
      url: fullUrl,
      title: title || fullUrl,
      faviconProvider: faviconProvider
    };

    saveLinks(links);
    renderGrid();
  }

  closeLinkEditModal();
}
function removeCurrentLink() {
  const links = loadLinks();
  links[currentlyEditingIndex] = { url: "", title: "" };
  saveLinks(links);
  renderGrid();
  closeLinkEditModal();
}
function normalizeHttpUrl(value) {
  try {
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function normalizeLink(link) {
  if (!link || typeof link !== "object" || !link.url) return { url: "", title: "" };
  const url = normalizeHttpUrl(String(link.url));
  if (!url) return { url: "", title: "" };
  const providers = ["google", "duckduckgo", "direct"];
  return {
    url,
    title: String(link.title || url).slice(0, 200),
    faviconProvider: providers.includes(link.faviconProvider) ? link.faviconProvider : defaults.faviconProvider
  };
}
function loadLinks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, 200).map(normalizeLink) : [];
  } catch {
    return [];
  }
}
function saveLinks(links) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links.slice(0, 200).map(normalizeLink)));
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
      if (Array.isArray(links) && links.length <= 200) {
        saveLinks(links.map(normalizeLink));
        renderGrid();
        alert("Links imported. Choose Save & Close to keep them, or Cancel to restore the previous links.");
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
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    saved = {};
  }
  return sanitizeSettings(saved);
}
function sanitizeSettings(saved = {}) {
  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const bool = (value, fallback) => typeof value === "boolean" ? value : fallback;
  const legacyEngine = localStorage.getItem(SEARCH_ENGINE_KEY);
  const searchEngine = saved.more?.searchEngine || legacyEngine || defaults.more.searchEngine;
  const morph = saved.morph && typeof saved.morph === "object"
    ? Object.fromEntries(Object.entries(saved.morph)
      .filter(([key, value]) => key.length < 150 && typeof value === "string" && value.length < 150))
    : {};

  return {
    grid: {
      cols: Math.round(clamp(saved.grid?.cols, 1, 8, defaults.grid.cols)),
      rows: Math.round(clamp(saved.grid?.rows, 1, 5, defaults.grid.rows))
    },
    clock: {
      font: typeof saved.clock?.font === "string" && saved.clock.font.trim() && saved.clock.font.length < 150 ? saved.clock.font : defaults.clock.font,
      size: clamp(saved.clock?.size, 2, 10, defaults.clock.size),
      margin: Math.round(clamp(saved.clock?.margin, 0, 400, defaults.clock.margin))
    },
    interface: {
      showClock: bool(saved.interface?.showClock, defaults.interface.showClock),
      showSearch: bool(saved.interface?.showSearch, defaults.interface.showSearch),
      showLinks: bool(saved.interface?.showLinks, defaults.interface.showLinks),
      showLinkLabels: bool(saved.interface?.showLinkLabels, defaults.interface.showLinkLabels)
    },
    focus: {
      target: ["addressbar", "searchbar"].includes(saved.focus?.target) ? saved.focus.target : defaults.focus.target
    },
    theme: Object.hasOwn(themes, saved.theme) ? saved.theme : defaults.theme,
    morph,
    more: {
      middleClickBackground: bool(saved.more?.middleClickBackground, defaults.more.middleClickBackground),
      searchEngine: Object.hasOwn(searchEngines, searchEngine) ? searchEngine : defaults.more.searchEngine
    }
  };
}
function applyStoredSettings() {
  const settings = getSettings();
  clearMorphStyles();

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
    ["toggleLinkLabels", iface.showLinkLabels]
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

  applySearchEngine(settings.more.searchEngine);
  initMorphDefs();
  buildMorphControls();
  applyMorphSettings(settings);
}

function settingsFromForm() {
  return sanitizeSettings({
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
      showLinkLabels: document.getElementById("toggleLinkLabels").checked
    },
    focus: {
      target: document.getElementById("focusTarget").value
    },
    theme: document.getElementById("themeSelector").value,

    morph: collectMorphSettings(),
    more: {
      middleClickBackground: document.getElementById("middleClickBackground").checked,
      searchEngine: document.getElementById("searchEngine").value
    }
  });
}

async function saveSettings() {
  const settings = settingsFromForm();
  try {
    await commitPendingWallpaper();
  } catch (error) {
    console.error("Wallpaper could not be saved:", error);
    alert("The wallpaper could not be saved. Your other settings have not been changed.");
    return;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.removeItem(SEARCH_ENGINE_KEY);
  localStorage.removeItem('morphSettings');
  applyStoredSettings();
  settingsSessionSnapshot = null;
  await hideSettingsPanel();
  lastFocusedElement?.focus();
}

function loadSettingsToForm() {
  applyStoredSettings();
}

async function resetSettings() {
  if (!confirm("Reset settings to defaults? Your links and wallpaper will be kept.")) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
  localStorage.removeItem(SEARCH_ENGINE_KEY);
  localStorage.removeItem('morphSettings');
  pendingWallpaper = undefined;
  await restoreSavedWallpaper();
  applyStoredSettings();
  settingsSessionSnapshot = null;
  await hideSettingsPanel();
  lastFocusedElement?.focus();
  alert("Settings have been reset to defaults.");
}

async function resetAllSettings() {
  if (!confirm("Reset all settings, links, and the saved wallpaper? This cannot be undone.")) return;
  [SETTINGS_KEY, STORAGE_KEY, SEARCH_ENGINE_KEY, FAVICON_PROVIDER_KEY, 'morphSettings']
    .forEach(key => localStorage.removeItem(key));
  pendingWallpaper = null;
  try {
    await commitPendingWallpaper();
  } catch (error) {
    console.warn("Saved wallpaper could not be cleared:", error);
  }
  clearMorphStyles();
  applyStoredSettings();
  settingsSessionSnapshot = null;
  await hideSettingsPanel();
  lastFocusedElement?.focus();
  alert("All settings have been reset to defaults");
}

// ==========================
// 🧱 GRID LAYOUT
// ==========================

function applyGridLayout(cols, rows) {
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(72px, 96px))`;
  grid.style.gridTemplateRows = `repeat(${rows}, auto)`;
  TOTAL_TILES = cols * rows;
  renderGrid();
}
function renderGrid() {
  const savedLinks = loadLinks();
  const links = Array.from({ length: TOTAL_TILES }, (_, index) => savedLinks[index] || { url: "", title: "" });
  const frag = document.createDocumentFragment();

  links.forEach((item, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "link-wrapper";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("draggable", true);
    wrapper.setAttribute("role", item.url ? "link" : "button");
    wrapper.setAttribute("aria-label", item.url ? `${item.title || item.url}. Right-click to edit.` : "Add favorite link");

    const tile = document.createElement("div");
    tile.className = "link-tile";

    const label = document.createElement("div");
    label.className = "link-label";

    if (item.url) {
      const img = document.createElement("img");
      getFavicon(item.url, item.faviconProvider).then((faviconUrl) => {
        img.src = faviconUrl;
      });
      img.addEventListener("error", () => {
        img.src = "favicon.png";
      }, { once: true });

      img.alt = "";
      img.draggable = false;
      img.style.pointerEvents = "none";
      tile.appendChild(img);
      label.textContent = item.title || item.url;
      label.title = label.textContent;

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
          if (extensionApi?.tabs?.create) {
            extensionApi.tabs.create({ url: item.url, active: !openInBg });
          } else {
            window.open(item.url, "_blank");
          }
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

    } else {
      tile.textContent = "+";
      tile.style.fontSize = "1.5rem";
      tile.onclick = () => {
        showLinkEditModal(i);
      };
    }

    wrapper.addEventListener("contextmenu", event => {
      event.preventDefault();
      showLinkEditModal(i);
    });

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
        while (links.length < TOTAL_TILES) links.push({ url: "", title: "" });
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
      if (e.key === "Enter") {
        item.url ? window.open(item.url, "_self") : showLinkEditModal(i);
      } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
        e.preventDefault();
        showLinkEditModal(i);
      }
    });

    wrapper.appendChild(tile);
    wrapper.appendChild(label);
    frag.appendChild(wrapper);
  });

  grid.innerHTML = "";
  grid.appendChild(frag);

  applyInterface(getSettings().interface);
}

// ==========================
// 🖼️ WALLPAPER
// ==========================

async function loadSavedWallpaper(db) {
  const blob = await new Promise((resolve, reject) => {
    const request = db.transaction("settings", "readonly").objectStore("settings").get("wallpaperBlob");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  if (currentWallpaperURL) URL.revokeObjectURL(currentWallpaperURL);
  currentWallpaperURL = blob ? URL.createObjectURL(blob) : null;
  document.body.style.backgroundImage = currentWallpaperURL ? `url(${currentWallpaperURL})` : "";
  db.close();
}

async function restoreSavedWallpaper() {
  try {
    await loadSavedWallpaper(await initDB());
  } catch (error) {
    console.warn("Could not restore wallpaper:", error);
  }
}

async function commitPendingWallpaper() {
  if (pendingWallpaper === undefined) return;
  const wallpaper = pendingWallpaper;
  const db = await initDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("settings", "readwrite");
    const store = tx.objectStore("settings");
    wallpaper === null
      ? store.delete("wallpaperBlob")
      : store.put(wallpaper, "wallpaperBlob");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  if (wallpaper === null) {
    if (currentWallpaperURL) URL.revokeObjectURL(currentWallpaperURL);
    currentWallpaperURL = null;
    document.body.style.backgroundImage = "";
  }
  pendingWallpaper = undefined;
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
    searchInput.setAttribute("aria-expanded", "true");
  }
}
function hideSuggestions() {
  lastSuggestionQuery = "";
  document.getElementById("searchSuggestions").classList.remove("visible");
  searchInput.setAttribute("aria-expanded", "false");
}
async function fetchSuggestions(query) {
  if (query === lastSuggestionQuery) return;
  lastSuggestionQuery = query;

  try {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const [historyItems, topSites] = await Promise.all([
      extensionApi?.history?.search
        ? extensionApi.history.search({
          text: query,
          startTime: twoWeeksAgo,
          maxResults: 10
        })
        : Promise.resolve([]),
      extensionApi?.topSites?.get
        ? extensionApi.topSites.get()
        : Promise.resolve([])
    ]);

    const allItems = query
      ? [...historyItems, ...topSites]
      : topSites;

    // Keep navigation inside ordinary web URLs, even if history contains an
    // unusual or imported scheme.
    const validItems = allItems
      .map(item => ({ ...item, url: normalizeHttpUrl(String(item.url || "")) }))
      .filter(item => item.url);

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
    if (extensionApi?.topSites?.get) {
      extensionApi.topSites.get().then(sites => {
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
      const safeUrl = normalizeHttpUrl(String(item.url || ""));
      if (!safeUrl) return;
      const url = new URL(safeUrl);
      const normalizedUrl = `${url.hostname}${url.pathname}`.toLowerCase();

      if (!seen.has(normalizedUrl)) {
        seen.set(normalizedUrl, true);
        uniqueItems.push({ ...item, url: safeUrl });
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
    suggestion.setAttribute("role", "option");
    suggestion.setAttribute("aria-selected", "false");

    const icon = document.createElement("img");
    icon.className = "suggestion-icon";
    icon.src = `https://icons.duckduckgo.com/ip3/${new URL(item.url).hostname}.ico`;

    // Highlight matching text in the title
    const title = document.createElement("span");
    const titleText = item.title || item.url;
    appendHighlightedText(title, titleText, query);

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
function appendHighlightedText(container, text, query) {
  if (!query || !text) {
    container.textContent = text || "";
    return;
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;

  while (lastIndex < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, lastIndex);
    if (matchIndex === -1) break;
    container.append(document.createTextNode(text.slice(lastIndex, matchIndex)));
    const mark = document.createElement("span");
    mark.className = "highlight-match";
    mark.textContent = text.slice(matchIndex, matchIndex + query.length);
    container.append(mark);
    lastIndex = matchIndex + query.length;
  }
  container.append(document.createTextNode(text.slice(lastIndex)));
}
function handleSuggestionNavigation(e) {
  const suggestions = document.querySelectorAll(".suggestion-item");
  if (!suggestions.length) return;
  let currentIndex = -1;

  suggestions.forEach((item, index) => {
    if (item.classList.contains("selected")) {
      currentIndex = index;
      item.classList.remove("selected");
      item.setAttribute("aria-selected", "false");
    }
  });

  if (e.key === "ArrowDown") {
    currentIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % suggestions.length;
    suggestions[currentIndex].classList.add("selected");
    suggestions[currentIndex].setAttribute("aria-selected", "true");
    suggestions[currentIndex].scrollIntoView({ block: "nearest" });
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    currentIndex =
      currentIndex === -1 ? suggestions.length - 1 : (currentIndex - 1 + suggestions.length) % suggestions.length;
    suggestions[currentIndex].classList.add("selected");
    suggestions[currentIndex].setAttribute("aria-selected", "true");
    suggestions[currentIndex].scrollIntoView({ block: "nearest" });
    e.preventDefault();
  } else if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (currentIndex !== -1) {
      window.location.href = suggestions[currentIndex].dataset.url;
    } else if (query) {
      const engine = searchEngines[getSettings().more.searchEngine] || searchEngines.duckduckgo;
      const parameter = engine.queryParam || "q";
      window.location.href = `${engine.url}?${parameter}=${encodeURIComponent(query)}`;
    }
    e.preventDefault();
  }
}
