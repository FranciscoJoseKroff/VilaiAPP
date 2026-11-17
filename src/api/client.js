import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { registrarFalloRed, registrarGuardadoCorrecto, registrarRespuestaApi } from '../diagnostico/registro';

export const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (Platform.OS === 'web' ? 'http://localhost:4000/api' : 'http://192.168.1.21:4000/api');

const memoria = { token: null };
const TOKEN_KEY = 'aldea_token';

export async function guardarToken(token) {
  memoria.token = token;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // localStorage puede fallar en modo privado; no bloquear la sesión.
    }
    return;
  }
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // La memoria conserva el token aunque SecureStore esté temporalmente no disponible.
  }
}

export async function leerTokenGuardado() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return memoria.token;
    }
  }
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    memoria.token = token;
    return token;
  } catch {
    return memoria.token;
  }
}

export async function apiFetch(path, { method = 'GET', token, body } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    registrarFalloRed(error?.message || 'No se pudo completar la conexión con la API.');
    throw error;
  }
  const datos = await respuesta.json().catch(() => ({}));
  const detalle = [datos.error, datos.detalle].filter(Boolean).join(': ');
  registrarRespuestaApi(respuesta.status, detalle);
  if (!respuesta.ok) {
    const error = new Error(`${datos.error || 'Error'} (${respuesta.status})`);
    error.status = respuesta.status;
    error.detalle = datos.detalle;
    throw error;
  }
  if ((method === 'PUT' && path === '/aldea') || (method === 'POST' && path === '/aldea/importar')) {
    registrarGuardadoCorrecto();
  }
  return datos;
}