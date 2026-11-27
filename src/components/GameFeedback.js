import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../theme';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { useHapticsFeedback } from '../context/HapticsContext';
import { AppIcon, RESOURCE_ICONS, ResourceIcon } from './icons';
import { estacionEn } from '../game/tiempo';
import { useSonido } from '../servicios/sonidos';
import { EventoModal, ICONOS_EVENTO, TITULOS_EVENTO } from './EventoModal';
import { armarInformeAusencia } from '../game/informeAusencia';
import { VueloRecurso } from './VueloRecurso';
import { ContadorAnimado } from './ContadorAnimado';
import { CelebracionParticulas } from './CelebracionParticulas';

const LAST_ACTIVE_KEY = 'vilai_last_active';

export function GameFeedback() {
  const game = useGame();
  const toast = useToast();
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const ultimoMensaje = useRef('');
  const [offlineVisible, setOfflineVisible] = useState(false);
  const offlineHandled = useRef(false);
  const logrosAnteriores = useRef(null);
  const logrosNotificados = useRef(new Set());
  const reliquiasAnteriores = useRef(null);
  const ultimaEdad = useRef(game.aldea?.edad?.id);
  const ultimoEventoPrevisto = useRef('');
  const ultimaEstacion = useRef(estacionEn(game.aldea?.ciclo?.segundos || 0).id);
  const [celebracion, setCelebracion] = useState(false);
  const edadIdActual = game.aldea?.edad?.id;
  const segundosActuales = game.aldea?.ciclo?.segundos || 0;
  const reliquiasActuales = game.aldea?.legado?.reliquias;

  useEffect(() => {
    const logros = game.aldea?.logros;
    if (!Array.isArray(logros)) return;
    const idsActuales = new Set(logros.map((logro) => logro.id));
    const idsNuevos = logrosAnteriores.current === null
      ? []
      : [...idsActuales].filter((id) => !logrosAnteriores.current.has(id));
    logrosAnteriores.current = idsActuales;
    const logrosOffline = new Set(game.resumenOffline?.logrosDesbloqueados || []);
    const nombres = new Map((game.catalogo?.logros || []).map((logro) => [logro.id, logro.nombre]));
    const segundosAusente = Number(game.resumenOffline?.segundosAusente || 0);
    const logrosCortosOffline = segundosAusente <= 60 ? [...logrosOffline].filter((id) => idsActuales.has(id)) : [];
    const notificar = [...new Set([
      ...idsNuevos.filter((id) => !logrosOffline.has(id)),
      ...logrosCortosOffline,
    ])].filter((id) => !logrosNotificados.current.has(id));
    notificar.forEach((id) => {
      logrosNotificados.current.add(id);
      toast.showToast(`¡Logro desbloqueado: ${nombres.get(id) || id}!`, 'success');
      haptics.success();
      sonido.reproducir('edad nueva');
    });
    if (notificar.length) {
      setTimeout(() => setCelebracion(true), 0);
    }
  }, [game.aldea?.logros, game.catalogo?.logros, game.resumenOffline?.logrosDesbloqueados, game.resumenOffline?.segundosAusente, toast, haptics, sonido]);

  useEffect(() => {
    if (!edadIdActual) return;
    const edadId = edadIdActual;
    if (edadId && ultimaEdad.current && ultimaEdad.current !== edadId) {
      const edad = game.catalogo?.edades?.[edadId];
      if (edad) {
        toast.showToast(`Comienza ${edad.nombre}: ${edad.descripcion}`, 'info');
        sonido.reproducir('edad nueva');
        haptics.medium();
        setTimeout(() => setCelebracion(true), 0);
      }
    }
    ultimaEdad.current = edadId;

    const estacionId = estacionEn(segundosActuales).id;
    if (ultimaEstacion.current && ultimaEstacion.current !== estacionId) {
      const nombres = { primavera: 'la primavera', verano: 'el verano', otoño: 'el otoño', invierno: 'el invierno' };
      const efectos = { primavera: 'la cosecha florece', verano: 'la madera rinde más', otoño: 'la cosecha rinde más', invierno: 'la producción disminuye' };
      toast.showToast(`Llega ${nombres[estacionId]}: ${efectos[estacionId]}.`, 'info');
      sonido.reproducir('evento');
    }
    ultimaEstacion.current = estacionId;
  }, [edadIdActual, segundosActuales, game.catalogo, toast, haptics, sonido]);

  useEffect(() => {
    const previsto = game.aldea?.eventoPrevisto;
    if (!previsto?.tipo) {
      ultimoEventoPrevisto.current = '';
      return;
    }
    const clave = `${previsto.tipo}:${previsto.dia}`;
    if (ultimoEventoPrevisto.current === clave) return;
    ultimoEventoPrevisto.current = clave;
    const nombre = game.catalogo?.eventosNocturnos?.[previsto.tipo]?.nombre || previsto.tipo;
    toast.showToast(`Aviso de la torre: ${nombre} en ${Math.max(0, Number(previsto.segundosRestantes) || 0)} s.`, 'warning');
    haptics.medium();
  }, [game.aldea?.eventoPrevisto, game.catalogo?.eventosNocturnos, toast, haptics]);

  useEffect(() => {
    if (reliquiasActuales == null) return;
    const reliquias = Math.max(0, Number(reliquiasActuales) || 0);
    const anteriores = reliquiasAnteriores.current;
    if (anteriores !== null && reliquias > anteriores) {
      const nuevas = reliquias - anteriores;
      toast.showToast(
        nuevas === 1
          ? '¡Se halló una reliquia entre las ruinas!'
          : `¡Se hallaron ${nuevas} reliquias entre las ruinas!`,
        'success'
      );
      haptics.medium();
    }
    reliquiasAnteriores.current = reliquias;
  }, [reliquiasActuales, toast, haptics]);

  useEffect(() => {
    if (!game.mensaje || game.mensaje === ultimoMensaje.current) return;
    ultimoMensaje.current = game.mensaje;
    const lower = game.mensaje.toLower
      ? game.mensaje.toLowerCase() : '';
    const esInvestigacion = (game.catalogo?.arbol || []).some((nodo) => lower.includes(nodo.nombre.toLowerCase()));
    const type = lower.includes('faltan') || lower.includes('suficient') || lower.includes('error') ? 'warning' : esInvestigacion || lower.includes('construid') || lower.includes('mejorad') || lower.includes('reparad') || lower.includes('resistió') || lower.includes('unió') ? 'success' : 'info';
    const nombreLlegado = lower.includes('se unió') ? game.mensaje.match(/¡(.+?) se unió/i)?.[1] : null;
    const aldeanoLlegado = nombreLlegado ? (game.aldea?.aldeanos || []).find((aldeano) => aldeano.nombre === nombreLlegado) : null;
    toast.showToast(game.mensaje, type, aldeanoLlegado);
    if (esInvestigacion) haptics.medium();
    else if (lower.includes('unió')) {
      haptics.medium();
      sonido.reproducir('aldeano');
    }
    else if (type === 'success') haptics.success();
    if (type === 'warning') haptics.error();
  }, [game.mensaje, game.catalogo, game.aldea?.aldeanos, toast, haptics, sonido]);

  useEffect(() => {
    if (game.mensaje && /investigaci/i.test(game.mensaje)) {
      const temporizador = setTimeout(() => setCelebracion(true), 0);
      return () => clearTimeout(temporizador);
    }
    return undefined;
  }, [game.mensaje]);

  useEffect(() => {
    if (!game.resumenOffline || offlineHandled.current) return;
    if (!armarInformeAusencia({ resumenTiempo: game.resumenTiempo, resumenOffline: game.resumenOffline }).mostrar) return;
    offlineHandled.current = true;
    const temporizador = setTimeout(() => setOfflineVisible(true), 0);
    return () => clearTimeout(temporizador);
  }, [game.resumenOffline, game.resumenTiempo]);

  useEffect(() => {
    if (!offlineVisible || !game.resumenOffline?.logrosDesbloqueados?.length) return;
    haptics.success();
    sonido.reproducir('edad nueva');
    const temporizador = setTimeout(() => setCelebracion(true), 0);
    return () => clearTimeout(temporizador);
  }, [offlineVisible, game.resumenOffline?.logrosDesbloqueados, haptics, sonido]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    });
    AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    return () => subscription.remove();
  }, []);

  const [colaEventos, setColaEventos] = useState([]);
  const [eventoActual, setEventoActual] = useState(null);
  const [vuelo, setVuelo] = useState(null);
  const tipoEvento = game.aldea?.eventoNocturno?.tipo;

  useEffect(() => {
    if (!tipoEvento) return;
    const temporizador = setTimeout(() => {
      setColaEventos((actual) => {
        if (actual.some((item) => item.tipo === tipoEvento && item.ciclo === game.aldea.eventoNocturno.dia)) return actual;
        return [...actual, { tipo: tipoEvento, ciclo: game.aldea.eventoNocturno.dia }];
      });
    }, 0);
    return () => clearTimeout(temporizador);
  }, [tipoEvento, game.aldea?.eventoNocturno?.dia]);

  useEffect(() => {
    if (!eventoActual && colaEventos.length) {
      const temporizador = setTimeout(() => {
        setEventoActual(colaEventos[0]);
        setColaEventos((actual) => actual.slice(1));
      }, 0);
      return () => clearTimeout(temporizador);
    }
    return undefined;
  }, [colaEventos, eventoActual]);

  const resolverEvento = (defender) => {
    const anteriores = { ...(game.aldea?.recursos || {}) };
    const actualizada = game.resolverEventoNocturno(defender);
    const actuales = { ...(actualizada?.recursos || game.aldea?.recursos || {}) };
    const cambios = {};
    Object.keys({ ...anteriores, ...actuales }).forEach((recurso) => {
      const diferencia = Number(actuales[recurso] || 0) - Number(anteriores[recurso] || 0);
      if (diferencia) cambios[recurso] = diferencia;
    });
    if (Object.keys(cambios).length) setVuelo(cambios);
    setEventoActual(null);
  };


  const tipoModal = eventoActual?.tipo || tipoEvento;
  const eventoModal = game.catalogo?.eventosNocturnos?.[tipoModal];
  const costoModal = eventoModal?.costoDefensa || {};
  const puedeDefender = Object.entries(costoModal).every(([recurso, cantidad]) => (game.aldea.recursos?.[recurso] || 0) >= cantidad);

  return <>
    {game.error?.startsWith('Sin conexión') ? <View style={styles.network}><AppIcon name="wifi-off" size={16} color={theme.colors.aviso} /><Text style={styles.networkText}>{game.error}</Text></View> : null}
    <EventoModal
      visible={Boolean(eventoActual && eventoModal)}
      tipo={tipoModal}
      evento={eventoModal}
      recursos={game.aldea?.recursos || {}}
      puedeDefender={puedeDefender}
      onDefender={() => resolverEvento(true)}
      onAceptar={() => resolverEvento(false)}
    />
    {vuelo ? <VueloRecurso cambios={vuelo} onTerminar={() => setVuelo(null)} /> : null}
    <CelebracionParticulas activo={celebracion} onTerminar={() => setCelebracion(false)} />
    <OfflineModal
      visible={offlineVisible}
      informe={armarInformeAusencia({ resumenTiempo: game.resumenTiempo, resumenOffline: game.resumenOffline, aldea: game.aldea })}
      catalogo={game.catalogo}
      onRecoger={() => {
        setOfflineVisible(false);
        setVuelo({ ...game.resumenOffline.recursosGenerados });
      }}
    />
  </>;
}

