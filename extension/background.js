chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "istudy-capture",
    title: "Send to iStudy AI",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "istudy-capture" && info.selectionText) {
    chrome.storage.local.set({ capturedText: info.selectionText }, () => {
      chrome.action.openPopup();
    });
  }
});