chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "LOGIN_REQUEST") {
      const { cuit, clave } = request;
      chrome.tabs.create({ url: "https://auth.afip.gob.ar/contribuyente_/login.xhtml" }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.sendMessage(tabId, { type: "EXECUTE_LOGIN", cuit, clave });
          }
        });
      });
      sendResponse({ success: true });
    }
  }
);