const ICONO_POBLACION = { aldeano: 'account-plus', nacimiento: 'baby-carriage', fallecimiento: 'grave-stone' };

function SeccionInforme({ titulo, children }) {
  return (
    <View style={styles.informeSeccion}>
      <Text accessibilityRole="header" style={styles.informeSeccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function LineaInforme({ icono, color = theme.colors.acento, children }) {
  return (
    <View style={styles.informeLinea}>
      <AppIcon name={icono} size={18} color={color} />
      <Text style={styles.informeTexto}>{children}</Text>
    </View>
  );
}

// Informe "Mientras no estabas": arma las secciones con armarInformeAusencia y
// oculta las que no tienen nada que contar.
function OfflineModal({ visible, informe, catalogo, onRecoger }) {
  const insets = useSafeAreaInsets();
  const nombresLogros = new Map((catalogo?.logros || []).map((logro) => [logro.id, logro.nombre]));
  const hayHechos = informe.evento || informe.reliquias.length || informe.investigaciones.length || informe.logros.length;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onRecoger}>
      <View style={[styles.informe, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView contentContainerStyle={styles.informeContenido}>
          <AppIcon name="book-open-page-variant" size={36} color={theme.colors.acento} />
          <Text accessibilityRole="header" style={styles.offlineTitle}>Mientras no estabas</Text>
          <Text style={styles.offlineTime}>Estuviste ausente {informe.tiempo}.</Text>

          <SeccionInforme titulo="El tiempo">
            <LineaInforme icono="calendar-clock">
              {informe.anios > 0 ? `Pasaron ${informe.anios} año${informe.anios === 1 ? '' : 's'} en la aldea.` : 'No alcanzó a pasar un año completo.'}
            </LineaInforme>
            {informe.cambioEdad ? <LineaInforme icono="weather-sunset">La aldea dejó atrás la {informe.cambioEdad.de} y entró en la {informe.cambioEdad.a}.</LineaInforme> : null}
            {informe.edades.map((c, i) => <LineaInforme key={`e${i}`} icono="weather-sunset-up">Año {c.anio}: {c.texto}.</LineaInforme>)}
            {informe.alcanzoTope8h ? <LineaInforme icono="timer-sand-complete" color={theme.colors.aviso}>Se alcanzó el límite de 8 horas de progreso.</LineaInforme> : null}
          </SeccionInforme>

          {hayHechos ? (
            <SeccionInforme titulo="Lo que ocurrió">
              {informe.evento ? (
                <LineaInforme icono={ICONOS_EVENTO[informe.evento.tipo] || 'weather-lightning'} color={theme.colors.aviso}>
                  Te espera un evento: {TITULOS_EVENTO[informe.evento.tipo] || informe.evento.tipo}{informe.evento.anio ? ` (año ${informe.evento.anio})` : ''}.
                </LineaInforme>
              ) : null}
              {informe.reliquias.length === 1 ? <LineaInforme icono="diamond-stone">Año {informe.reliquias[0].anio}: {informe.reliquias[0].texto}.</LineaInforme> : null}
              {informe.reliquias.length > 1 ? (
                <LineaInforme icono="diamond-stone">
                  Se hallaron {informe.reliquias.length} reliquias entre las ruinas (años {informe.reliquias.map((c) => c.anio).join(', ')}).
                </LineaInforme>
              ) : null}
              {informe.investigaciones.map((c, i) => <LineaInforme key={`i${i}`} icono="flask">Año {c.anio}: {c.texto}.</LineaInforme>)}
              {informe.logros.map((id) => <LineaInforme key={id} icono="trophy">Logro desbloqueado: {nombresLogros.get(id) || id}.</LineaInforme>)}
            </SeccionInforme>
          ) : null}

          {informe.poblacion.length || informe.cambiosDeEtapa ? (
            <SeccionInforme titulo="Los aldeanos">
              {informe.poblacion.map((c, i) => (
                <LineaInforme key={`p${i}`} icono={ICONO_POBLACION[c.tipo]} color={c.tipo === 'fallecimiento' ? theme.colors.textoSecundario : theme.colors.exito}>
                  Año {c.anio}: {c.texto}.
                </LineaInforme>
              ))}
              {informe.cambiosDeEtapa ? <LineaInforme icono="account-arrow-up">{informe.cambiosDeEtapa} cambio{informe.cambiosDeEtapa === 1 ? '' : 's'} de etapa de vida.</LineaInforme> : null}
            </SeccionInforme>
          ) : null}

          {informe.recursos.length ? (
            <SeccionInforme titulo="Recursos que llegaron">
              <View style={styles.gains}>
                {informe.recursos.map(({ recurso, cantidad }) => (
                  <View key={recurso} style={styles.gain}>
                    <ResourceIcon resource={recurso} size={18} />
                    <ContadorAnimado value={cantidad} style={styles.gainText} formato={(valor) => `+${Math.round(valor)} ${RESOURCE_ICONS[recurso]?.label?.toLowerCase() || recurso}`} />
                  </View>
                ))}
              </View>
            </SeccionInforme>
          ) : null}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Recoger recursos y volver a la aldea" style={styles.offlineButton} onPress={onRecoger}>
          <Text style={styles.offlineButtonText}>Recoger</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  network: { position: 'absolute', top: 8, left: 12, right: 68, zIndex: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 32, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.aviso, backgroundColor: theme.colors.superficieAlta }, networkText: { color: theme.colors.aviso, fontSize: 14 },
  eventBanner: { backgroundColor: theme.colors.superficie, borderBottomWidth: 1, borderBottomColor: theme.colors.aviso, padding: 10 }, eventHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, eventCopy: { flex: 1 }, eventTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, eventDescription: { color: theme.colors.textoSecundario, fontSize: 14 }, eventActions: { flexDirection: 'row', gap: 8, marginTop: 8 }, defend: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento }, disabled: { opacity: 0.45 }, defendText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold }, accept: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde }, acceptText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  informe: { flex: 1, backgroundColor: theme.colors.fondo, paddingHorizontal: theme.spacing[16] }, informeContenido: { alignItems: 'center', paddingBottom: theme.spacing[16] }, informeSeccion: { alignSelf: 'stretch', marginTop: theme.spacing[16], padding: theme.spacing[16], gap: 8, backgroundColor: theme.colors.superficie, borderRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde }, informeSeccionTitulo: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, informeLinea: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, informeTexto: { flex: 1, color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, lineHeight: 22 }, offlineTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.heavy, marginTop: 8 }, offlineTime: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, textAlign: 'center', marginTop: 6 }, gains: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }, gain: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[6], paddingHorizontal: 8, paddingVertical: 6 }, gainText: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold }, offlineButton: { minHeight: 44, width: '100%', marginTop: theme.spacing[16], alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento }, offlineButtonText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
});