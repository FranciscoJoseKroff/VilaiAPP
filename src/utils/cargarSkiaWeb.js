// iOS y Android: Skia es nativo y no necesita cargar nada. Metro usa cargarSkiaWeb.web.js en el navegador;
// así canvaskit-wasm (que pide el módulo "fs" de Node) nunca entra en el bundle del teléfono.
export function cargarSkiaWeb() {
  return Promise.resolve();
}
