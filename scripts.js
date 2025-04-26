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
    target: "searchbar"
  },
  colors: {
    bg: "#202124",
    tile: "#303036",
    highlight: "#404145",
    text: "#ffffff",
    label: "#dddddd"
  },
  clock: {
    font: "system-ui",
    size: 5
  },
  grid: {
    cols: 8,
    rows: 2
  },
  faviconProvider: "duckduckgo"
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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
	setFocus();
  applyStoredSettings();
  applyClockStyles();
  renderGrid();
  loadSearchEngine();
	updateClock();
	setInterval(updateClock, 1000);
	setupEventListeners();
});

function setFocus() {
  const storedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaults;
  const focusTarget = storedSettings.focus?.target || defaults.focus.target;
  // If focusTarget is "searchbar" and we're NOT already redirected
	if (focusTarget === 'searchbar' && !location.search.includes('focus=1')) {
		location.href = 'index.html?focus=1';  // add a query to mark that we've redirected
		return; // important! exit early so nothing else runs yet
	}
}

function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("clock").textContent = timeString;
}

// Search Engine Functions
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

// Link Management
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

function exportColorSettings() {
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { colors: defaults.colors };
  const data = JSON.stringify(settings.colors, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "newtab-colors.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importColorSettings(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const colors = JSON.parse(e.target.result);
      if (typeof colors === "object" && colors !== null) {
        const currentSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        currentSettings.colors = colors;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
        applyStoredSettings();
        alert("Color settings imported successfully!");
      } else {
        alert("Invalid color settings format");
      }
    } catch (err) {
      alert("Error parsing color settings file");
    }
  };
  reader.readAsText(file);
}

async function getFavicon(link, providerOverride = null) {
  try {
    const url = new URL(link);
    const hostname = url.hostname;
    const provider = providerOverride || localStorage.getItem(FAVICON_PROVIDER_KEY) || defaults.faviconProvider;

    switch (provider) {
      case "google":
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
      case "duckduckgo":
        return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
      case "direct":
        return `${url.protocol}//${hostname}/favicon.ico`;
      default:
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    }
  } catch (e) {
    return "Error";
  }
}

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

function renderGrid() {
  const links = loadLinks();
  grid.innerHTML = "";

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
        if (e.button === 1) {
          // Middle mouse button
          window.open(item.url, "_blank");
          return;
        }

        // Only handle left click
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
    grid.appendChild(wrapper);
  });
}

// Settings Functions
function applyStoredSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);

    // Apply colors
    for (const [key, value] of Object.entries(parsed.colors)) {
      document.documentElement.style.setProperty(`--${key}`, value);
      document.getElementById(key).value = value;
    }

    // Apply grid
    document.getElementById("cols").value = parsed.grid.cols;
    document.getElementById("rows").value = parsed.grid.rows;
    applyGridLayout(parsed.grid.cols, parsed.grid.rows);
    if (parsed.clock) {
      document.getElementById("clockFont").value = parsed.clock.font;
      document.getElementById("clockSize").value = parsed.clock.size;
      document.getElementById("clockSizeValue").textContent = parsed.clock.size;
    }
    // Apply Focus target
    if (parsed.focus) {
      document.getElementById("focusTarget").value = parsed.focus.target;
    }
  }
  applyClockStyles();
}

function saveSettings() {
  const settings = {
    colors: {
      bg: document.getElementById("bg").value,
      tile: document.getElementById("tile").value,
      highlight: document.getElementById("highlight").value,
      text: document.getElementById("text").value,
      label: document.getElementById("label").value
    },
    grid: {
      cols: parseInt(document.getElementById("cols").value),
      rows: parseInt(document.getElementById("rows").value)
    },
    clock: {
      font: document.getElementById("clockFont").value,
      size: parseFloat(document.getElementById("clockSize").value)
    },
    focus: {
      target: document.getElementById("focusTarget").value
    }
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  // Apply colours
  for (const [key, value] of Object.entries(settings.colors)) {
    document.documentElement.style.setProperty(`--${key}`, value);
  }

  // Apply grid
  applyGridLayout(settings.grid.cols, settings.grid.rows);

  // Apply clock styles
  applyClockStyles();

  // Set Focus
  setFocus();

  // Close settings panel
  settingsPanel.hidden = true;
}

function loadSettingsToForm() {
  const styles = getComputedStyle(document.documentElement);
  const colorVars = ["bg", "tile", "highlight", "text", "label"];

  colorVars.forEach((key) => {
    let value = styles.getPropertyValue(`--${key}`).trim();
    if (!value || value === "#000000") {
      value = defaults.colors[key];
    }
    document.getElementById(key).value = value;
  });

  // Load grid settings
  const stored = localStorage.getItem(SETTINGS_KEY);
  const gridSettings = stored ? JSON.parse(stored).grid : defaults.grid;
  document.getElementById("cols").value = gridSettings.cols;
  document.getElementById("rows").value = gridSettings.rows;
}

function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY);

  // Reset colours
  for (const [key, value] of Object.entries(defaults.colors)) {
    document.documentElement.style.setProperty(`--${key}`, value);
    document.getElementById(key).value = value;
  }

  // Reset grid
  document.getElementById("cols").value = defaults.grid.cols;
  document.getElementById("rows").value = defaults.grid.rows;
  applyGridLayout(defaults.grid.cols, defaults.grid.rows);

  //Reset clock
  document.getElementById("clockFont").value = defaults.clock.font;
  document.getElementById("clockSize").value = defaults.clock.size;
  document.getElementById("clockSizeValue").textContent = defaults.clock.size;
  applyClockStyles();

  // Reset focus target
  document.getElementById("focusTarget").value = defaults.focus.target;

}

