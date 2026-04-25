// Runs in the Netflix/HBO page — listens for the popup asking for selected text
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SELECTION") {
    const selected = window.getSelection().toString().trim();
    sendResponse({ text: selected });
  }
});