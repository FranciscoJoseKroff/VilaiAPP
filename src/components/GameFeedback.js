import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../theme';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { useHapticsFeedback } from '../context/HapticsContext';
import { AppIcon } from './icons';
import { estacionEn } from '../game/tiempo';
import { useSonido } from '../servicios/sonidos';
import { EventoModal } from './EventoModal';
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
  const reliquiasAnteriores = useRef(null);
  const ultimaEdad = useRef(game.aldea?.edad?.id);
  const ultimaEstacion = useRef(estacionEn(game.aldea?.ciclo?.segundos || 0).id);
  const [celebracion, setCelebracion] = useState(false);
  const edadIdActual = game.aldea?.edad?.id;
  const segundosActuales = game.aldea?.ciclo?.segundos || 0;
  const reliquiasActuales = game.aldea?.legado?.reliquias;

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
    const segundos = Number(game.resumenOffline.segundosAusente || 0);
    if (segundos <= 60) return;
    offlineHandled.current = true;
    const temporizador = setTimeout(() => setOfflineVisible(true), 0);
    return () => clearTimeout(temporizador);
  }, [game.resumenOffline]);

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
      resumen={game.resumenOffline}
      onRecoger={() => {
        setOfflineVisible(false);
        setVuelo({ ...game.resumenOffline.recursosGenerados });
      }}
    />
  </>;
}

function OfflineModal({ visible, resumen, onRecoger }) {
  const seconds = Number(resumen?.segundosAusente || resumen?.segundosAplicados || 0);
  const gains = resumen?.recursosGenerados || {};
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const time = hours > 0 ? `${hours} h${minutes ? ` ${minutes} min` : ''}` : minutes > 0 ? `${minutes} min` : 'menos de 1 min';
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.offlineBackdrop}><View style={styles.offlineModal}>
        <AppIcon name="clock-outline" size={32} color={theme.colors.acento} />
        <Text accessibilityRole="header" style={styles.offlineTitle}>¡Bienvenido de vuelta!</Text>
        <Text style={styles.offlineTime}>Estuviste ausente {time}.</Text>
        {resumen?.alcanzoTope8h ? <Text style={styles.offlineAge}>Se alcanzó el límite de 8 horas.</Text> : null}
        {Number(resumen?.aldeanosLlegados || 0) > 0 ? <Text style={styles.offlineAge}>{resumen.aldeanosLlegados} aldeano{resumen.aldeanosLlegados === 1 ? '' : 's'} llegó{resumen.aldeanosLlegados === 1 ? '' : 'ron'}.</Text> : null}
        <View style={styles.gains}>{Object.entries(gains).map(([resource, amount]) => <View key={resource} style={styles.gain}><AppIcon name={resource === 'madera' ? 'tree' : resource === 'comida' ? 'food-apple' : resource === 'oro' ? 'currency-usd' : 'package-variant'} size={18} color={theme.colors.acento} /><ContadorAnimado value={Number(amount)} style={styles.gainText} formato={(valor) => `+${Math.round(valor)} ${resource}`} /></View>)}</View>
        <Pressable accessibilityRole="button" style={styles.offlineButton} onPress={onRecoger}><Text style={styles.offlineButtonText}>Recoger</Text></Pressable>
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  offlineAge: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold, textAlign: 'center', marginTop: 8 },
  network: { position: 'absolute', top: 8, left: 12, right: 68, zIndex: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 32, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.aviso, backgroundColor: theme.colors.superficieAlta }, networkText: { color: theme.colors.aviso, fontSize: 14 },
  eventBanner: { backgroundColor: theme.colors.superficie, borderBottomWidth: 1, borderBottomColor: theme.colors.aviso, padding: 10 }, eventHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, eventCopy: { flex: 1 }, eventTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, eventDescription: { color: theme.colors.textoSecundario, fontSize: 14 }, eventActions: { flexDirection: 'row', gap: 8, marginTop: 8 }, defend: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento }, disabled: { opacity: 0.45 }, defendText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold }, accept: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde }, acceptText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  offlineBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.65)' }, offlineModal: { alignItems: 'center', backgroundColor: theme.colors.superficie, borderRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[24] }, offlineTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.heavy, marginTop: 8 }, offlineTime: { color: theme.colors.textoSecundario, fontSize: 14, textAlign: 'center', marginTop: 6 }, gains: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: theme.spacing[16] }, gain: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[6], paddingHorizontal: 8, paddingVertical: 6 }, gainText: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold }, offlineButton: { minHeight: 44, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento }, offlineButtonText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
});