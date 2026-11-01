import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { aportePorOficio, razonPrincipal } from '../../game/format';
import { AppIcon } from '../../components/icons';
import { useRouter } from 'expo-router';
import { aldeanosStore } from '../../simulacion/villagerStore';
import PixelPanel from '../../components/pixel/PixelPanel';
import { AvatarAldeano } from '../../components/AvatarAldeano';

const TRABAJOS = {
  automatico: { nombre: 'Auto', icono: 'robot-outline' },
  lenador: { nombre: 'Leñador', icono: 'tree' },
  agricultor: { nombre: 'Agricultor', icono: 'sprout' },
  minero: { nombre: 'Minero', icono: 'pickaxe' },
  guardia: { nombre: 'Guardia', icono: 'shield' },
  libre: { nombre: 'Libre', icono: 'account-off' },
};

const FILTROS = ['todos', 'lenador', 'agricultor', 'minero', 'guardia', 'libre'];
const SIN_ALDEANOS = [];
const FACTORES = [
  { id: 'necesidad', nombre: 'Necesidad', icono: 'alert-outline' },
  { id: 'saturacion', nombre: 'Saturación', icono: 'account-group' },
  { id: 'rasgo', nombre: 'Rasgo', icono: 'star' },
  { id: 'contexto', nombre: 'Contexto', icono: 'weather-partly-cloudy' },
  { id: 'inercia', nombre: 'Inercia', icono: 'history' },
  { id: 'variedad', nombre: 'Variedad', icono: 'shuffle' },
];

function formatearPuntaje(valor) {
  return Number(valor || 0).toFixed(2).replace('.', ',');
}

function resumirDecision(decision) {
  if (!decision) return 'Aún no ha decidido nada';
  const opciones = decision.opciones || [];
  if (decision.libre || decision.elegida === 'libre') {
    const mejor = opciones[0];
    return mejor
      ? `Eligió Libre; su mejor opción era ${TRABAJOS[mejor.trabajo]?.nombre || mejor.trabajo} (${formatearPuntaje(mejor.puntaje)})`
      : 'Eligió Libre';
  }

  const elegida = opciones.find((opcion) => opcion.trabajo === decision.elegida);
  if (!elegida) return `Eligió ${TRABAJOS[decision.elegida]?.nombre || decision.elegida}`;
  const alternativa = opciones
    .filter((opcion) => opcion.trabajo !== elegida.trabajo)
    .reduce((mejor, opcion) => (!mejor || opcion.puntaje > mejor.puntaje ? opcion : mejor), null);
  const nombreElegida = TRABAJOS[elegida.trabajo]?.nombre || elegida.trabajo;
  if (!alternativa) return `Eligió ${nombreElegida} (${formatearPuntaje(elegida.puntaje)})`;
  const nombreAlternativa = TRABAJOS[alternativa.trabajo]?.nombre || alternativa.trabajo;
  return `Eligió ${nombreElegida} (${formatearPuntaje(elegida.puntaje)}) sobre ${nombreAlternativa} (${formatearPuntaje(alternativa.puntaje)})`;
}

