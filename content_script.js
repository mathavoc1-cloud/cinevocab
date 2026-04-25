// HBO Max subtitle selectors — update if HBO changes their DOM
const SUBTITLE_SELECTORS = [
  '[class*="subtitle"]',
  '[class*="Subtitle"]',
  '[class*="caption"]',
  '[class*="Caption"]',
  '[data-testid*="subtitle"]',
  '[data-testid*="caption"]',
  '.default-text-container',
  '[class*="PlayerSubtitles"]',
];

function getSubtitleText() {
  for (const selector of SUBTITLE_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.innerText.trim();
      if (text.length > 0) return text;
    }
  }
  return null;
}

// --- Build the floating UI ---
function buildUI() {
  // Floating button
  const btn = document.createElement("button");
  btn.id = "cinevoc-btn";
  btn.title = "Save subtitle (cinévoc)";
  btn.innerHTML = `🇫🇷`;

  const badge = document.createElement("div");
  badge.id = "cinevoc-badge";
  btn.appendChild(badge);

  // Toast notification
  const toast = document.createElement("div");
  toast.id = "cinevoc-toast";

  // Tray
  const tray = document.createElement("div");
  tray.id = "cinevoc-tray";
  tray.innerHTML = `
    <div id="cinevoc-tray-header">
      🇫🇷 cinévoc
      <button id="cinevoc-tray-close" title="Close">×</button>
    </div>
    <div id="cinevoc-tray-list"></div>
    <div id="cinevoc-tray-footer">
      <button id="cinevoc-export-btn">Export CSV</button>
      <button id="cinevoc-clear-btn">Clear all</button>
    </div>
  `;

  document.body.appendChild(toast);
  document.body.appendChild(tray);
  document.body.appendChild(btn);

  // --- State ---
  let trayOpen = false;
  let toastTimer = null;

  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.className = "show" + (isError ? " error" : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = ""; }, 2200);
  }

  function updateBadge(count) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }

  function renderTray(words) {
    const list = document.getElementById("cinevoc-tray-list");
    list.innerHTML = "";
    if (words.length === 0) {
      list.innerHTML = '<div class="cv-empty">No subtitles saved yet.</div>';
      return;
    }
    [...words].reverse().forEach((word, i) => {
      const item = document.createElement("div");
      item.className = "cv-item";
      item.innerHTML = `<span>${word}</span><button title="Delete">×</button>`;
      item.querySelector("button").onclick = () => {
        const idx = words.length - 1 - i;
        words.splice(idx, 1);
        browser.storage.local.set({ frenchWords: words }).then(() => {
          updateBadge(words.length);
          renderTray(words);
        });
      };
      list.appendChild(item);
    });
  }

  function loadAndRender() {
    browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
      updateBadge(frenchWords.length);
      renderTray(frenchWords);
    });
  }

  // --- Button click: save subtitle OR toggle tray ---
  btn.addEventListener("click", (e) => {
    // Long-press or second click opens tray — single click saves
    const subtitle = getSubtitleText();

    if (subtitle) {
      browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
        if (frenchWords.includes(subtitle)) {
          showToast("Already saved!", true);
        } else {
          frenchWords.push(subtitle);
          browser.storage.local.set({ frenchWords }).then(() => {
            updateBadge(frenchWords.length);
            renderTray(frenchWords);
            showToast(`✓ Saved: "${subtitle.substring(0, 40)}${subtitle.length > 40 ? "…" : ""}"`);
          });
        }
      });
    } else {
      // No subtitle found — toggle the tray instead
      trayOpen = !trayOpen;
      tray.classList.toggle("open", trayOpen);
      if (trayOpen) loadAndRender();
    }
  });

  // Right-click on button = toggle tray
  btn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    trayOpen = !trayOpen;
    tray.classList.toggle("open", trayOpen);
    if (trayOpen) loadAndRender();
  });

  document.getElementById("cinevoc-tray-close").onclick = () => {
    trayOpen = false;
    tray.classList.remove("open");
  };

  document.getElementById("cinevoc-clear-btn").onclick = () => {
    browser.storage.local.set({ frenchWords: [] }).then(() => {
      updateBadge(0);
      renderTray([]);
    });
  };

  document.getElementById("cinevoc-export-btn").onclick = () => {
    browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
      const csv = "Phrase\n" + frenchWords.map(w => `"${w.replace(/"/g, '""')}"`).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cinevoc.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  loadAndRender();
}

// Wait for body to be ready
if (document.body) {
  buildUI();
} else {
  document.addEventListener("DOMContentLoaded", buildUI);
}