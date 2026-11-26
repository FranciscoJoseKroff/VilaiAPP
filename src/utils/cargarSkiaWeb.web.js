import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web/LoadSkiaWeb';

// Solo web: descarga canvaskit.wasm desde /public antes de dibujar la escena.
export function cargarSkiaWeb() {
  return LoadSkiaWeb({
    locateFile: (archivo) => archivo.endsWith('.wasm') ? '/canvaskit.wasm' : archivo,
  });
}
