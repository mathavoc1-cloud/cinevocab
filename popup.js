const input = document.getElementById("word-input");
const saveBtn = document.getElementById("save-btn");
const status = document.getElementById("status");
const wordList = document.getElementById("word-list");

// On popup open: try to grab selected text from the active tab
browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  browser.tabs.sendMessage(tab.id, { type: "GET_SELECTION" })
    .then(res => { if (res?.text) input.value = res.text; })
    .catch(() => {}); // silently fail if content script isn't injected yet
});

// Load saved words
function loadWords() {
  browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
    wordList.innerHTML = "";
    if (frenchWords.length === 0) {
      wordList.innerHTML = '<li class="empty">No words saved yet.</li>';
      return;
    }
    // Show newest first
    [...frenchWords].reverse().forEach((word, i) => {
      const li = document.createElement("li");
      li.textContent = word;
      const btn = document.createElement("button");
      btn.className = "del-btn";
      btn.textContent = "×";
      btn.title = "Delete";
      btn.onclick = () => deleteWord(frenchWords.length - 1 - i, frenchWords);
      li.appendChild(btn);
      wordList.appendChild(li);
    });
  });
}

function deleteWord(index, currentWords) {
  currentWords.splice(index, 1);
  browser.storage.local.set({ frenchWords: currentWords }).then(loadWords);
}

saveBtn.addEventListener("click", () => {
  const word = input.value.trim();
  if (!word) return;
  browser.storage.local.get("frenchWords").then(({ frenchWords = [] }) => {
    if (frenchWords.includes(word)) {
      status.textContent = "Already saved!";
    } else {
      frenchWords.push(word);
      browser.storage.local.set({ frenchWords }).then(() => {
        status.textContent = `✓ Saved "${word}"`;
        input.value = "";
        loadWords();
      });
    }
    setTimeout(() => (status.textContent = ""), 2000);
  });
});

loadWords();