const MAX_ERRORES = 20;
const listeners = new Set();
let estado = Object.freeze({
  conexion: 'Sin comprobar',
  ultimoGuardado: null,
  errores: [],
});

function sanitizar(mensaje) {
  return String(mensaje || 'Error desconocido')
    .replace(/Bearer\s+[^\s"'`]+/gi, 'Bearer [oculto]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[token oculto]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[correo oculto]')
    .replace(/\b(token|authorization|autorización)\s*[:=]\s*[^,\s;]+/gi, '$1=[oculto]')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, '[valor omitido]')
    .replace(/https?:\/\/[^\s)]+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '[URL omitida]';
      }
    })
    .replace(/(?:'[^']*'|`[^`]*`|"[^"]*")(?= is not a valid enum value)/gi, "'[valor omitido]'")
    .slice(0, 500);
}

function publicar(cambios) {
  estado = Object.freeze({ ...estado, ...cambios });
  listeners.forEach((listener) => listener());
}

export function registrarError(origen, mensaje) {
  const error = Object.freeze({
    hora: new Date().toISOString(),
    origen: sanitizar(origen),
    mensaje: sanitizar(mensaje),
  });
  publicar({ errores: [...estado.errores, error].slice(-MAX_ERRORES) });
}

export function registrarRespuestaApi(status, detalle) {
  publicar({ conexion: 'Conectado' });
  if (status >= 400) {
    registrarError(`API ${status}`, detalle || 'La API rechazó la solicitud.');
  }
}

export function registrarFalloRed(mensaje) {
  publicar({ conexion: 'Sin conexión' });
  registrarError('Conexión', mensaje);
}

export function registrarGuardadoCorrecto(fecha = new Date().toISOString()) {
  const fechaGuardado = new Date(fecha);
  if (!Number.isFinite(fechaGuardado.getTime())) return;
  const timestamp = fechaGuardado.toISOString();
  publicar({ conexion: 'Conectado', ultimoGuardado: timestamp });
}

export function obtenerDiagnostico() {
  return estado;
}

export function suscribirDiagnostico(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function crearTextoDiagnostico({ versionApp, versionApi, snapshot }) {
  return JSON.stringify({
    aplicacion: versionApp,
    api: versionApi,
    conexion: snapshot.conexion,
    ultimoGuardado: snapshot.ultimoGuardado,
    errores: snapshot.errores,
  }, null, 2);
}

export function instalarCapturaErroresWeb() {
  // En React Native "window" existe (alias del objeto global) pero no tiene addEventListener.
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {};
  const onError = (event) => registrarError('JavaScript', event.message || 'Error no controlado');
  const onRejection = (event) => registrarError('Promesa', event.reason?.message || event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
