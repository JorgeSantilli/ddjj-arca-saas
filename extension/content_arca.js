(async function executeAutoLogin() {
  const { pendingLogin } = await chrome.storage.local.get("pendingLogin");
  
  if (!pendingLogin) return; // No hay un proceso de login pendiente

  const { cuit, clave } = pendingLogin;
  
  // Función para disparar eventos necesarios para AFIP
  const triggerEvents = (element) => {
    ["input", "change", "blur"].forEach(type => {
      element.dispatchEvent(new Event(type, { bubbles: true }));
    });
  };

  // Paso 1: Ingresar CUIT (si está visible)
  const inputCuit = document.querySelector("#F1\\:username");
  const btnSiguiente = document.querySelector("#F1\\:btnSiguiente");
  
  if (inputCuit && btnSiguiente) {
    inputCuit.value = cuit;
    triggerEvents(inputCuit);
    
    // Pequeño delay para asegurar que el evento se procesó antes del click
    setTimeout(() => btnSiguiente.click(), 200);
    return;
  }

  // Paso 2: Ingresar Clave (si está visible)
  // El script se ejecutará de nuevo después del click en "Siguiente" debido a la recarga
  const inputClave = document.querySelector("#F1\\:password");
  const btnIngresar = document.querySelector("#F1\\:btnIngresar");

  if (inputClave && btnIngresar) {
    inputClave.value = clave;
    triggerEvents(inputClave);
    
    // Limpiar storage para seguridad antes de clickear
    await chrome.storage.local.remove("pendingLogin");
    
    setTimeout(() => btnIngresar.click(), 300);
  }
})();
