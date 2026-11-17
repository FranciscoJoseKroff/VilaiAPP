const APODOS_PROHIBIDOS = [
  'cabrón',
  'coño',
  'idiota',
  'imbécil',
  'joder',
  'mierda',
  'pendejo',
  'pendeja',
  'puta',
  'puto',
  'verga',
];

function normalizarApodo(apodo) {
  return String(apodo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function validarApodo(apodo) {
  if (typeof apodo !== 'string') {
    return { valido: false, error: 'El apodo debe ser texto.' };
  }
  const limpio = apodo.trim();
  const longitud = [...limpio].length;
  if (longitud < 3 || longitud > 16) {
    return { valido: false, error: 'El apodo debe tener entre 3 y 16 caracteres.' };
  }
  if (!/^[\p{L}0-9 _]+$/u.test(limpio)) {
    return { valido: false, error: 'Usa solo letras, números, espacios y guion bajo.' };
  }
  const palabras = normalizarApodo(limpio).split(/[^a-z0-9]+/).filter(Boolean);
  if (palabras.some((palabra) => APODOS_PROHIBIDOS.some((prohibido) => (
    normalizarApodo(prohibido) === palabra
  )))) {
    return { valido: false, error: 'Ese apodo no está permitido.' };
  }
  return { valido: true, apodo: limpio };
}

module.exports = { APODOS_PROHIBIDOS, normalizarApodo, validarApodo };
