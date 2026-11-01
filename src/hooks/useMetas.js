import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { catalogoMetas } from '../metas/metas';

const SIN_CAPACIDADES = {};
const SIN_PRODUCCION = {};

function nivelEdificio(aldea, edificioId) {
  return Number((aldea?.edificios || []).find((edificio) => edificio.tipoId === edificioId)?.nivel || 0);
}

function tieneEdificio(aldea, edificioId) {
  return (aldea?.edificios || []).some((edificio) => edificio.tipoId === edificioId);
}

export function progresoMeta(meta, aldea) {
  const condicion = meta.condicion;
  let actual = 0;

  switch (condicion.tipo) {
    case 'recurso':
      actual = Number(aldea?.recursos?.[condicion.recurso] || 0);
      break;
    case 'nivelEdificio':
      actual = nivelEdificio(aldea, condicion.edificio);
      break;
    case 'cantidadEdificio':
      actual = tieneEdificio(aldea, condicion.edificio) ? 1 : 0;
      break;
    case 'aldeanos':
      actual = (aldea?.aldeanos || []).length;
      break;
    case 'investigacion':
      actual = Number(aldea?.tecnologias?.[condicion.tecnologia] || aldea?.investigaciones?.[condicion.tecnologia] || 0);
      break;
    case 'cadenaPan':
      actual = ['granja', 'molino', 'horno'].filter((edificio) => tieneEdificio(aldea, edificio)).length;
      break;
    default:
      actual = 0;
  }

  return {
    actual: Math.min(actual, condicion.objetivo),
    objetivo: condicion.objetivo,
    proporcion: condicion.objetivo > 0 ? Math.min(1, actual / condicion.objetivo) : 0,
    cumplida: actual >= condicion.objetivo,
  };
}

export function sugerenciasDinamicas(aldea, capacidades = {}, produccion = {}) {
  const sugerencias = [];
  const recursosLlave = ['comida', 'madera', 'oro'];

  for (const recurso of recursosLlave) {
    const cantidad = Number(aldea?.recursos?.[recurso] || 0);
    const capacidad = Number(capacidades[recurso] || 0);
    if (capacidad > 0 && cantidad >= capacidad * 0.95) {
      sugerencias.push({
        id: `espacio-${recurso}`,
        titulo: `Gasta o amplía tu reserva de ${recurso}`,
        descripcion: `La reserva está al ${Math.round((cantidad / capacidad) * 100)}%. Construye mejoras o usa el excedente.`,
      });
    }
  }

  const cadena = ['granja', 'molino', 'horno'];
  const faltantes = cadena.filter((edificio) => !tieneEdificio(aldea, edificio));
  if (faltantes.length > 0 && faltantes.length < cadena.length) {
    sugerencias.push({
      id: 'completar-cadena-pan',
      titulo: 'Termina la cadena del pan',
      descripcion: `Falta construir: ${faltantes.join(', ')}.`,
    });
  }

  const recursosProducidos = ['comida', 'madera', 'oro'];
  const tasaMedia = recursosProducidos.reduce((total, recurso) => total + Number(produccion[recurso] || 0), 0) / recursosProducidos.length;
  if (tasaMedia < 1 && (aldea?.aldeanos || []).length >= 3) {
    sugerencias.push({
      id: 'mejorar-produccion',
      titulo: 'Mejorar la producción',
      descripcion: 'La producción media es baja. Mejora edificios o reasigna aldeanos.',
    });
  }

  return sugerencias;
}

export function useMetas(estadoJuego, opciones = {}) {
  const aldea = estadoJuego?.aldea || estadoJuego;
  const capacidades = opciones.capacidades || SIN_CAPACIDADES;
  const produccion = opciones.produccion || SIN_PRODUCCION;
  const onRecompensa = opciones.onRecompensa;
  const [estados, setEstados] = useState({});
  const [cargadas, setCargadas] = useState(false);
  const aldeaId = String(aldea?._id || aldea?.id || 'aldea-actual');
  const clavePersistencia = `vilai_metas:${aldeaId}`;
  const estadosRef = useRef({});
  const cargaIniciadaRef = useRef(false);

  useEffect(() => {
    if (cargaIniciadaRef.current) return undefined;
    cargaIniciadaRef.current = true;
    let activo = true;
    AsyncStorage.getItem(clavePersistencia).then((guardado) => {
      if (!activo) return;
      let guardados = {};
      try {
        guardados = guardado ? JSON.parse(guardado) : {};
      } catch {
        guardados = {};
      }
      const iniciales = {};
      for (const meta of catalogoMetas) {
        const estadoGuardado = guardados[meta.id];
        if (estadoGuardado === 'reclamada') {
          iniciales[meta.id] = 'reclamada';
        } else if (progresoMeta(meta, aldea).cumplida) {
          iniciales[meta.id] = 'lista';
        } else {
          iniciales[meta.id] = estadoGuardado === 'lista' ? 'lista' : 'activa';
        }
      }
      estadosRef.current = iniciales;
      setEstados(iniciales);
      setCargadas(true);
    });
    return () => { activo = false; };
  }, [aldea, clavePersistencia]); // El progreso se evalúa después de cargar.

  useEffect(() => {
    estadosRef.current = estados;
  }, [estados]);

  const evaluar = useCallback(() => {
    if (!cargadas || !aldea) return;
    setEstados((actuales) => {
      let cambio = false;
      const siguientes = { ...actuales };
      for (const meta of catalogoMetas) {
        if (actuales[meta.id] !== 'activa') continue;
        if (progresoMeta(meta, aldea).cumplida) {
          siguientes[meta.id] = 'lista';
          cambio = true;
        }
      }
      if (!cambio) return actuales;
      estadosRef.current = siguientes;
      AsyncStorage.setItem(clavePersistencia, JSON.stringify(siguientes)).catch(() => {});
      return siguientes;
    });
  }, [aldea, cargadas, clavePersistencia]);

  useEffect(() => {
    const temporizador = setInterval(evaluar, 1500);
    evaluar();
    return () => clearInterval(temporizador);
  }, [evaluar]);

  useEffect(() => {
    if (cargadas) {
      AsyncStorage.setItem(clavePersistencia, JSON.stringify(estados)).catch(() => {});
    }
  }, [estados, cargadas, clavePersistencia]);

  const reclamar = useCallback((id) => {
    const meta = catalogoMetas.find((item) => item.id === id);
    if (!meta || estadosRef.current[id] !== 'lista') return false;
    const siguientes = { ...estadosRef.current, [id]: 'reclamada' };
    estadosRef.current = siguientes;
    setEstados(siguientes);
    AsyncStorage.setItem(clavePersistencia, JSON.stringify(siguientes)).catch(() => {});
    onRecompensa?.(meta);
    return true;
  }, [clavePersistencia, onRecompensa]);

  const metas = useMemo(() => catalogoMetas.map((meta) => ({
    ...meta,
    estado: estados[meta.id] || (progresoMeta(meta, aldea).cumplida ? 'lista' : 'activa'),
  })).filter((meta) => meta.estado !== 'reclamada'), [estados, aldea]);

  const sugerencias = useMemo(() => sugerenciasDinamicas(aldea, capacidades, produccion), [aldea, capacidades, produccion]);
  const porReclamar = metas.filter((meta) => meta.estado === 'lista').length;

  return { metas, porReclamar, reclamar, progresoMeta: (meta) => progresoMeta(meta, aldea), sugerencias, cargadas };
}
