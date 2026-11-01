/**
 * @typedef {"principal"|"secundaria"|"periodica"} CategoriaMeta
 * @typedef {"activa"|"lista"|"reclamada"} EstadoMeta
 * @typedef {{
 *   tipo: "recurso"|"nivelEdificio"|"cantidadEdificio"|"aldeanos"|"investigacion"|"cadenaPan",
 *   recurso?: string,
 *   edificio?: string,
 *   tecnologia?: string,
 *   objetivo: number
 * }} CondicionMeta
 * @typedef {{
 *   recursos?: Record<string, number>,
 *   aldeanos?: number,
 *   desbloqueo?: string,
 *   puntosInvestigacion?: number
 * }} RecompensaMeta
 * @typedef {{
 *   id: string,
 *   categoria: CategoriaMeta,
 *   titulo: string,
 *   descripcion: string,
 *   condicion: CondicionMeta,
 *   recompensa: RecompensaMeta,
 *   estado: EstadoMeta
 * }} Meta
 */

/** @type {Meta[]} */
export const catalogoMetas = [
  {
    id: 'casa-nivel-3',
    categoria: 'principal',
    titulo: 'Dar hogar a la aldea',
    descripcion: 'Mejora la casa hasta el nivel 3.',
    condicion: { tipo: 'nivelEdificio', edificio: 'casa', objetivo: 3 },
    recompensa: { recursos: { madera: 35, comida: 25 }, puntosInvestigacion: 10 },
    estado: 'activa',
  },
  {
    id: 'aldeanos-8',
    categoria: 'principal',
    titulo: 'Una comunidad activa',
    descripcion: 'Haz crecer la aldea hasta 8 aldeanos.',
    condicion: { tipo: 'aldeanos', objetivo: 8 },
    recompensa: { recursos: { comida: 80, oro: 25 }, puntosInvestigacion: 15 },
    estado: 'activa',
  },
  {
    id: 'cadena-pan',
    categoria: 'principal',
    titulo: 'Completar la cadena del pan',
    descripcion: 'Construye granja, molino y horno.',
    condicion: { tipo: 'cadenaPan', objetivo: 3 },
    recompensa: { recursos: { pan: 40, madera: 30 }, puntosInvestigacion: 20 },
    estado: 'activa',
  },
  {
    id: 'juntar-madera-200',
    categoria: 'secundaria',
    titulo: 'Reserva para construir',
    descripcion: 'Acumula 200 de madera.',
    condicion: { tipo: 'recurso', recurso: 'madera', objetivo: 200 },
    recompensa: { recursos: { oro: 20 } },
    estado: 'activa',
  },
  {
    id: 'juntar-comida-300',
    categoria: 'secundaria',
    titulo: 'El granero está lleno de futuro',
    descripcion: 'Acumula 300 de comida.',
    condicion: { tipo: 'recurso', recurso: 'comida', objetivo: 300 },
    recompensa: { recursos: { madera: 20, trigo: 30 } },
    estado: 'activa',
  },
  {
    id: 'granja-nivel-2',
    categoria: 'secundaria',
    titulo: 'Mejorar los campos',
    descripcion: 'Lleva la granja al nivel 2.',
    condicion: { tipo: 'nivelEdificio', edificio: 'granja', objetivo: 2 },
    recompensa: { recursos: { comida: 50, oro: 15 } },
    estado: 'activa',
  },
  {
    id: 'molino-nivel-2',
    categoria: 'secundaria',
    titulo: 'Molino más veloz',
    descripcion: 'Lleva el molino al nivel 2.',
    condicion: { tipo: 'nivelEdificio', edificio: 'molino', objetivo: 2 },
    recompensa: { recursos: { harina: 35, oro: 15 } },
    estado: 'activa',
  },
  {
    id: 'centro-investigacion',
    categoria: 'principal',
    titulo: 'Abrir el centro de saber',
    descripcion: 'Construye el centro de investigación.',
    condicion: { tipo: 'cantidadEdificio', edificio: 'centroInvestigacion', objetivo: 1 },
    recompensa: { recursos: { oro: 30 }, puntosInvestigacion: 25 },
    estado: 'activa',
  },
  {
    id: 'metalurgia',
    categoria: 'principal',
    titulo: 'Dominar la metalurgia',
    descripcion: 'Investiga Metalurgia al menos una vez.',
    condicion: { tipo: 'investigacion', tecnologia: 'metalurgia', objetivo: 1 },
    recompensa: { recursos: { hierro: 50, oro: 40 }, puntosInvestigacion: 30 },
    estado: 'activa',
  },
  {
    id: 'reserva-hierro-30',
    categoria: 'periodica',
    titulo: 'Acero para la aldea',
    descripcion: 'Acumula 30 de hierro.',
    condicion: { tipo: 'recurso', recurso: 'hierro', objetivo: 30 },
    recompensa: { recursos: { madera: 50, oro: 25 } },
    estado: 'activa',
  },
];
