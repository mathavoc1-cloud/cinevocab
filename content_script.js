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

function removeUI() {
  ["cinevocab-btn", "cinevocab-toast", "cinevocab-tray"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function buildUI() {
  if (document.getElementById("cinevocab-btn")) return;

  // Button
  const btn = document.createElement("button");
  btn.id = "cinevocab-btn";
  btn.title = "Save subtitle (cinevocab)";
  btn.innerHTML = `🇫🇷`;

  const badge = document.createElement("div");
  badge.id = "cinevocab-badge";
  btn.appendChild(badge);

  // Toast
  const toast = document.createElement("div");
  toast.id = "cinevocab-toast";

  // Tray
  const tray = document.createElement("div");
  tray.id = "cinevocab-tray";

  const trayHeader = document.createElement("div");
  trayHeader.id = "cinevocab-tray-header";
  trayHeader.innerHTML = `🇫🇷 cinevocab`;

  const closeBtn = document.createElement("button");
  closeBtn.id = "cinevocab-tray-close";
  closeBtn.title = "Close";
  closeBtn.textContent = "×";
  trayHeader.appendChild(closeBtn);

  const trayList = document.createElement("div");
  trayList.id = "cinevocab-tray-list";

  const trayFooter = document.createElement("div");
  trayFooter.id = "cinevocab-tray-footer";

  const exportBtn = document.createElement("button");
  exportBtn.id = "cinevocab-export-btn";
  exportBtn.textContent = "Export CSV";

  const clearBtn = document.createElement("button");
  clearBtn.id = "cinevocab-clear-btn";
  clearBtn.textContent = "Clear all";

  trayFooter.appendChild(exportBtn);
  trayFooter.appendChild(clearBtn);
  tray.appendChild(trayHeader);
  tray.appendChild(trayList);
  tray.appendChild(trayFooter);

  // Add to DOM
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
    trayList.innerHTML = "";
    if (words.length === 0) {
      trayList.innerHTML = '<div class="cv-empty">No subtitles saved yet.</div>';
      return;
    }
    [...words].reverse().forEach((word, i) => {
      const item = document.createElement("div");
      item.className = "cv-item";
      const span = document.createElement("span");
      span.textContent = word;
      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.title = "Delete";
      delBtn.onclick = () => {
        const idx = words.length - 1 - i;
        words.splice(idx, 1);
        browser.storage.local.set({ frenchWords: words }).then(() => {
          updateBadge(words.length);
          renderTray(words);
        });
      };
      item.appendChild(span);
      item.appendChild(delBtn);
      trayList.appendChild(item);
    });
  }

  function loadAndRender() {
    browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
      updateBadge(frenchWords.length);
      renderTray(frenchWords);
    });
  }

  btn.addEventListener("click", () => {
  // Wait 800ms for controls to fade, then grab subtitle
  setTimeout(() => {
    const subtitle = getSubtitleText();
    if (subtitle && subtitle.length > 1 && subtitle.length < 300) {
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
  }, 800);
});

  btn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    trayOpen = !trayOpen;
    tray.classList.toggle("open", trayOpen);
    if (trayOpen) loadAndRender();
  });

  closeBtn.onclick = () => {
    trayOpen = false;
    tray.classList.remove("open");
  };

  clearBtn.onclick = () => {
    browser.storage.local.set({ frenchWords: [] }).then(() => {
      updateBadge(0);
      renderTray([]);
    });
  };

  exportBtn.onclick = () => {
    browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
      const csv = "Phrase\n" + frenchWords.map(w => `"${w.replace(/"/g, '""')}"`).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cinevocab.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Fullscreen support
  document.addEventListener("fullscreenchange", () => {
    const fullscreenEl = document.fullscreenElement;
    if (fullscreenEl) {
      fullscreenEl.appendChild(btn);
      fullscreenEl.appendChild(toast);
      fullscreenEl.appendChild(tray);
    } else {
      document.body.appendChild(btn);
      document.body.appendChild(toast);
      document.body.appendChild(tray);
    }
  });

  loadAndRender();
  console.log("cinevocab: UI built successfully");
}

// Watch for video play events
document.addEventListener("play", (e) => {
  if (e.target.tagName === "VIDEO") {
    console.log("cinevocab: video playing, building UI");
    buildUI();
  }
}, true);

document.addEventListener("pause", (e) => {
  if (e.target.tagName === "VIDEO") {
    if (!isVideoPlaying()) {
      console.log("cinevocab: video paused, removing UI");
      removeUI();
    }
  }
}, true);

document.addEventListener("ended", (e) => {
  if (e.target.tagName === "VIDEO") {
    console.log("cinevocab: video ended, removing UI");
    removeUI();
  }
}, true);

// Also update overlay.css IDs from cinevoc to cinevocab!

console.log("cinevocab: content script loaded");

function checkVideoState() {
  const videos = document.querySelectorAll("video");
  let fullscreenOrLarge = false;

  videos.forEach(v => {
    const isLarge = v.offsetWidth > 400;
    const isPlaying = !v.paused && !v.ended && v.readyState > 2;
    if (isLarge && isPlaying) fullscreenOrLarge = true;
  });

  if (fullscreenOrLarge) {
    buildUI();
  } else {
    removeUI();
  }
}

setInterval(checkVideoState, 300);

