chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "EXECUTE_LOGIN") {
    const { cuit, clave } = request;
    const inputCuit = document.querySelector("#F1\\:username");
    if (inputCuit) {
      inputCuit.value = cuit;
      inputCuit.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#F1\\:btnSiguiente").click();
      
      // Esperar a que el campo de clave aparezca
      const interval = setInterval(() => {
        const inputClave = document.querySelector("#F1\\:password");
        if (inputClave) {
          clearInterval(interval);
          inputClave.value = clave;
          inputClave.dispatchEvent(new Event("input", { bubbles: true }));
          document.querySelector("#F1\\:btnIngresar").click();
        }
      }, 500);
      
      // Seguridad: Limpiar el intervalo después de 5 segundos por si falla
      setTimeout(() => clearInterval(interval), 5000);
    }
  }
});
