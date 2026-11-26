import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { usePreferenciasEscena } from '../../hooks/usePreferenciasEscena';
import { aplicarLogros } from '../../game/logros';
import { estacionEn } from '../../game/tiempo';
import { router, useLocalSearchParams } from 'expo-router';
import { VillagerBottomSheet } from '../../components/VillagerBottomSheet';
import { aldeanosStore } from '../../simulacion/villagerStore';
import { useHapticsFeedback } from '../../context/HapticsContext';
import { useSonido } from '../../servicios/sonidos';
import { useTemaTiempo } from '../../hooks/useTemaTiempo';
import { HudAldea } from '../../components/HudAldea';
import { CronicaSheet } from '../../components/CronicaSheet';
import { CintaMeta } from '../../components/CintaMeta';
import Animated from 'react-native-reanimated';

// Carga diferida: en web, Skia lee global.CanvasKit al evaluar el módulo, y Expo Router
// evalúa las rutas antes de que LoadSkiaWeb (en _layout) termine. Importarla aquí la vuelve tarde.
const PixelVillage = lazy(() => import('../../components/PixelVillage').then((m) => ({ default: m.PixelVillage })));

export default function AldeaTab() {
  const game = useGame();
  const temaTiempo = useTemaTiempo();
  const escena = usePreferenciasEscena();
  const params = useLocalSearchParams();
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const villagerSheet = useRef(null);
  const [aldeanoSeleccionadoId, setAldeanoSeleccionadoId] = useState(() => String(params.villager || ''));
  const [aldeanosVida, setAldeanosVida] = useState(() => aldeanosStore.getState());
  const [cronicaVisible, setCronicaVisible] = useState(false);
  useEffect(() => {
    if (!params.villager) return undefined;
    const temporizador = setTimeout(() => setAldeanoSeleccionadoId(String(params.villager)), 0);
    return () => clearTimeout(temporizador);
  }, [params.villager]);
  useEffect(() => aldeanosStore.subscribe(setAldeanosVida), []);

  const aldea = game.aldea;
  const segundos = aldea.ciclo?.segundos || 0;
  const estacion = estacionEn(segundos);
  const estacionCatalogoId = estacion.id === 'otoño' ? 'otono' : estacion.id;
  const estacionCatalogo = game.catalogo?.estaciones?.[estacionCatalogoId];
  const tituloEstacion = estacionCatalogo?.nombre || estacion.id.charAt(0).toUpperCase() + estacion.id.slice(1);
  const restanteInvierno = Math.max(0, 120 - segundos);
  const edadAnio = Number(aldea.ciclo?.dia || 1);
  const edadInfo = game.catalogo?.edades?.[aldea.edad?.id] || game.catalogo?.edades?.calma;
  const aldeanoSeleccionado = aldeanosVida.find((aldeano) => String(aldeano.id) === aldeanoSeleccionadoId) || null;
  const edificiosDisponibles = (aldea.edificios || []).map((edificio) => String(edificio.tipoId));
  const trabajosDisponibles = [
    ['lenador', 'aserradero', 'Leñador'],
    ['granjero', 'granja', 'Granjero'],
    ['minero', 'mina', 'Minero'],
    ['guardia', 'torre', 'Guardia'],
  ].filter(([, edificio]) => edificiosDisponibles.includes(edificio)).map(([id, , nombre]) => ({ id, nombre }));

  const estadoEstacion = {
    titulo: tituloEstacion,
    anio: edadAnio,
    icono: estacionCatalogo?.icono || (estacion.id === 'invierno' ? 'snowflake' : 'white-balance-sunny'),
    progreso: Math.max(0, Math.min(1, estacion.segundosEnEstacion / estacion.duracion)),
    restante: Math.max(0, Math.ceil(estacion.restante)),
    advertencia: estacion.id !== 'invierno' && restanteInvierno < 15,
  };

  const edadInicio = Number(aldea.edad?.inicioAnio ?? edadAnio);
  const edadDuracion = Number(aldea.edad?.duracionAnios ?? 10);
  const efectosEdad = [];
  if (Number(edadInfo?.generacion ?? 1) !== 1) efectosEdad.push(`Producción ${Math.round((Number(edadInfo.generacion) - 1) * 100)} %`);
  for (const [recurso, factor] of Object.entries(edadInfo?.recursos || {})) {
    efectosEdad.push(`${recurso.charAt(0).toUpperCase() + recurso.slice(1)} ${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)} %`);
  }
  const edadCronica = edadInfo ? {
    nombre: edadInfo.nombre,
    descripcion: edadInfo.descripcion,
    icono: edadInfo.icono,
    quedan: Math.max(0, edadInicio + edadDuracion - edadAnio),
    efectos: efectosEdad,
  } : null;
  const cronica = aldea.cronica;
  const entradasCronica = useMemo(() => (Array.isArray(cronica) ? [...cronica].reverse() : []), [cronica]);

  const seleccionarAldeano = (aldeano) => {
    haptics.light();
    sonido.reproducir('aldeano');
    setAldeanoSeleccionadoId(String(aldeano.id));
    villagerSheet.current?.abrir();
  };

  const guardarAldeano = (id, cambios) => {
    aldeanosStore.actualizar((aldeanos) => aldeanos.map((aldeano) => String(aldeano.id) === String(id) ? { ...aldeano, ...cambios } : aldeano));
    const siguientes = game.aldea.aldeanos.map((aldeano, indice) => String(aldeano._id || aldeano.id || aldeano.nombre || indice) === String(id)
      ? { ...aldeano, ...cambios }
      : aldeano);
    const actualizada = { ...game.aldea, aldeanos: siguientes };
    game.setAldea(actualizada);
    game.guardar(actualizada, game.token);
  };

  const asignarTrabajo = (profesion) => {
    if (!aldeanoSeleccionado) return;
    aldeanosStore.registrarAccion(aldeanoSeleccionado.id, `Cambió a ${profesion}`);
    guardarAldeano(aldeanoSeleccionado.id, {
      profesion,
      trabajo: profesion === 'granjero' ? 'agricultor' : profesion,
      modoTrabajo: 'manual',
      pensamientoActual: `Trabajando como ${profesion}.`,
    });
  };

  const bendecir = () => {
    if (!aldeanoSeleccionado || Number(game.aldea.recursos?.oro || 0) < 10) return;
    aldeanosStore.bendecir(aldeanoSeleccionado.id, 20);
    const recursos = { ...game.aldea.recursos, oro: Number(game.aldea.recursos.oro || 0) - 10 };
    const cronicaNueva = [...(Array.isArray(game.aldea.cronica) ? game.aldea.cronica : []), {
      anio: Number(game.aldea.ciclo?.dia || 1), tipo: 'aldeano', texto: `${aldeanoSeleccionado.nombre} recibió una bendición`,
    }].slice(-50);
    aldeanosStore.registrarSuceso(`${aldeanoSeleccionado.nombre} recibió una bendición`);
    const actualizada = aplicarLogros({ ...game.aldea, recursos, cronica: cronicaNueva }, game.catalogo?.logros);
    game.setAldea(actualizada);
    game.guardar(actualizada, game.token);
  };

  return (
    <View style={styles.pantalla}>
      <HudAldea
        estacion={estadoEstacion}
        onCronica={() => setCronicaVisible(true)}
        onEstadisticas={() => router.push('/estadisticas')}
        onLogros={() => router.push('/logros')}
      />

      <Suspense fallback={<View style={styles.escenaCargando} accessibilityLabel="Cargando la aldea" />}>
        <PixelVillage
          style={styles.escena}
          aldea={aldea}
          estacion={estacion.id}
          catalogo={game.catalogo}
          ahorroBateria={escena.ahorroBateria}
          particulas={escena.particulas}
          aldeanoSeleccionadoId={aldeanoSeleccionadoId}
          onSeleccionarAldeano={seleccionarAldeano}
        >
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.08, backgroundColor: temaTiempo.edadTint }]} />
          <View pointerEvents="none" style={styles.letrero}>
            <Text accessibilityRole="header" style={styles.letreroTexto}>Tu aldea despierta</Text>
          </View>
          <CintaMeta style={styles.cinta} />
        </PixelVillage>
      </Suspense>

      <CronicaSheet visible={cronicaVisible} onClose={() => setCronicaVisible(false)} edad={edadCronica} entradas={entradasCronica} />
      <VillagerBottomSheet
        ref={villagerSheet}
        aldeano={aldeanoSeleccionado}
        oro={Number(game.aldea.recursos?.oro || 0)}
        trabajosDisponibles={trabajosDisponibles}
        onAsignar={asignarTrabajo}
        onBendecir={bendecir}
        onClose={() => setAldeanoSeleccionadoId('')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: theme.colors.fondo },
  escena: { flex: 1, height: undefined, borderRadius: 0 },
  escenaCargando: { flex: 1, backgroundColor: theme.colors.superficie },
  // Letrero de madera con el nombre de la pantalla, en la esquina libre de la escena (el zoom va a la derecha).
  letrero: {
    position: 'absolute',
    top: theme.spacing[8],
    left: theme.spacing[8],
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: theme.colors.maderaEnvejecida,
    borderLeftColor: theme.colors.maderaEnvejecida,
    borderBottomColor: theme.colors.troncoOscuro,
    borderRightColor: theme.colors.troncoOscuro,
    backgroundColor: theme.colors.castañoOscuro,
  },
  cinta: { position: 'absolute', left: theme.spacing[12], right: theme.spacing[12], bottom: theme.spacing[12] },
  letreroTexto: { fontFamily: theme.typography.titulo.fontFamily, fontSize: 10, lineHeight: 14, color: theme.colors.pergamino },
});
