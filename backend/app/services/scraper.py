import os
import time
import random
import shutil
import logging
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger("scraper")


class ARCAScraper:
    """
    Automatiza el flujo ARCA:
    1. Login en auth.afip.gob.ar
    2. Navegar a "Presentacion de DDJJ y Pagos" (SETI)
    3. Aceptar juramento
    4. Ir a Consulta (sidebar)
    5. Seleccionar "Cuit del Contribuyente" (por label, NO por posicion)
    6. Seleccionar "Presentadas en los ultimos X meses" (por label, NO por posicion)
    7. Click "Ver consulta"
    8. Click "EXPORTAR" -> "CSV"
    9. Cerrar sesion

    IMPORTANTE: No se modifica "Presentada por el Usuario" ni ningun otro campo
    que no sea los dos indicados arriba.
    """

    ARCA_LOGIN_URL = "https://auth.afip.gob.ar/contribuyente_/login.xhtml"

    def __init__(self, headless=True, min_delay=1.5, max_delay=3.5, browser_timeout=30000, download_base_dir="descargas"):
        self.headless = headless
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.browser_timeout = browser_timeout
        self.download_base_dir = download_base_dir
        self.browser = None
        self.page = None
        self.context = None
        self.playwright = None
        self._download_dir = None

    def _delay(self, min_s=None, max_s=None):
        mn = min_s if min_s is not None else self.min_delay
        mx = max_s if max_s is not None else self.max_delay
        time.sleep(random.uniform(mn, mx))

    def _screenshot(self, nombre):
        try:
            screenshots_dir = os.path.join(self.download_base_dir, "..", "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)
            path = os.path.join(screenshots_dir, f"{nombre}_{datetime.now().strftime('%H%M%S')}.png")
            self.page.screenshot(path=path, full_page=True)
            logger.info(f"Screenshot: {path}")
        except Exception as e:
            logger.warning(f"Screenshot error: {e}")

    def _iniciar_browser(self, cuit_consulta):
        self._download_dir = os.path.join(self.download_base_dir, f"CUIT_{cuit_consulta}", "_temp")
        os.makedirs(self._download_dir, exist_ok=True)

        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"]
        )
        self.context = self.browser.new_context(
            viewport={"width": 1366, "height": 768},
            accept_downloads=True
        )
        self.page = self.context.new_page()
        self.page.set_default_timeout(self.browser_timeout)
        logger.info(f"Browser iniciado (headless={self.headless})")

    def _cerrar_browser(self):
        try:
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
            logger.info("Browser cerrado")
        except Exception as e:
            logger.warning(f"Error cerrando browser: {e}")

    # ========== PASO 1: LOGIN ==========

    def login(self, cuit, clave_fiscal):
        logger.info(f"[LOGIN] CUIT {cuit}...")
        self.page.goto(self.ARCA_LOGIN_URL, wait_until="networkidle")
        self._delay()

        campo_cuit = self.page.locator("#F1\\:username")
        campo_cuit.click()
        self._delay(0.3, 0.8)
        campo_cuit.fill(cuit)
        self._delay()

        self.page.locator("#F1\\:btnSiguiente").click()
        self._delay(1.5, 3.0)

        try:
            err = self.page.locator(".form-error, .error-message, .msg-error").first
            if err.is_visible(timeout=2000):
                msg = err.text_content()
                logger.error(f"[LOGIN] Error CUIT: {msg}")
                self._screenshot("login_error_cuit")
                return {"exito": False, "error": f"Error en CUIT: {msg}"}
        except Exception:
            pass

        try:
            self.page.wait_for_selector("#F1\\:password", state="visible", timeout=10000)
        except PlaywrightTimeout:
            self._screenshot("login_no_password")
            return {"exito": False, "error": "No aparecio el campo de contrasena."}

        campo_pass = self.page.locator("#F1\\:password")
        campo_pass.click()
        self._delay(0.3, 0.8)
        campo_pass.fill(clave_fiscal)
        self._delay()

        self.page.locator("#F1\\:btnIngresar").click()
        self._delay(2.0, 4.0)

        try:
            self.page.wait_for_selector("#buscadorInput", state="visible", timeout=15000)
            logger.info("[LOGIN] OK")
            return {"exito": True}
        except PlaywrightTimeout:
            try:
                err = self.page.locator(".form-error, .error-message, .msg-error, .alert-danger").first
                if err.is_visible(timeout=3000):
                    msg = err.text_content().strip()
                    self._screenshot("login_fallido")
                    return {"exito": False, "error": f"Login fallido: {msg}"}
            except Exception:
                pass
            self._screenshot("login_fallido")
            return {"exito": False, "error": "Login fallido: no se pudo acceder al portal."}

    # ========== PASO 2: NAVEGAR A SETI (DDJJ) ==========

    def _esperar_seti(self, timeout=15):
        deadline = time.time() + timeout
        while time.time() < deadline:
            for p in self.context.pages:
                if "seti" in p.url:
                    self.page = p
                    try:
                        p.wait_for_load_state("domcontentloaded", timeout=5000)
                    except Exception:
                        pass
                    logger.info(f"[NAV] En SETI: {p.url}")
                    return True
            time.sleep(1)
        return False

    def navegar_a_ddjj(self):
        logger.info("[NAV] Buscando servicio DDJJ...")
        self._screenshot("portal")

        # Estrategia 1: Acceso directo
        try:
            acceso = self.page.locator("text=Presentación de DDJJ y Pagos").first
            if acceso.is_visible(timeout=5000):
                logger.info("[NAV] Click acceso directo...")
                with self.context.expect_page(timeout=10000) as new_page_info:
                    acceso.click()
                new_page = new_page_info.value
                new_page.wait_for_load_state("domcontentloaded", timeout=15000)
                if "seti" in new_page.url:
                    self.page = new_page
                    logger.info(f"[NAV] En SETI (nueva pestana): {self.page.url}")
                    return {"exito": True}
        except Exception as e:
            logger.info(f"[NAV] Acceso directo no abrio pestana: {e}")
            if self._esperar_seti(timeout=5):
                return {"exito": True}

        # Estrategia 2: Buscador typeahead
        logger.info("[NAV] Probando buscador...")
        try:
            buscador = self.page.locator("#buscadorInput")
            if not buscador.is_visible(timeout=3000):
                buscador = self.page.locator("input[placeholder*='necesit'], input[placeholder*='Busc']").first
            buscador.click()
            self._delay(0.5, 1.0)
            buscador.fill("DDJJ")
            self._delay(2.0, 3.0)
            self._screenshot("buscador")

            resultado = self.page.locator("[id*='rbt-menu-item']").first
            if resultado.is_visible(timeout=5000):
                texto = resultado.text_content()[:80]
                logger.info(f"[NAV] Resultado: {texto}")
                if "resentaci" in texto or "DDJJ" in texto:
                    try:
                        with self.context.expect_page(timeout=10000) as new_page_info:
                            resultado.click()
                        new_page = new_page_info.value
                        new_page.wait_for_load_state("domcontentloaded", timeout=15000)
                        if "seti" in new_page.url:
                            self.page = new_page
                            logger.info(f"[NAV] En SETI via buscador: {self.page.url}")
                            return {"exito": True}
                    except Exception:
                        if self._esperar_seti(timeout=8):
                            return {"exito": True}
        except Exception as e:
            logger.warning(f"[NAV] Buscador fallo: {e}")

        # Estrategia 3: Scroll y buscar en servicios
        logger.info("[NAV] Buscando en servicios...")
        try:
            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            self._delay(1.0, 2.0)
            link = self.page.locator("a:has-text('DDJJ')").first
            if link.is_visible(timeout=5000):
                try:
                    with self.context.expect_page(timeout=10000) as new_page_info:
                        link.click()
                    new_page = new_page_info.value
                    new_page.wait_for_load_state("domcontentloaded", timeout=15000)
                    if "seti" in new_page.url:
                        self.page = new_page
                        return {"exito": True}
                except Exception:
                    if self._esperar_seti(timeout=8):
                        return {"exito": True}
        except Exception:
            pass

        self._screenshot("nav_fallido")
        return {"exito": False, "error": "No se pudo navegar a 'Presentacion de DDJJ y Pagos'."}

    # ========== PASO 3: JURAMENTO ==========

    def aceptar_juramento(self):
        logger.info("[JURAMENTO] Verificando...")
        self._delay(2.0, 3.0)

        try:
            self.page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass

        try:
            btn = self.page.locator("button:has-text('Aceptar')").first
            if btn.is_visible(timeout=5000):
                logger.info("[JURAMENTO] Aceptando...")
                btn.click()
                self._delay(2.0, 3.0)
                logger.info(f"[JURAMENTO] OK. URL: {self.page.url}")
        except Exception:
            logger.info("[JURAMENTO] No hay juramento, continuando...")

        self._screenshot("post_juramento")
        return {"exito": True}

    # ========== PASO 4: IR A CONSULTA ==========

    def ir_a_consulta(self):
        logger.info("[CONSULTA] Navegando a Consulta via sidebar...")
        self._delay(1.0, 2.0)

        try:
            sidebar_consulta = self.page.locator("a:has-text('Consulta')").first
            if sidebar_consulta.is_visible(timeout=5000):
                sidebar_consulta.click()
                self._delay(2.0, 3.0)
                logger.info(f"[CONSULTA] URL: {self.page.url}")
        except Exception:
            self.page.evaluate("window.location.hash = '#/presentacion/consulta'")
            self._delay(2.0, 3.0)

        try:
            self.page.wait_for_selector("[id*='multi-select']", timeout=15000)
            logger.info("[CONSULTA] Componentes cargados")
        except PlaywrightTimeout:
            logger.warning("[CONSULTA] Timeout esperando componentes")

        self._screenshot("consulta_page")
        return {"exito": True}

    # ========== PASO 5: SELECCIONAR CUIT DEL CONTRIBUYENTE ==========

    def seleccionar_cuit(self, cuit_consulta):
        logger.info(f"[CUIT] Seleccionando: {cuit_consulta}...")
        self._delay(1.0, 2.0)

        try:
            caret_id = self.page.evaluate("""() => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) {
                    const text = walker.currentNode.textContent.trim();
                    if (text.includes('Cuit del Contribuyente') || text.includes('CUIT del Contribuyente')) {
                        let el = walker.currentNode.parentElement;
                        for (let i = 0; i < 10 && el; i++) {
                            const caret = el.querySelector('[id*="multi-select"][id*="caret"]');
                            if (caret) return caret.id;
                            el = el.parentElement;
                        }
                    }
                }
                return null;
            }""")

            if not caret_id:
                self._screenshot("cuit_no_label")
                return {"exito": False, "error": "No se encontro el campo 'Cuit del Contribuyente'."}

            logger.info(f"[CUIT] Caret encontrado por label: {caret_id}")
            base_id = caret_id.replace("_caret", "")

            self.page.evaluate(f"document.getElementById('{caret_id}').click()")
            self._delay(0.8, 1.5)
            self._screenshot("cuit_dropdown")

            opciones_cuit = self.page.evaluate(f"""() => {{
                const opts = document.querySelectorAll('[id^="{base_id}-multiselect-option-"]');
                return Array.from(opts).map(o => ({{ id: o.id, text: o.textContent.trim() }}));
            }}""")
            logger.info(f"[CUIT] Opciones en dropdown: {opciones_cuit}")

            option_id = f"{base_id}-multiselect-option-{cuit_consulta}"
            encontrado = False

            ya_seleccionado = self.page.evaluate(f"""() => {{
                const opt = document.getElementById('{option_id}');
                if (!opt) return false;
                return opt.getAttribute('aria-selected') === 'true' ||
                       opt.classList.contains('is-selected') ||
                       opt.getAttribute('data-selected') === 'true';
            }}""")

            if ya_seleccionado:
                logger.info(f"[CUIT] {cuit_consulta} ya esta seleccionado")
                try:
                    self.page.locator("h2, h1, label").first.click()
                except Exception:
                    self.page.evaluate(f"document.getElementById('{caret_id}').click()")
                self._delay(0.5, 1.0)
                encontrado = True
            else:
                try:
                    opcion = self.page.locator(f"[id='{option_id}']")
                    if opcion.count() > 0:
                        opcion.first.click(force=True)
                        encontrado = True
                        self._delay(0.8, 1.5)
                except Exception as e:
                    logger.warning(f"[CUIT] Click force fallo: {e}")

            if not encontrado:
                opciones_locator = self.page.locator(f"li[id^='{base_id}-multiselect-option-']")
                count = opciones_locator.count()
                for i in range(count):
                    texto = opciones_locator.nth(i).text_content().strip()
                    if texto == cuit_consulta or texto.replace("-", "") == cuit_consulta:
                        opciones_locator.nth(i).click(force=True)
                        encontrado = True
                        self._delay(0.8, 1.5)
                        break

            if not encontrado:
                self._screenshot("cuit_not_found")
                opciones_texto = [o['text'] for o in opciones_cuit] if opciones_cuit else []
                return {"exito": False, "error": f"CUIT {cuit_consulta} no encontrado. Opciones: {opciones_texto}"}

            self._screenshot("cuit_ok")
            logger.info(f"[CUIT] Seleccion de {cuit_consulta} completada")
            return {"exito": True}

        except Exception as e:
            self._screenshot("cuit_error")
            return {"exito": False, "error": f"Error seleccionando CUIT: {str(e)}"}

    # ========== PASO 6: SELECCIONAR MESES ==========

    def seleccionar_meses(self, meses):
        logger.info(f"[MESES] Seleccionando: ultimos {meses} meses...")
        self._delay(0.5, 1.0)
        meses_str = str(meses)

        try:
            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            self._delay(0.5, 1.0)

            caret_id = self.page.evaluate("""() => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) {
                    if (walker.currentNode.textContent.trim() !== 'meses') continue;
                    const mesesEl = walker.currentNode.parentElement;
                    if (!mesesEl) continue;
                    const parent = mesesEl.parentElement;
                    if (!parent) continue;
                    let sibling = mesesEl.previousElementSibling;
                    while (sibling) {
                        const caret = sibling.querySelector('[id*="caret"]');
                        if (caret && caret.id.includes('multi-select')) return caret.id;
                        if (sibling.id && sibling.id.includes('multi-select')) {
                            const c = sibling.querySelector('[id*="caret"]');
                            if (c) return c.id;
                        }
                        sibling = sibling.previousElementSibling;
                    }
                    const caretInParent = parent.querySelector('[id*="multi-select"][id*="caret"]');
                    if (caretInParent) return caretInParent.id;
                }
                return null;
            }""")

            if not caret_id:
                self._screenshot("meses_no_label")
                return {"exito": False, "error": "No se encontro el campo 'Presentadas en los ultimos X meses'."}

            logger.info(f"[MESES] Caret encontrado: {caret_id}")
            base_id = caret_id.replace("_caret", "")

            self.page.evaluate(f"document.getElementById('{caret_id}').click()")
            self._delay(0.8, 1.5)
            self._screenshot("meses_dropdown")

            opciones_este = self.page.evaluate(f"""() => {{
                const opts = document.querySelectorAll('[id^="{base_id}-multiselect-option-"]');
                return Array.from(opts).map(o => ({{ id: o.id, text: o.textContent.trim() }}));
            }}""")
            logger.info(f"[MESES] Opciones: {opciones_este}")

            option_id = f"{base_id}-multiselect-option-{meses_str}"
            encontrado = False

            try:
                opcion = self.page.locator(f"[id='{option_id}']")
                if opcion.count() > 0:
                    opcion.first.click(force=True)
                    encontrado = True
                    self._delay(1.0, 1.5)
            except Exception as e:
                logger.warning(f"[MESES] Click force por ID fallo: {e}")

            if not encontrado:
                opciones_locator = self.page.locator(f"li[id^='{base_id}-multiselect-option-']")
                count = opciones_locator.count()
                for i in range(count):
                    texto = opciones_locator.nth(i).text_content().strip()
                    if texto == meses_str:
                        opciones_locator.nth(i).click(force=True)
                        encontrado = True
                        self._delay(1.0, 1.5)
                        break

            if not encontrado:
                self._screenshot("meses_not_found")
                return {"exito": False, "error": f"Valor '{meses_str}' no encontrado. Validos: 1, 2, 3, 6, 12."}

            self._screenshot("meses_ok")
            logger.info(f"[MESES] Seleccion de '{meses_str}' completada")
            return {"exito": True}

        except Exception as e:
            self._screenshot("meses_error")
            return {"exito": False, "error": f"Error seleccionando meses: {str(e)}"}

    # ========== PASO 7: VER CONSULTA ==========

    def ver_consulta(self):
        logger.info("[VER] Buscando boton 'Ver consulta'...")
        self._delay(0.5, 1.0)

        try:
            try:
                modal_btn = self.page.locator("button:has-text('Aceptar')").first
                if modal_btn.is_visible(timeout=1000):
                    modal_btn.click()
                    self._delay(1.0, 2.0)
            except Exception:
                pass

            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            self._delay(0.5, 1.0)

            btn = self.page.locator("button:has-text('Ver consulta')").first
            btn.scroll_into_view_if_needed()
            self._delay(0.3, 0.5)
            btn.click()
            self._delay(3.0, 5.0)

            try:
                modal_err = self.page.locator("div:has-text('Debe seleccionar')").first
                if modal_err.is_visible(timeout=2000):
                    msg = modal_err.text_content().strip()[:100]
                    logger.error(f"[VER] Modal de error: {msg}")
                    self._screenshot("ver_modal_error")
                    try:
                        self.page.locator("button:has-text('Aceptar')").first.click()
                    except Exception:
                        pass
                    return {"exito": False, "error": f"Error en consulta: {msg}"}
            except Exception:
                pass

            self.page.locator("button:has-text('EXPORTAR')").first.wait_for(
                state="visible", timeout=25000
            )
            self._screenshot("resultados")
            logger.info("[VER] Resultados cargados")
            return {"exito": True}

        except PlaywrightTimeout:
            self._screenshot("ver_timeout")
            try:
                no_results = self.page.locator("text=No se encontraron").first
                if no_results.is_visible(timeout=2000):
                    return {"exito": False, "error": "No se encontraron DDJJ para los filtros seleccionados."}
            except Exception:
                pass
            return {"exito": False, "error": "Timeout esperando resultados."}

    # ========== PASO 8: EXPORTAR CSV ==========

    def exportar_csv(self, cuit_consulta, meses, tenant_id=None):
        logger.info("[EXPORTAR] Exportando CSV...")
        self._delay(0.5, 1.0)

        try:
            btn_exportar = self.page.locator("button:has-text('EXPORTAR')").first
            if not btn_exportar.is_visible(timeout=5000):
                self._screenshot("no_exportar")
                return {"exito": False, "error": "No hay boton EXPORTAR."}

            btn_exportar.click()
            self._delay(0.8, 1.5)

            with self.page.expect_download(timeout=30000) as download_info:
                csv_link = self.page.locator("a:has-text('CSV'), span:has-text('CSV')").first
                csv_link.click()

            download = download_info.value
            logger.info(f"[EXPORTAR] Archivo: {download.suggested_filename}")

            temp_path = os.path.join(self._download_dir, download.suggested_filename or "ddjj.csv")
            download.save_as(temp_path)
            self._delay(0.5, 1.0)

            # Organize by tenant
            fecha = datetime.now().strftime("%Y-%m")
            if tenant_id:
                destino_dir = os.path.join(self.download_base_dir, f"tenant_{tenant_id}", f"CUIT_{cuit_consulta}", fecha)
            else:
                destino_dir = os.path.join(self.download_base_dir, f"CUIT_{cuit_consulta}", fecha)
            os.makedirs(destino_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nombre_archivo = f"ddjj_meses{meses}_{timestamp}.csv"
            destino = os.path.join(destino_dir, nombre_archivo)
            shutil.move(temp_path, destino)

            try:
                os.rmdir(self._download_dir)
            except OSError:
                pass

            ruta_relativa = os.path.relpath(destino, self.download_base_dir)
            logger.info(f"[EXPORTAR] Guardado: {ruta_relativa}")
            return {"exito": True, "archivo": ruta_relativa}

        except PlaywrightTimeout:
            self._screenshot("exportar_timeout")
            return {"exito": False, "error": "Timeout al exportar CSV."}
        except Exception as e:
            self._screenshot("exportar_error")
            return {"exito": False, "error": f"Error exportando CSV: {str(e)}"}

    # ========== PASO 9: CERRAR SESION ==========

    def cerrar_sesion(self):
        logger.info("[LOGOUT] Cerrando sesion...")
        try:
            dropdown = self.page.locator("div.dropdown span").last
            if dropdown.is_visible(timeout=3000):
                dropdown.click()
                self._delay(0.5, 1.0)
                btn_si = self.page.locator("button:has-text('Si')").first
                if btn_si.is_visible(timeout=3000):
                    btn_si.click()
                    self._delay(1.0, 2.0)
                    logger.info("[LOGOUT] OK")
                    return
        except Exception:
            pass

        try:
            self.page.goto("https://auth.afip.gob.ar/contribuyente_/logout.xhtml", timeout=10000)
            self._delay(1.0, 2.0)
            logger.info("[LOGOUT] OK (redirect)")
        except Exception as e:
            logger.warning(f"[LOGOUT] Error: {e}")

    # ========== FLUJO COMPLETO ==========

    def ejecutar_consulta(self, cuit_login, clave_fiscal, cuit_consulta, periodo, tenant_id=None):
        logger.info(f"{'='*60}")
        logger.info(f"INICIO: Login={cuit_login}, Consulta={cuit_consulta}, Meses={periodo}")
        logger.info(f"{'='*60}")

        try:
            self._iniciar_browser(cuit_consulta)

            r = self.login(cuit_login, clave_fiscal)
            if not r["exito"]:
                return r

            r = self.navegar_a_ddjj()
            if not r["exito"]:
                return r

            r = self.aceptar_juramento()
            if not r["exito"]:
                return r

            r = self.ir_a_consulta()
            if not r["exito"]:
                return r

            r = self.seleccionar_cuit(cuit_consulta)
            if not r["exito"]:
                return r

            r = self.seleccionar_meses(periodo)
            if not r["exito"]:
                return r

            r = self.ver_consulta()
            if not r["exito"]:
                self.cerrar_sesion()
                return r

            r = self.exportar_csv(cuit_consulta, periodo, tenant_id=tenant_id)
            self.cerrar_sesion()

            logger.info(f"FIN: {'EXITOSO' if r['exito'] else 'ERROR - ' + r.get('error', '')}")
            return r

        except Exception as e:
            logger.error(f"Error inesperado: {e}", exc_info=True)
            self._screenshot("error_inesperado")
            return {"exito": False, "error": f"Error inesperado: {str(e)}"}
        finally:
            self._cerrar_browser()
