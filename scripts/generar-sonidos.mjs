// Genera los 8 efectos de sonido de Vilai como WAV (PCM 16 bits, mono, 22 050 Hz)
// sintetizándolos con ondas simples: no se descarga nada y no requieren atribución.
//   node scripts/generar-sonidos.mjs
// Es determinista: el ruido usa un generador con semilla fija, así que cada
// ejecución produce exactamente los mismos archivos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const salida = fileURLToPath(new URL('../assets/sounds/', import.meta.url));

// Notas usadas (Hz).
const N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };

let semilla = 12345;
const ruido = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return (semilla / 1073741824) - 1;
};

const ondas = {
  seno: (fase) => Math.sin(2 * Math.PI * fase),
  triangulo: (fase) => 1 - 4 * Math.abs((fase % 1) - 0.5),
  cuadrada: (fase) => ((fase % 1) < 0.5 ? 0.6 : -0.6),
};

// Una nota: frecuencia que puede deslizarse de f0 a f1, con ataque corto y caída exponencial.
function nota(buffer, { inicio = 0, dur, f0, f1 = f0, onda = 'seno', vol = 1, caida = 6, armonico = 0, conRuido = 0 }) {
  const desde = Math.floor(inicio * RATE);
  const largo = Math.floor(dur * RATE);
  const ataque = Math.floor(0.004 * RATE);
  let fase = 0;
  for (let i = 0; i < largo && desde + i < buffer.length; i += 1) {
    const t = i / largo;
    fase += (f0 + (f1 - f0) * t) / RATE;
    const env = Math.min(1, i / ataque) * Math.exp(-caida * t) * (1 - t ** 8);
    let v = ondas[onda](fase);
    if (armonico) v += armonico * Math.sin(2 * Math.PI * fase * 2.01);
    if (conRuido) v = v * (1 - conRuido) + ruido() * conRuido;
    buffer[desde + i] += v * env * vol;
  }
}

const SONIDOS = {
  clic: { dur: 0.06, notas: [{ dur: 0.05, f0: 1400, f1: 900, onda: 'triangulo', caida: 9 }] },
  construir: {
    dur: 0.36,
    notas: [0, 0.16].flatMap((inicio) => [
      { inicio, dur: 0.14, f0: 190, f1: 120, caida: 10, conRuido: 0.35 },
      { inicio, dur: 0.03, f0: 2400, onda: 'cuadrada', vol: 0.25, conRuido: 0.8, caida: 12 },
    ]),
  },
  mejorar: {
    dur: 0.42,
    notas: [N.C5, N.E5, N.G5].map((f0, i) => ({ inicio: i * 0.09, dur: 0.18, f0, onda: 'triangulo', caida: 5 })),
  },
  'investigacion-completada': {
    dur: 1.1,
    notas: [N.C5, N.E5, N.G5, N.C6].map((f0, i) => ({ inicio: i * 0.11, dur: 0.75, f0, armonico: 0.3, caida: 5, vol: 0.8 })),
  },
  'aldeano-llega': {
    dur: 0.65,
    notas: [{ dur: 0.35, f0: N.E5, armonico: 0.25, caida: 5 }, { inicio: 0.17, dur: 0.45, f0: N.A5, armonico: 0.25, caida: 5 }],
  },
  evento: {
    dur: 0.62,
    notas: [0, 0.3].map((inicio) => ({ inicio, dur: 0.26, f0: N.A4, f1: N.E4, onda: 'cuadrada', caida: 3, vol: 0.7 })),
  },
  'edad-nueva': {
    dur: 1.5,
    notas: [
      { dur: 0.25, f0: N.G4, onda: 'triangulo', caida: 3 },
      { inicio: 0.2, dur: 1.25, f0: N.C4, onda: 'triangulo', caida: 2.5 },
      { inicio: 0.2, dur: 1.25, f0: N.G4, onda: 'triangulo', caida: 2.5, vol: 0.8 },
      { inicio: 0.2, dur: 1.25, f0: N.C5, armonico: 0.2, caida: 2.5, vol: 0.8 },
      { inicio: 0.2, dur: 1.25, f0: N.E5, caida: 2.5, vol: 0.6 },
    ],
  },
  error: {
    dur: 0.32,
    notas: [{ dur: 0.13, f0: 330, onda: 'cuadrada', caida: 3 }, { inicio: 0.14, dur: 0.17, f0: 220, onda: 'cuadrada', caida: 3 }],
  },
};

function wav(muestras) {
  const datos = Buffer.alloc(muestras.length * 2);
  muestras.forEach((v, i) => datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const cabecera = Buffer.alloc(44);
  cabecera.write('RIFF', 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write('WAVEfmt ', 8);
  cabecera.writeUInt32LE(16, 16); // tamaño del bloque fmt
  cabecera.writeUInt16LE(1, 20); // PCM
  cabecera.writeUInt16LE(1, 22); // mono
  cabecera.writeUInt32LE(RATE, 24);
  cabecera.writeUInt32LE(RATE * 2, 28); // bytes por segundo
  cabecera.writeUInt16LE(2, 32); // bytes por muestra
  cabecera.writeUInt16LE(16, 34); // bits por muestra
  cabecera.write('data', 36);
  cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
}

fs.mkdirSync(salida, { recursive: true });
for (const [nombre, { dur, notas }] of Object.entries(SONIDOS)) {
  const muestras = new Float32Array(Math.floor(dur * RATE));
  notas.forEach((n) => nota(muestras, n));
  const pico = muestras.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const normalizadas = Array.from(muestras, (v) => (v / pico) * 0.8); // todos al mismo volumen máximo
  const archivo = path.join(salida, `${nombre}.wav`);
  fs.writeFileSync(archivo, wav(normalizadas));
  console.log(`✔ ${path.relative(process.cwd(), archivo)} (${dur} s)`);
}