function resetAllSettings() {
  if (confirm("Are you sure you want to reset ALL settings and links?")) {
    localStorage.clear();
    resetSettings();
    renderGrid();
    loadSearchEngine();
    alert("All settings have been reset to defaults");
  }
}

function applyGridLayout(cols, rows) {
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
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

// Event Handlers
function setupEventListeners() {
  // Clock double-click for settings
  document.getElementById("clock").addEventListener("dblclick", () => {
    settingsPanel.hidden = !settingsPanel.hidden; // Toggle visibility
    if (!settingsPanel.hidden) {
      loadSettingsToForm(); // Make sure this function is called
      searchInput.blur(); // Remove focus from search
    }
  });

  document.getElementById("clockFont").addEventListener("change", (e) => {
    const preview = document.getElementById("clockPreview");
    preview.style.fontFamily = e.target.value;
  });

  document.getElementById("clockSize").addEventListener("input", (e) => {
    const size = e.target.value;
    document.getElementById("clockSizeValue").textContent = size;
    document.getElementById("clockPreview").style.fontSize = `${size}rem`;
  });

  // Search input events for suggestions
  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("focus", showSuggestions);
  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      // Only hide if we're not hovering a suggestion
      const hovered = document.querySelector(".suggestion-item:hover");
      if (!hovered) {
        hideSuggestions();
      }
    }, 150); // allow time for click
  });

  // Settings buttons
  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  document.getElementById("cancelSettings").addEventListener("click", () => {
    settingsPanel.hidden = true;
  });
  document.getElementById("resetSettings").addEventListener("click", resetSettings);
  document.getElementById("resetAll").addEventListener("click", resetAllSettings);

  // Link edit modal buttons
  document.getElementById("saveLinkEdit").addEventListener("click", saveLinkEdit);
  document.getElementById("cancelLinkEdit").addEventListener("click", () => {
    linkEditModal.hidden = true;
    currentlyEditingIndex = null;
  });
  document.getElementById("removeLink").addEventListener("click", removeCurrentLink);

  // Tab switching
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button, .tab-content").forEach((el) => {
        el.classList.remove("active");
      });
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });

  // Number input buttons
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

  // Grid size changes
  document.getElementById("cols").addEventListener("change", (e) => {
    applyGridLayout(parseInt(e.target.value), parseInt(document.getElementById("rows").value));
  });
  document.getElementById("rows").addEventListener("change", (e) => {
    applyGridLayout(parseInt(document.getElementById("cols").value), parseInt(e.target.value));
  });

  // Search engine change
  document.getElementById("searchEngine").addEventListener("change", (e) => {
    saveSearchEngine(e.target.value);
  });

  // Link import/export
  document.getElementById("exportLinks").addEventListener("click", exportLinks);
  document.getElementById("importLinks").addEventListener("click", () => {
    document.getElementById("importLinksFile").click();
  });
  document.getElementById("importLinksFile").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      importLinks(e.target.files[0]);
      e.target.value = ""; // Reset file input
    }
  });

  // Colour import/export

  document.getElementById("exportColors").addEventListener("click", exportColorSettings);
  document.getElementById("importColors").addEventListener("click", () => {
    document.getElementById("importColorsFile").click();
  });
  document.getElementById("importColorsFile").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      importColorSettings(e.target.files[0]);
      e.target.value = ""; // Reset file input
    }
  });

  // Arrow key navigation
  window.addEventListener("keydown", (e) => {
    const suggestionsVisible = document.getElementById("searchSuggestions").classList.contains("visible");
    // Handle Escape key globally
    if (e.key === "Escape") {
      if (suggestionsVisible) {
        hideSuggestions();
        searchInput.focus();
      }
      return; // Don't prevent default to allow other Escape key functionality
    }

    // If suggestions are visible and we're pressing up/down/enter arrows, handle suggestion navigation
    if (suggestionsVisible && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      handleSuggestionNavigation(e);
      e.preventDefault(); // Prevent default to avoid tile navigation
      return;
    }

    // If suggestions are visible and we're pressing left/right arrows, ignore
    if (suggestionsVisible && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      return;
    }

    // Original tile navigation for other cases
    const cols = parseInt(document.getElementById("cols").value) || 8;
    const rows = parseInt(document.getElementById("rows").value) || 2;
    const x = focusedTileIndex % cols;
    const y = Math.floor(focusedTileIndex / cols);

    let newX = x,
      newY = y;
    switch (e.key) {
      case "ArrowLeft":
        newX = x - 1;
        break;
      case "ArrowRight":
        newX = x + 1;
        break;
      case "ArrowUp":
        newY = y - 1;
        break;
      case "ArrowDown":
        newY = y + 1;
        break;
      default:
        return;
    }

    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
      focusedTileIndex = newY * cols + newX;
      allowFocusRestore = true;
      renderGrid();
    }
  });
}

