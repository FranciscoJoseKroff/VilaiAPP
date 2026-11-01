import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { PixelVillage } from '../../components/PixelVillage';
import { usePreferenciasEscena } from '../../hooks/usePreferenciasEscena';
import { calcularCapacidadesAldea } from '../../game/simulation';
import { ResourceChip } from '../../components/ResourceChip';
import { AppIcon } from '../../components/icons';
import { estacionEn } from '../../game/tiempo';
import { useLocalSearchParams } from 'expo-router';
import { VillagerBottomSheet } from '../../components/VillagerBottomSheet';
import { aldeanosStore } from '../../simulacion/villagerStore';
import { useHapticsFeedback } from '../../context/HapticsContext';
import { useSonido } from '../../servicios/sonidos';
import { LinearGradient } from 'expo-linear-gradient';
import PixelPanel from '../../components/pixel/PixelPanel';
import PixelBar from '../../components/pixel/PixelBar';
import { AvatarAldeano } from '../../components/AvatarAldeano';
import { useTemaTiempo } from '../../hooks/useTemaTiempo';
import Animated from 'react-native-reanimated';

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
  useEffect(() => {
    if (!params.villager) return undefined;
    const temporizador = setTimeout(() => setAldeanoSeleccionadoId(String(params.villager)), 0);
    return () => clearTimeout(temporizador);
  }, [params.villager]);
  const [cronicaExpandida, setCronicaExpandida] = useState(false);
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const contentWidth = Math.max(0, width - theme.spacing[16] * 2);
  const columnGap = theme.spacing[8];
  const cellWidth = width >= 600
    ? `${100 / columns - 1}%`
    : (contentWidth - columnGap) / columns;
  const aldea = game.aldea;
  useEffect(() => aldeanosStore.subscribe(setAldeanosVida), []);
  const segundos = aldea.ciclo?.segundos || 0;
  const estacion = estacionEn(segundos);
  const estacionCatalogoId = estacion.id === 'otoño' ? 'otono' : estacion.id;
  const estacionCatalogo = game.catalogo?.estaciones?.[estacionCatalogoId];
  const tituloEstacion = estacionCatalogo?.nombre || estacion.id.charAt(0).toUpperCase() + estacion.id.slice(1);
  const progresoEstacion = Math.max(0, Math.min(1, estacion.segundosEnEstacion / estacion.duracion));
  const restanteEstacion = Math.max(0, Math.ceil(estacion.restante));
  const restanteInvierno = Math.max(0, 120 - segundos);
  const advertenciaInvierno = estacion.id !== 'invierno' && restanteInvierno < 15;
  const indiceEstacion = estacion.indice;
  const segmentosAnio = ['primavera', 'verano', 'otoño', 'invierno'];
  const capacidades = calcularCapacidadesAldea(aldea, game.catalogo);
  const ordenRecursos = ['trigo', 'harina', 'pan', 'madera', 'comida', 'oro', 'hierro'];
  const edadInfo = game.catalogo?.edades?.[aldea.edad?.id] || game.catalogo?.edades?.calma;
  const entradasCronica = Array.isArray(aldea.cronica) ? [...aldea.cronica].reverse() : [];
  const cronicaVisible = cronicaExpandida ? entradasCronica : entradasCronica.slice(0, 3);
  const edadAnio = Number(aldea.ciclo?.dia || 1);
  const aldeanoSeleccionado = aldeanosVida.find((aldeano) => String(aldeano.id) === aldeanoSeleccionadoId) || null;
  const edificiosDisponibles = (aldea.edificios || []).map((edificio) => String(edificio.tipoId));
  const trabajosDisponibles = [
    ['lenador', 'aserradero', 'Leñador'],
    ['granjero', 'granja', 'Granjero'],
    ['minero', 'mina', 'Minero'],
    ['guardia', 'torre', 'Guardia'],
  ].filter(([, edificio]) => edificiosDisponibles.includes(edificio)).map(([id, , nombre]) => ({ id, nombre }));

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
    const cronica = [...(Array.isArray(game.aldea.cronica) ? game.aldea.cronica : []), {
      anio: Number(game.aldea.ciclo?.dia || 1), tipo: 'aldeano', texto: `${aldeanoSeleccionado.nombre} recibió una bendición`,
    }].slice(-50);
    aldeanosStore.registrarSuceso(`${aldeanoSeleccionado.nombre} recibió una bendición`);
    game.setAldea({ ...game.aldea, recursos, cronica });
    game.guardar({ ...game.aldea, recursos, cronica }, game.token);
  };
  const edadInicio = Number(aldea.edad?.inicioAnio ?? edadAnio);
  const edadDuracion = Number(aldea.edad?.duracionAnios ?? 10);
  const quedanEdad = Math.max(0, edadInicio + edadDuracion - edadAnio);
  const efectosEdad = [];
  if (Number(edadInfo?.generacion ?? 1) !== 1) efectosEdad.push(`Producción ${Math.round((Number(edadInfo.generacion) - 1) * 100)} %`);
  for (const [recurso, factor] of Object.entries(edadInfo?.recursos || {})) {
    efectosEdad.push(`${recurso.charAt(0).toUpperCase() + recurso.slice(1)} ${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)} %`);
  }


  return (
    <>
    <ScrollView contentContainerStyle={[styles.container, { maxWidth: 960, alignSelf: 'center', width: '100%' }]} >
      <Animated.View pointerEvents="none" style={[styles.ageTint, { opacity: 0.08, backgroundColor: temaTiempo.edadTint }]} />
      <LinearGradient colors={[theme.colors.fondo, theme.colors.superficie]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.titleGradient}>
        <Text style={styles.title}>Tu aldea despierta</Text>
      </LinearGradient>
      <Text style={styles.subtitle}>Construye, mejora y haz crecer tu comunidad.</Text>

      <PixelPanel variant="elevada" style={[styles.cycle, advertenciaInvierno && styles.cycleWarning]}>
        <View style={styles.cycleHeading}>
          <AppIcon name={estacionCatalogo?.icono || (estacion.id === 'invierno' ? 'snowflake' : 'white-balance-sunny')} size={24} color={advertenciaInvierno ? theme.colors.aviso : theme.colors.acento} accessibilityLabel={`Estación: ${tituloEstacion}`} />
          <View style={styles.cycleCopy}><Text style={styles.cycleText}>{tituloEstacion} · Año {aldea.ciclo?.dia || 1}</Text><Text style={styles.cycleTime}>Quedan {restanteEstacion} s</Text></View>
        </View>
        <PixelBar value={progresoEstacion} segments={20} continuous color={advertenciaInvierno ? 'aviso' : 'acento'} height={12} accessibilityLabel={`Progreso de ${tituloEstacion}`} />
        <View accessibilityLabel="Progreso del año" style={styles.yearTrack}>{segmentosAnio.map((_, indice) => <View key={indice} style={[styles.yearSegment, indice === indiceEstacion && styles.yearSegmentActive, indice < indiceEstacion && styles.yearSegmentComplete]} />)}</View>
      </PixelPanel>

      {edadInfo ? <View style={styles.ageCard} accessibilityRole="summary" accessibilityLabel={`${edadInfo.nombre}. ${edadInfo.descripcion}`}>
        <View style={styles.ageHeading}>
          <AppIcon name={edadInfo.icono || 'weather-partly-cloudy'} size={28} color={theme.colors.acento} accessibilityLabel={`Edad actual: ${edadInfo.nombre}`} />
          <View style={styles.ageCopy}><Text style={styles.ageName}>{edadInfo.nombre}</Text><Text style={styles.ageRemaining}>Quedan {quedanEdad} año{quedanEdad === 1 ? '' : 's'}</Text></View>
        </View>
        <Text style={styles.ageDescription}>{edadInfo.descripcion}</Text>
        {efectosEdad.length > 0 ? <Text style={styles.ageEffects}>{efectosEdad.join(' · ')}</Text> : <Text style={styles.ageEffects}>Sin modificaciones</Text>}
      </View> : null}

      <View style={styles.chronicle} accessibilityRole="header">
        <Text style={styles.section}>Crónica</Text>
        {entradasCronica.length > 0 ? (
          <View>
            {cronicaVisible.map((entrada, indice) => {
              const icono = entrada.tipo === 'aldeano' ? 'account-plus' : entrada.tipo === 'evento' ? 'weather-lightning' : entrada.tipo === 'construccion' ? 'hammer' : entrada.tipo === 'edad' ? 'crown' : 'book-open-page-variant';
              return <View key={`${entrada.anio}-${entrada.tipo}-${entrada.texto}-${indice}`} accessibilityRole="text" accessibilityLabel={`Año ${entrada.anio}. ${entrada.texto}`} style={styles.chronicleItem}>
                <View style={styles.chronicleLine} />
                {entrada.tipo === 'aldeano' ? (
                  <AvatarAldeano aldeano={{ nombre: entrada.texto.replace(/^Llegó\s+/i, '') }} size={32} />
                ) : <AppIcon name={icono} size={20} color={theme.colors.acento} accessibilityLabel={`Tipo: ${entrada.tipo}`} />}
                <View style={styles.chronicleCopy}><Text style={styles.chronicleYear}>Año {entrada.anio}</Text><Text style={styles.chronicleText}>{entrada.texto}</Text></View>
              </View>;
            })}
            {entradasCronica.length > 3 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cronicaExpandida ? 'Ver menos entradas de la crónica' : `Ver más entradas de la crónica. ${entradasCronica.length - 3} ocultas`}
                accessibilityState={{ expanded: cronicaExpandida }}
                style={styles.chronicleToggle}
                onPress={() => setCronicaExpandida((expandida) => !expandida)}
              >
                <Text style={styles.chronicleToggleText}>{cronicaExpandida ? 'Ver menos' : 'Ver más'}</Text>
                <AppIcon name={cronicaExpandida ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.acento} />
              </Pressable>
            ) : null}
          </View>
        ) : <View style={styles.chronicleEmpty}><AppIcon name="book-open-outline" size={24} color={theme.colors.textoSecundario} accessibilityLabel="Crónica vacía" /><Text style={styles.chronicleEmptyText}>La historia de tu aldea comienza aquí.</Text></View>}
      </View>

      <PixelVillage
        aldea={aldea}
        estacion={estacion.id}
        catalogo={game.catalogo}
        ahorroBateria={escena.ahorroBateria}
        particulas={escena.particulas}
        aldeanoSeleccionadoId={aldeanoSeleccionadoId}
        onSeleccionarAldeano={seleccionarAldeano}
      />

      <Text style={styles.section}>Recursos</Text>
      <View style={styles.grid}>{ordenRecursos.map((id) => {
        const cantidad = aldea.recursos[id] || 0;
        const capacidad = capacidades[id] || 0;
        const tasa = Math.round((Number(game.produccion[id] || 0) - cantidad) * 10) / 10;
        const factorEstacional = estacionCatalogo?.recursos?.[id];
        return <View style={[styles.resourceCell, { width: cellWidth }]} key={id}><ResourceChip resource={id} amount={cantidad} capacity={capacidad} rate={tasa} seasonFactor={factorEstacional} /></View>;
      })}</View>

    </ScrollView>
      <VillagerBottomSheet
        ref={villagerSheet}
        aldeano={aldeanoSeleccionado}
        oro={Number(game.aldea.recursos?.oro || 0)}
        trabajosDisponibles={trabajosDisponibles}
        onAsignar={asignarTrabajo}
        onBendecir={bendecir}
        onClose={() => setAldeanoSeleccionadoId('')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.colors.fondo, padding: theme.spacing[16], paddingBottom: 88 },
  ageTint: { position: 'absolute', left: 0, right: 0, top: 0, height: 96 },
  titleGradient: { borderRadius: 4, paddingHorizontal: theme.spacing[8], paddingVertical: theme.spacing[4], marginBottom: theme.spacing[8] },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario },
  subtitle: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginBottom: theme.spacing[16] },
  cycle: { borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[12], marginBottom: theme.spacing[8] }, cycleWarning: { borderColor: theme.colors.aviso },
  cycleHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], minHeight: 44 }, cycleCopy: { flex: 1 }, cycleText: { ...theme.typography.titulo, color: theme.colors.textoPrimario, fontSize: 16, lineHeight: 24 }, cycleTime: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.small },
  cycleTrack: { height: 8, overflow: 'hidden', borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta, marginTop: theme.spacing[8] }, cycleFill: { height: '100%', backgroundColor: theme.colors.acento }, cycleFillWarning: { backgroundColor: theme.colors.aviso },
  ageCard: { borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[12], marginTop: theme.spacing[8] }, ageHeading: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: theme.spacing[8] }, ageCopy: { flex: 1 }, ageName: { ...theme.typography.titulo, color: theme.colors.textoPrimario, fontSize: 16, lineHeight: 24 }, ageRemaining: { color: theme.colors.acento, fontSize: 14 }, ageDescription: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: theme.spacing[4] }, ageEffects: { color: theme.colors.exito, fontSize: 14, fontWeight: theme.typography.weights.semibold, marginTop: theme.spacing[8] },
  yearTrack: { flexDirection: 'row', gap: 4, marginTop: theme.spacing[8] }, yearSegment: { flex: 1, height: 6, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.superficieAlta }, yearSegmentComplete: { backgroundColor: theme.colors.textoSecundario }, yearSegmentActive: { backgroundColor: theme.colors.acento, borderColor: theme.colors.acento },
  chronicle: { marginTop: theme.spacing[8], borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[12] },
  chronicleItem: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[8], minHeight: 44, paddingVertical: theme.spacing[8], paddingLeft: theme.spacing[4] }, chronicleLine: { position: 'absolute', left: 14, top: 38, bottom: -8, width: 1, backgroundColor: theme.colors.borde }, chronicleCopy: { flex: 1 }, chronicleYear: { color: theme.colors.acento, fontSize: 14, fontWeight: theme.typography.weights.bold }, chronicleText: { color: theme.colors.textoPrimario, fontSize: 14, marginTop: 2 }, chronicleEmpty: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], minHeight: 44 }, chronicleEmptyText: { flex: 1, color: theme.colors.textoSecundario, fontSize: 14 },
  chronicleToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[4], marginTop: theme.spacing[4] }, chronicleToggleText: { color: theme.colors.acento, fontSize: 14, fontWeight: theme.typography.weights.bold },
  section: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[16], marginBottom: theme.spacing[8] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing[8], rowGap: theme.spacing[8] }, resourceCell: { flexShrink: 0 },
  actionButton: { marginTop: theme.spacing[12], backgroundColor: theme.colors.acento, borderRadius: theme.radius[6], paddingVertical: theme.spacing[12], alignItems: 'center' }, actionDisabled: { opacity: 0.45 }, actionText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  message: { marginTop: theme.spacing[12], backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[10], padding: theme.spacing[12] }, messageText: { color: theme.colors.textoPrimario },
});
