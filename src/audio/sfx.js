import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export const SFX_CATALOG = {
  clic: require('../../assets/sounds/clic.wav'),
  construir: require('../../assets/sounds/construir.wav'),
  mejorar: require('../../assets/sounds/mejorar.wav'),
  'investigacion completada': require('../../assets/sounds/investigacion-completada.wav'),
  'aldeano llega': require('../../assets/sounds/aldeano-llega.wav'),
  evento: require('../../assets/sounds/evento.wav'),
  'edad nueva': require('../../assets/sounds/edad-nueva.wav'),
  error: require('../../assets/sounds/error.wav'),
};

const reproductores = new Map();

// Solo en desarrollo: un sonido que no carga no debe pasar desapercibido.
const avisar = (accion, nombre, error) => {
  if (__DEV__) console.warn(`[sfx] No se pudo ${accion} "${nombre}": ${error?.message || error}`);
};
let enabled = true;
let volume = 0.35;
let activeSounds = 0;

export async function configureAudioMode() {
  if (Platform.OS === 'web') return;
  await setAudioModeAsync({
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  });
}

export function configureSfx({ enabled: nextEnabled = enabled, volume: nextVolume = volume } = {}) {
  enabled = Boolean(nextEnabled);
  volume = Math.max(0, Math.min(1, Number(nextVolume) || 0));
  for (const player of reproductores.values()) {
    player.volume = volume;
  }
}

export function unlockSfx() {
  if (!enabled) return;
  if (Platform.OS === 'web') {
    // El navegador solo habilita el audio tras un gesto del usuario. Se "despierta"
    // cada reproductor en silencio y se pausa, para no sonar los 8 a la vez.
    for (const player of reproductores.values()) {
      try {
        player.volume = 0;
        player.play();
        player.pause();
        player.seekTo(0);
        player.volume = volume;
      } catch (_) {}
    }
  }
}

export async function preloadSfx() {
  for (const [name, source] of Object.entries(SFX_CATALOG)) {
    if (reproductores.has(name)) continue;
    try {
      reproductores.set(name, createAudioPlayer(source));
    } catch (error) {
      avisar('cargar', name, error);
      reproductores.delete(name);
    }
  }
}

export async function playSfx(name) {
  if (!enabled || !SFX_CATALOG[name] || activeSounds >= 3) return;
  try {
    let player = reproductores.get(name);
    if (!player) player = createAudioPlayer(SFX_CATALOG[name]);
    reproductores.set(name, player);
    player.volume = volume;
    player.seekTo(0);
    activeSounds += 1;
    await player.play();
    setTimeout(() => {
      activeSounds = Math.max(0, activeSounds - 1);
    }, 220);
  } catch (error) {
    avisar('reproducir', name, error);
    activeSounds = Math.max(0, activeSounds - 1);
  }
}

export function releaseSfx() {
  for (const player of reproductores.values()) {
    try { player.remove(); } catch (_) {}
  }
  reproductores.clear();
  activeSounds = 0;
}
