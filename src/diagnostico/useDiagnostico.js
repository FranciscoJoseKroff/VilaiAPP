import { useSyncExternalStore } from 'react';
import { obtenerDiagnostico, suscribirDiagnostico } from './registro';

export function useDiagnostico() {
  return useSyncExternalStore(suscribirDiagnostico, obtenerDiagnostico, obtenerDiagnostico);
}