const TarjetaAldeano = memo(function TarjetaAldeano({ aldeano, indice, indiceAldea, nombreRasgo, razon, aporte, onAbrir }) {
  const trabajo = TRABAJOS[aldeano.trabajo || 'libre'] || TRABAJOS.libre;
  const trabajoActual = aldeano.modoTrabajo === 'automatico'
    ? `Auto · ${trabajo.nombre}`
    : trabajo.nombre;
  const abrir = useCallback(() => onAbrir(aldeano, indiceAldea), [aldeano, indiceAldea, onAbrir]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir opciones de ${aldeano.nombre || 'aldeano'}. ${trabajoActual}. ${razon}`}
      accessibilityHint="Abre el oficio y los detalles del aldeano"
      hitSlop={8}
      style={styles.card}
      onPress={abrir}
    >
      <PixelPanel variant="normal" style={styles.pixelCard}>
      <View style={styles.avatar}><AvatarAldeano aldeano={aldeano} indice={indice} size={54} /></View>
      <View style={styles.cardInfo}>
        <View style={styles.cardTitle}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{aldeano.nombre}</Text>
          <View style={[styles.badge, aldeano.modoTrabajo === 'automatico' && styles.badgeAuto]}>
            <Text style={styles.badgeText}>{aldeano.modoTrabajo === 'automatico' ? 'Auto' : 'Manual'}</Text>
          </View>
        </View>
        <Text style={styles.trait}>{nombreRasgo}</Text>
        <View style={styles.currentJob}><AppIcon name={trabajo.icono} size={16} color={theme.colors.acento} /><Text style={styles.jobText}>{trabajoActual}</Text></View>
        <Text style={styles.reason} numberOfLines={1}>{razon}</Text>
        <Text style={styles.reason} numberOfLines={1}>{aldeano.pensamientoActual || aldeano.estadoVida || 'Descansando en la aldea'}</Text>
        <Text style={styles.contribution}>{aporte}</Text>
      </View>
      <AppIcon name="chevron-right" size={22} color={theme.colors.textoSecundario} />
      </PixelPanel>
    </Pressable>
  );
}, (anterior, siguiente) => (
  anterior.indice === siguiente.indice
  && anterior.indiceAldea === siguiente.indiceAldea
  && anterior.nombreRasgo === siguiente.nombreRasgo
  && anterior.razon === siguiente.razon
  && anterior.aporte === siguiente.aporte
  && anterior.onAbrir === siguiente.onAbrir
  && anterior.aldeano._id === siguiente.aldeano._id
  && anterior.aldeano.nombre === siguiente.aldeano.nombre
  && anterior.aldeano.rasgo === siguiente.aldeano.rasgo
  && anterior.aldeano.trabajo === siguiente.aldeano.trabajo
  && anterior.aldeano.modoTrabajo === siguiente.aldeano.modoTrabajo
  && anterior.aldeano.decision === siguiente.aldeano.decision
));

export default function AldeanosTab() {
  const game = useGame();
  const router = useRouter();
  const [filtro, setFiltro] = useState('todos');
  const [seleccionado, setSeleccionado] = useState(null);
  const [opcionExpandida, setOpcionExpandida] = useState(null);
  const [cronicaAldeanos, setCronicaAldeanos] = useState(() => aldeanosStore.getCronica());
  const aldeanos = game.aldea?.aldeanos || SIN_ALDEANOS;
  useEffect(() => aldeanosStore.subscribe(() => setCronicaAldeanos(aldeanosStore.getCronica())), []);

  const contadores = aldeanos.reduce((total, aldeano) => {
    const oficio = aldeano.trabajo || 'libre';
    total[oficio] = (total[oficio] || 0) + 1;
    return total;
  }, { lenador: 0, agricultor: 0, minero: 0, guardia: 0, libre: 0 });

  const visibles = useMemo(
    () => (filtro === 'todos' ? aldeanos : aldeanos.filter((aldeano) => (aldeano.trabajo || 'libre') === filtro)),
    [aldeanos, filtro]
  );

  const ponerTodosAuto = () => {
    game.ponerTodosAuto();
  };

  const abrirAldea = useCallback((aldeano, indice) => {
    router.push({ pathname: '/', params: { villager: String(aldeano._id || aldeano.id || indice) } });
    setSeleccionado({ aldeano, indice });
    const elegida = aldeano.decision?.elegida;
    setOpcionExpandida(elegida && elegida !== 'libre'
      ? elegida
      : aldeano.decision?.opciones?.[0]?.trabajo || null);
  }, [router]);

  const nombreRasgo = (aldeano) => game.catalogo.rasgosAldeano?.[aldeano.rasgo]?.nombre || 'Polivalente';
  const efectoRasgo = (aldeano) => {
    const rasgo = game.catalogo.rasgosAldeano?.[aldeano.rasgo] || game.catalogo.rasgosAldeano?.polivalente;
    if (!rasgo) return 'Sin efecto especial';
    const porcentaje = Math.round((rasgo.bono || 0) * 100);
    if (porcentaje === 0) return 'Sin bonificación de oficio';
    const oficio = rasgo.trabajo ? TRABAJOS[rasgo.trabajo]?.nombre : 'todos los oficios';
    return `+${porcentaje}% de producción en ${oficio}`;
  };

  const renderAldea = ({ item, index }) => {
    const indiceAldea = aldeanos.findIndex((aldeano) => (
      aldeano === item || (item._id && aldeano._id === item._id)
    ));
    return (
      <TarjetaAldeano
        aldeano={item}
        indice={index}
        indiceAldea={indiceAldea >= 0 ? indiceAldea : index}
        nombreRasgo={nombreRasgo(item)}
        razon={item.modoTrabajo === 'automatico' ? razonPrincipal(item.decision, game.catalogo) : 'Tú decidiste su oficio'}
        aporte={aportePorOficio(item, game.aldea, game.catalogo, game.capacidades)}
        onAbrir={abrirAldea}
      />
    );
  };

  const comidaActual = game.aldea.recursos?.comida || 0;
  const umbral = game.aldea.umbralPoblacion || 0;
  const progreso = umbral > 0 ? Math.min(100, Math.round((comidaActual / umbral) * 100)) : 0;

  const header = (
    <>
      <Text style={styles.title}>Aldeanos</Text>
      <Text style={styles.subtitle}>{aldeanos.length} de {game.aldea.poblacionMaxima} habitantes</Text>

      <View style={styles.chronicleCard}>
        <Text style={styles.chronicleTitle}>Crónica de la aldea</Text>
        {cronicaAldeanos.length ? cronicaAldeanos.slice().reverse().slice(0, 50).map((entrada, indice) => (
          <View key={`${entrada.fecha}-${indice}`} style={styles.chronicleEntry}>
            {entrada.aldeano || entrada.tipo === 'aldeano' ? (
              <AvatarAldeano aldeano={{ nombre: entrada.texto.replace(/^Llegó\s+/i, '') }} indice={indice} size={32} />
            ) : <View style={styles.chronicleDot} />}
            <Text style={styles.chronicleText}>{entrada.texto}</Text>
          </View>
        )) : <Text style={styles.chronicleEmpty}>La historia de los aldeanos empieza aquí.</Text>}
      </View>

      {!aldeanos.length ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><AppIcon name="account-plus" size={30} /></View>
          <Text style={styles.emptyTitle}>Todavía no llegan aldeanos</Text>
          <Text style={styles.emptyText}>Junta comida para atraer al siguiente aldeano a la aldea.</Text>
          <View style={styles.progressHeading}><Text style={styles.progressLabel}>Próximo aldeano</Text><Text style={styles.progressValue}>{Math.floor(comidaActual)} / {Math.ceil(umbral)} comida</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progreso}%` }]} /></View>
        </View>
      ) : null}

      {aldeanos.length ? <>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumen de oficios</Text>
          <Text style={styles.summaryText}>Leñadores {contadores.lenador} · Agricultores {contadores.agricultor} · Mineros {contadores.minero} · Guardias {contadores.guardia} · Libres {contadores.libre}</Text>
          <Pressable accessibilityRole="button" style={styles.autoButton} onPress={ponerTodosAuto}><AppIcon name="robot-outline" size={18} color={theme.colors.superficie} /><Text style={styles.autoButtonText}>Poner a todos en Auto</Text></Pressable>
        </View>

        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const activo = filtro === item;
            const nombre = item === 'todos' ? 'Todos' : TRABAJOS[item].nombre;
            const icono = item === 'todos' ? 'account-group' : TRABAJOS[item].icono;
            return <Pressable accessibilityRole="button" accessibilityLabel={`Filtrar por ${nombre}`} accessibilityState={{ selected: activo }} hitSlop={8} style={[styles.filter, activo && styles.filterActive]} onPress={() => setFiltro(item)}><AppIcon name={icono} size={16} color={activo ? theme.colors.superficie : theme.colors.textoSecundario} /><Text style={[styles.filterText, activo && styles.filterTextActive]}>{nombre}</Text></Pressable>;
          }}
          style={styles.filterList}
        />
      </> : null}
    </>
  );

  const seleccionarTrabajo = (trabajo) => {
    if (!seleccionado) return;
    game.asignarTrabajo(seleccionado.indice, trabajo);
    setSeleccionado(null);
  };

  const aldeanoSeleccionado = seleccionado
    ? aldeanos.find((aldeano) => aldeano._id && aldeano._id === seleccionado.aldeano._id)
      || aldeanos[seleccionado.indice]
      || seleccionado.aldeano
    : null;
  const decisionSeleccionada = aldeanoSeleccionado?.decision;
  const opcionesDecision = decisionSeleccionada?.opciones || [];
  const opcionActiva = opcionesDecision.find((opcion) => opcion.trabajo === opcionExpandida);
  const puntajeMaximo = Math.max(1, ...opcionesDecision.map((opcion) => opcion.puntaje));
  const resumenDecision = resumirDecision(decisionSeleccionada);

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibles}
        keyExtractor={(item, index) => `${item.nombre}-${index}`}
        ListHeaderComponent={header}
        renderItem={renderAldea}
        contentContainerStyle={[styles.listContent, { maxWidth: 960, width: '100%', alignSelf: 'center' }]}
        ListEmptyComponent={aldeanos.length ? <Text style={styles.noResults}>No hay aldeanos en este oficio.</Text> : null}
      />

      <Modal visible={Boolean(seleccionado)} transparent animationType="slide" onRequestClose={() => setSeleccionado(null)}>
        <View style={styles.modalBackdrop} onTouchEnd={() => setSeleccionado(null)}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator
            onTouchEnd={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />
            {aldeanoSeleccionado ? <>
              <Text style={styles.sheetName} numberOfLines={2} ellipsizeMode="tail">{aldeanoSeleccionado.nombre}</Text>
              <Text style={styles.thought}>“{aldeanoSeleccionado.pensamientoActual || 'Disfrutando del poblado.'}”</Text>
              <Text style={styles.sheetSection}>Rasgo: {nombreRasgo(aldeanoSeleccionado)}</Text>
              <Text style={styles.traitEffect}>{efectoRasgo(aldeanoSeleccionado)}</Text>

              <Text style={styles.sheetSection}>Por qué lo hizo</Text>
              {aldeanoSeleccionado.modoTrabajo === 'manual' ? (
                <Text accessibilityLabel="Tú decidiste su oficio" style={styles.decisionMessage}>Tú decidiste su oficio</Text>
              ) : !decisionSeleccionada ? (
                <Text style={styles.decisionMessage}>Aún no ha decidido nada</Text>
              ) : (
                <View style={styles.analysis}>
                  <Text accessible accessibilityRole="text" accessibilityLabel={resumenDecision} style={styles.decisionSummary}>
                    {resumenDecision}
                  </Text>
                  {opcionesDecision.map((opcion) => {
                    const nombre = TRABAJOS[opcion.trabajo]?.nombre || opcion.trabajo;
                    const elegida = !decisionSeleccionada.libre && decisionSeleccionada.elegida === opcion.trabajo;
                    const expandida = opcionActiva?.trabajo === opcion.trabajo;
                    const ancho = Math.max(0, Math.min(100, (opcion.puntaje / puntajeMaximo) * 100));
                    const desglose = FACTORES
                      .filter((factor) => Number(opcion.factores?.[factor.id] || 0) !== 0)
                      .map((factor) => {
                        const valor = opcion.factores[factor.id];
                        const signo = valor < 0 ? '−' : '+';
                        return `${factor.nombre} ${signo}${formatearPuntaje(Math.abs(valor))}`;
                      })
                      .join(' · ');

                    return (
                      <View key={opcion.trabajo} style={styles.optionBlock}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${nombre}, puntaje ${formatearPuntaje(opcion.puntaje)}${elegida ? ', opción elegida' : ''}`}
                          accessibilityState={{ selected: elegida, expanded: expandida }}
                          style={[styles.scoreOption, elegida && styles.scoreOptionSelected]}
                          onPress={() => setOpcionExpandida(opcion.trabajo)}
                        >
                          <View style={styles.scoreHeading}>
                            <View style={styles.scoreNameGroup}>
                              <AppIcon name={TRABAJOS[opcion.trabajo]?.icono || 'briefcase-outline'} size={16} color={elegida ? theme.colors.acento : theme.colors.textoSecundario} />
                              <Text style={styles.scoreName}>{nombre}</Text>
                              {elegida ? <Text style={styles.chosenTag}>Elegida</Text> : null}
                            </View>
                            <Text style={[styles.scoreValue, elegida && styles.scoreValueSelected]}>{formatearPuntaje(opcion.puntaje)}</Text>
                          </View>
                          <View style={styles.scoreTrack}>
                            <View style={[styles.scoreFill, elegida && styles.scoreFillSelected, { width: `${ancho}%` }]} />
                          </View>
                        </Pressable>
                        {expandida ? (
                          <View accessible accessibilityLabel={`Factores de ${nombre}: ${desglose || 'sin factores con valor'}`} style={styles.factorList}>
                            {FACTORES.filter((factor) => Number(opcion.factores?.[factor.id] || 0) !== 0).map((factor) => {
                              const valor = opcion.factores[factor.id];
                              const signo = valor < 0 ? '−' : '+';
                              return (
                                <View key={factor.id} style={styles.factorItem}>
                                  <AppIcon name={factor.icono} size={16} color={theme.colors.textoSecundario} />
                                  <Text style={styles.factorText} accessibilityLabel={`${factor.nombre} ${signo}${formatearPuntaje(Math.abs(valor))}`}>
                                    {factor.nombre} {signo}{formatearPuntaje(Math.abs(valor))}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.sheetSection}>Asignar oficio</Text>

              {Object.entries(TRABAJOS).map(([id, trabajo]) => {
                if (id === 'automatico') {
                  return <Pressable key={id} accessibilityRole="button" style={[styles.jobOption, aldeanoSeleccionado.modoTrabajo === 'automatico' && styles.jobOptionActive]} onPress={() => seleccionarTrabajo(id)}><View style={styles.jobIcon}><AppIcon name={trabajo.icono} size={20} /></View><View style={styles.jobOptionInfo}><Text style={styles.jobOptionName}>{trabajo.nombre}</Text><Text style={styles.jobOptionDetail}>El aldeano decide solo según las necesidades</Text></View>{aldeanoSeleccionado.modoTrabajo === 'automatico' ? <AppIcon name="check" size={20} color={theme.colors.acento} /> : null}</Pressable>;
                }
                const temporal = { ...aldeanoSeleccionado, trabajo: id, modoTrabajo: 'manual' };
                const aporte = id === 'libre' ? 'Sin oficio asignado' : aportePorOficio(temporal, game.aldea, game.catalogo, game.capacidades);
                const activo = aldeanoSeleccionado.modoTrabajo === 'manual' && aldeanoSeleccionado.trabajo === id;
                return <Pressable key={id} accessibilityRole="button" style={[styles.jobOption, activo && styles.jobOptionActive]} onPress={() => seleccionarTrabajo(id)}><View style={styles.jobIcon}><AppIcon name={trabajo.icono} size={20} /></View><View style={styles.jobOptionInfo}><Text style={styles.jobOptionName}>{trabajo.nombre}</Text><Text style={styles.jobOptionDetail}>{aporte}</Text></View>{activo ? <AppIcon name="check" size={20} color={theme.colors.acento} /> : null}</Pressable>;
              })}
            </> : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.fondo },
  listContent: { padding: theme.spacing[16], paddingBottom: theme.spacing[32] },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario },
  subtitle: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginBottom: theme.spacing[12] },
  chronicleCard: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[12], marginBottom: theme.spacing[12] },
  chronicleTitle: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, marginBottom: 8 },
  chronicleEntry: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  chronicleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.acento },
  chronicleText: { flex: 1, color: theme.colors.textoSecundario },
  chronicleEmpty: { color: theme.colors.textoSecundario },
  summary: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[12], marginBottom: theme.spacing[8] },
  summaryTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  summaryText: { color: theme.colors.textoSecundario, fontSize: 14, lineHeight: 20, marginTop: 4 },
  autoButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: theme.spacing[12], borderRadius: theme.radius[10], backgroundColor: theme.colors.acento },
  autoButtonText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  filterList: { flexGrow: 0, marginBottom: theme.spacing[8] }, filters: { gap: theme.spacing[8], paddingVertical: theme.spacing[8] },
  filter: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: theme.spacing[12], borderRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.superficie },
  filterActive: { backgroundColor: theme.colors.acento, borderColor: theme.colors.acento }, filterText: { color: theme.colors.textoSecundario, fontSize: 14, fontWeight: theme.typography.weights.semibold }, filterTextActive: { color: theme.colors.superficie },
  card: { minHeight: 106, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[12], marginBottom: theme.spacing[8] },
  pixelCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  avatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, marginRight: theme.spacing[12], overflow: 'hidden' },
  cardInfo: { flex: 1 }, cardTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, name: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, trait: { color: theme.colors.acento, fontSize: 14, marginTop: 2 },
  badge: { borderRadius: theme.radius[6], borderWidth: 1, borderColor: theme.colors.borde, paddingHorizontal: 7, paddingVertical: 3 }, badgeAuto: { borderColor: theme.colors.acento }, badgeText: { color: theme.colors.textoSecundario, fontSize: 12, fontWeight: theme.typography.weights.bold },
  currentJob: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }, jobText: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.semibold }, reason: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: 3 }, contribution: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: 4 },
  empty: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[16], alignItems: 'center' }, emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta, marginBottom: theme.spacing[12] }, emptyTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold }, emptyText: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, textAlign: 'center', marginTop: theme.spacing[8] },
  progressHeading: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing[16] }, progressLabel: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold }, progressValue: { color: theme.colors.textoSecundario, fontSize: 14 }, progressTrack: { alignSelf: 'stretch', height: 8, borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta, overflow: 'hidden', marginTop: 6 }, progressFill: { height: '100%', backgroundColor: theme.colors.acento },
  noResults: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, textAlign: 'center', paddingVertical: theme.spacing[24] }, message: { color: theme.colors.textoPrimario, backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12], borderRadius: theme.radius[10], marginTop: theme.spacing[8], fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }, sheet: { maxHeight: '82%', backgroundColor: theme.colors.superficie, borderTopLeftRadius: theme.radius[16], borderTopRightRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde }, sheetContent: { padding: theme.spacing[16], paddingBottom: theme.spacing[24] }, handle: { width: 44, height: 4, borderRadius: theme.radius[6], alignSelf: 'center', backgroundColor: theme.colors.placeholder, marginBottom: theme.spacing[12] },
  sheetName: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.heavy }, thought: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[8], marginBottom: theme.spacing[12], fontStyle: 'italic' },
  sheetSection: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[8] }, traitEffect: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: 4, marginBottom: theme.spacing[8] },
  analysis: { marginTop: theme.spacing[8] }, decisionMessage: { color: theme.colors.textoPrimario, backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12], borderRadius: theme.radius[10], marginTop: theme.spacing[8], fontSize: 14, lineHeight: 20 }, decisionSummary: { color: theme.colors.textoPrimario, fontSize: 14, lineHeight: 20, marginBottom: theme.spacing[4] },
  optionBlock: { marginTop: theme.spacing[8] }, scoreOption: { minHeight: 50, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], paddingHorizontal: theme.spacing[12], paddingVertical: theme.spacing[8] }, scoreOptionSelected: { borderColor: theme.colors.acento, backgroundColor: theme.colors.superficieAlta }, scoreHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[8], marginBottom: theme.spacing[8] }, scoreNameGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] }, scoreName: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.semibold, flexShrink: 1 }, chosenTag: { color: theme.colors.acento, fontSize: 14, fontWeight: theme.typography.weights.bold }, scoreValue: { color: theme.colors.textoSecundario, fontSize: 14, fontVariant: ['tabular-nums'] }, scoreValueSelected: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold }, scoreTrack: { height: 8, borderRadius: theme.radius[6], overflow: 'hidden', backgroundColor: theme.colors.fondo }, scoreFill: { height: '100%', backgroundColor: theme.colors.textoSecundario }, scoreFillSelected: { backgroundColor: theme.colors.acento },
  factorList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing[12], rowGap: theme.spacing[8], paddingHorizontal: theme.spacing[12], paddingVertical: theme.spacing[8] }, factorItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] }, factorText: { color: theme.colors.textoSecundario, fontSize: 14, lineHeight: 20 },
  jobOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], padding: theme.spacing[12], marginTop: theme.spacing[8] }, jobOptionActive: { borderColor: theme.colors.acento, backgroundColor: theme.colors.superficieAlta }, jobIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta, marginRight: theme.spacing[12] }, jobOptionInfo: { flex: 1 }, jobOptionName: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, jobOptionDetail: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: 2 },
});
