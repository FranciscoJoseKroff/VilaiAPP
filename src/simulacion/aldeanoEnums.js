export const ESTADOS_ALDEANO = [
  'buscando_arbol',
  'talando',
  'cultivando',
  'minando',
  'vigilando',
  'descansando',
  'yendo_a_construir',
  'construyendo',
];

export const TRABAJOS_ALDEANO = [
  'libre',
  'lenador',
  'agricultor',
  'minero',
  'guardia',
];

export const RASGOS_ALDEANO = [
  'polivalente',
  'maderero',
  'hortelano',
  'minero',
  'guardian',
];

export const TIPOS_EDIFICIO = [
  'aserradero',
  'granja',
  'casa',
  'centroInvestigacion',
  'granero',
  'almacen',
  'molino',
  'horno',
  'mina',
  'observatorio',
  'taberna',
  'biblioteca',
  'torreVigilancia',
];

export const TIPOS_EVENTO = ['bestias', 'helada', 'recaudador', 'incendio'];

export function prepararAldeanoParaGuardar(aldeano) {
  const trabajoVisualProfesiones = {
    lenador: 'lenador',
    granjero: 'agricultor',
    agricultor: 'agricultor',
    minero: 'minero',
    guardia: 'guardia',
    sin_oficio: 'libre',
    libre: 'libre',
  };
  const trabajo = trabajoVisualProfesiones[aldeano.trabajo]
    || trabajoVisualProfesiones[aldeano.profesion]
    || 'libre';

  return {
    ...aldeano,
    estado: ESTADOS_ALDEANO.includes(aldeano.estado) ? aldeano.estado : 'buscando_arbol',
    trabajo: TRABAJOS_ALDEANO.includes(trabajo) ? trabajo : 'libre',
    rasgo: RASGOS_ALDEANO.includes(aldeano.rasgo) ? aldeano.rasgo : 'polivalente',
  };
}

export function prepararAldeaParaGuardar(aldea) {
  return {
    ...aldea,
    aldeanos: (aldea.aldeanos || []).map(prepararAldeanoParaGuardar),
  };
}
