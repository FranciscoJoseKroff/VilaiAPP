import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export const SFX_CATALOG = {
  clic: require('../../assets/sounds/clic.mp3'),
  construir: require('../../assets/sounds/construir.mp3'),
  mejorar: require('../../assets/sounds/mejorar.mp3'),
  'investigacion completada': require('../../assets/sounds/investigacion-completada.mp3'),
  'aldeano llega': require('../../assets/sounds/aldeano-llega.mp3'),
  evento: require('../../assets/sounds/evento.mp3'),
  'edad nueva': require('../../assets/sounds/edad-nueva.mp3'),
  error: require('../../assets/sounds/error.mp3'),
};

const reproductores = new Map();
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
    for (const player of reproductores.values()) {
      try {
        player.seekTo(0);
        player.play();
      } catch (_) {}
    }
  }
}

export async function preloadSfx() {
  for (const [name, source] of Object.entries(SFX_CATALOG)) {
    if (reproductores.has(name)) continue;
    try {
      reproductores.set(name, createAudioPlayer(source));
    } catch (_) {
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
  } catch (_) {
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