async function handleSearchInput(e) {
  const query = e.target.value.trim();

  clearTimeout(suggestionTimeout);
  suggestionTimeout = setTimeout(() => {
    fetchSuggestions(query);
  }, 50);
}

function showSuggestions() {
  const suggestions = document.getElementById("searchSuggestions");
  if (searchInput.value.trim() && suggestions.children.length > 0) {
    suggestions.classList.add("visible");
  }
}

function hideSuggestions() {
  document.getElementById("searchSuggestions").classList.remove("visible");
}

async function fetchSuggestions(query) {
  if (query === lastSuggestionQuery) return;
  lastSuggestionQuery = query;

  try {
    // Get both history and top sites
    const [historyItems, topSites] = await Promise.all([
      chrome.history? chrome.history.search({
            text: query,
            maxResults: 5
          })
        : Promise.resolve([]),
      chrome.topSites ? chrome.topSites.get() : Promise.resolve([])
    ]);

    // Combine results - show top sites only for empty/short queries
    let allItems = [...topSites, ...historyItems];

    // Filter out invalid URLs and deduplicate
    const validItems = allItems.filter((item) => {
      try {
        new URL(item.url);
        return true;
      } catch {
        return false;
      }
    });

    const uniqueItems = validItems.filter((item, index, self) => index === self.findIndex((t) => t.url === item.url));

    // Sort by relevance - exact matches first, then partial matches
    uniqueItems.sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      const q = query.toLowerCase();

      // Exact match at start of title
      if (aTitle.startsWith(q) && !bTitle.startsWith(q)) return -1;
      if (!aTitle.startsWith(q) && bTitle.startsWith(q)) return 1;

      // Exact match anywhere in title
      if (aTitle.includes(q) && !bTitle.includes(q)) return -1;
      if (!aTitle.includes(q) && bTitle.includes(q)) return 1;

      // Otherwise sort by most visited (for top sites) or most recent (for history)
      return 0;
    });

    displaySuggestions(uniqueItems.slice(0, 6)); // Show top 6 results
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    // Fallback to just top sites if there's an error
    if (chrome.topSites) {
      chrome.topSites.get().then((sites) => {
        displaySuggestions(sites.slice(0, 6));
      });
    }
  }
}

function displaySuggestions(items) {
  const container = document.getElementById("searchSuggestions");
  container.innerHTML = "";
  const query = searchInput.value.trim().toLowerCase();

  // Deduplicate items (using the improved method from earlier)
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
    icon.src = `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}`;

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

// Helper function to highlight matching letters
function highlightMatches(text, query) {
  if (!query || !text) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let result = "";
  let lastIndex = 0;

  // Find all occurrences of the query in the text
  for (let i = 0; i < text.length; ) {
    const matchIndex = lowerText.indexOf(lowerQuery, i);
    if (matchIndex === -1) break;

    // Add non-matching part before the match
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

function applyClockStyles() {
  const clock = document.getElementById("clock");
  const stored = localStorage.getItem(SETTINGS_KEY);
  let font = defaults.clock.font;
  let size = defaults.clock.size;

  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.clock) {
      font = parsed.clock.font;
      size = parsed.clock.size;
    }
  }

  clock.style.fontFamily = font;
  clock.style.fontSize = `${size}rem`;

  // Update preview if it exists (in settings panel)
  const preview = document.getElementById("clockPreview");
  if (preview) {
    preview.style.fontFamily = font;
    preview.style.fontSize = `${size}rem`;
  }
}
