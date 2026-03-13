chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "LOGIN_REQUEST") {
      const { cuit, clave } = request;
      
      // Guardar credenciales temporalmente
      chrome.storage.local.set({ pendingLogin: { cuit, clave } }, () => {
        chrome.tabs.create({ url: "https://auth.afip.gob.ar/contribuyente_/login.xhtml" });
      });
      
      sendResponse({ success: true });
    }
  }
);
