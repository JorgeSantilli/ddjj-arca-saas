chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "EXECUTE_LOGIN") {
    const { cuit, clave } = request;
    
    // Paso 1: Ingresar CUIT
    const inputCuit = document.querySelector("#F1\\:username");
    if (inputCuit) {
      inputCuit.value = cuit;
      inputCuit.dispatchEvent(new Event("input", { bubbles: true }));
      inputCuit.dispatchEvent(new Event("change", { bubbles: true }));
      
      const btnSiguiente = document.querySelector("#F1\\:btnSiguiente");
      if (btnSiguiente) btnSiguiente.click();
      
      // Paso 2: Esperar el campo de clave (hasta 10 segundos)
      let attempts = 0;
      const interval = setInterval(() => {
        const inputClave = document.querySelector("#F1\\:password");
        if (inputClave) {
          clearInterval(interval);
          
          // Pegar la clave
          inputClave.value = clave;
          
          // Disparar múltiples eventos para asegurar que la página detecte el texto
          ["input", "change", "blur"].forEach(type => {
            inputClave.dispatchEvent(new Event(type, { bubbles: true }));
          });
          
          // Pequeño delay para que se habilite el botón de ingresar
          setTimeout(() => {
            const btnIngresar = document.querySelector("#F1\\:btnIngresar");
            if (btnIngresar) btnIngresar.click();
          }, 300);
        }
        
        attempts++;
        if (attempts > 20) { // 10 segundos (20 * 500ms)
          clearInterval(interval);
          console.error("No se encontró el campo de clave fiscal");
        }
      }, 500);
    }
  }
});
