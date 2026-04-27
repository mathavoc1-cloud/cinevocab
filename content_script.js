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

function isVideoPlaying() {
  const videos = document.querySelectorAll("video");
  for (const v of videos) {
    if (!v.paused && !v.ended && v.readyState > 2) return true;
  }
  return false;
}

let uiBuilt = false;

function buildUI() {
  if (document.getElementById("cinevoc-btn")) return; // already exists
  uiBuilt = true;

  const btn = document.createElement("button");
  btn.id = "cinevoc-btn";
  btn.title = "Save subtitle (cinévoc)";
  btn.innerHTML = `🇫🇷`;

  const badge = document.createElement("div");
  badge.id = "cinevoc-badge";
  btn.appendChild(badge);

  const toast = document.createElement("div");
  toast.id = "cinevoc-toast";

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

  btn.addEventListener("click", () => {
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
      trayOpen = !trayOpen;
      tray.classList.toggle("open", trayOpen);
      if (trayOpen) loadAndRender();
    }
  });

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

  // Handle fullscreen
  document.addEventListener("fullscreenchange", () => {
    const btnEl = document.getElementById("cinevoc-btn");
    const toastEl = document.getElementById("cinevoc-toast");
    const trayEl = document.getElementById("cinevoc-tray");
    if (!btnEl) return;
    const fullscreenEl = document.fullscreenElement;
    if (fullscreenEl) {
      fullscreenEl.appendChild(btnEl);
      fullscreenEl.appendChild(toastEl);
      fullscreenEl.appendChild(trayEl);
    } else {
      document.body.appendChild(btnEl);
      document.body.appendChild(toastEl);
      document.body.appendChild(trayEl);
    }
  });

  loadAndRender();
}

function removeUI() {
  ["cinevoc-btn", "cinevoc-toast", "cinevoc-tray"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  uiBuilt = false;
}

// Core logic: watch for video play/pause/end
function watchForVideo() {
  const videos = document.querySelectorAll("video");
  videos.forEach(v => {
    v.addEventListener("playing", () => buildUI());
    v.addEventListener("pause", () => removeUI());
    v.addEventListener("ended", () => removeUI());
  });
}

// Watch for new video elements being added to the DOM
new MutationObserver(() => {
  watchForVideo();

  // Also handle URL changes (single-page apps like HBO Max)
  if (!isVideoPlaying() && document.getElementById("cinevoc-btn")) {
    removeUI();
  }
}).observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

// Initial check
watchForVideo();