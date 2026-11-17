import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { useHapticsFeedback } from '../../context/HapticsContext';
import { useSonido } from '../../servicios/sonidos';
import { setReducirAnimaciones, useReducedMotion } from '../../hooks/useReducedMotion';
import { apiFetch } from '../../api/client';
import { useCalidadGrafica } from '../../context/CalidadGraficaContext';
import { CALIDADES_GRAFICAS } from '../../game/calidadGrafica';
import { DiagnosticoPanel } from '../../components/DiagnosticoPanel';
import { HerramientasPartida } from '../../components/HerramientasPartida';

const NIVELES_VOLUMEN = ['bajo', 'medio', 'alto'];
const ESCENARIOS_PRESENTACION = [
  {
    id: 'aldea-viva',
    nombre: 'Aldea viva',
    descripcion: 'Año 25, ocho aldeanos automáticos, edificios, tecnologías y una crónica desarrollada.',
  },
  {
    id: 'invierno-helada',
    nombre: 'Invierno y helada',
    descripcion: 'Año 58 en la Edad del Hielo, con diez aldeanos y el invierno a 15 segundos.',
  },
  {
    id: 'cambio-de-edad',
    nombre: 'Cambio de edad',
    descripcion: 'La edad actual termina en unos 10 segundos; podrás ver la transición y recibir una reliquia.',
  },
];

export default function AjustesScreen() {
  const game = useGame();
  const calidadGrafica = useCalidadGrafica();
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const reducirAnimaciones = useReducedMotion();
  const [escenarioPendiente, setEscenarioPendiente] = useState(null);
  const [aplicandoEscenario, setAplicandoEscenario] = useState(false);
  const [errorEscenario, setErrorEscenario] = useState('');
  const [toquesVersion, setToquesVersion] = useState(0);
  const [accionDemoEnCurso, setAccionDemoEnCurso] = useState(false);
  const [perfilCargando, setPerfilCargando] = useState(true);
  const [apodo, setApodo] = useState('');
  const [apodoGuardado, setApodoGuardado] = useState('');
  const [rankingVisible, setRankingVisible] = useState(false);
  const [guardandoApodo, setGuardandoApodo] = useState(false);
  const [guardandoVisibilidad, setGuardandoVisibilidad] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [mensajePerfil, setMensajePerfil] = useState('');
  const toquesVersionRef = useRef({ cantidad: 0, ultimo: 0 });

  useEffect(() => {
    let activo = true;
    apiFetch('/auth/perfil', { token: game.token })
      .then(({ usuario }) => {
        if (!activo) return;
        const apodoActual = usuario.apodo || '';
        setApodo(apodoActual);
        setApodoGuardado(apodoActual);
        setRankingVisible(Boolean(usuario.rankingVisible));
      })
      .catch((error) => {
        if (activo) setErrorPerfil(error.message || 'No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (activo) setPerfilCargando(false);
      });
    return () => { activo = false; };
  }, [game.token]);

  const guardarApodo = async () => {
    if (guardandoApodo || !apodo.trim()) return;
    setGuardandoApodo(true);
    setErrorPerfil('');
    setMensajePerfil('');
    try {
      const resultado = await apiFetch('/auth/perfil', {
        method: 'PATCH',
        token: game.token,
        body: { apodo: apodo.trim() },
      });
      setApodo(resultado.usuario.apodo || '');
      setApodoGuardado(resultado.usuario.apodo || '');
      setMensajePerfil('Apodo actualizado.');
    } catch (error) {
      setErrorPerfil((error.message || 'No se pudo actualizar el apodo.').replace(/ \(\d+\)$/, ''));
    } finally {
      setGuardandoApodo(false);
    }
  };

  const cambiarVisibilidad = async (visible) => {
    if (guardandoVisibilidad) return;
    setGuardandoVisibilidad(true);
    setErrorPerfil('');
    setMensajePerfil('');
    try {
      const resultado = await apiFetch('/auth/perfil', {
        method: 'PATCH',
        token: game.token,
        body: { rankingVisible: visible },
      });
      setRankingVisible(Boolean(resultado.usuario.rankingVisible));
      setMensajePerfil(visible ? 'Ahora apareces en el ranking.' : 'Ya no apareces en el ranking.');
    } catch (error) {
      setErrorPerfil((error.message || 'No se pudo actualizar la visibilidad.').replace(/ \(\d+\)$/, ''));
    } finally {
      setGuardandoVisibilidad(false);
    }
  };

  const tocarVersion = () => {
    if (game.modoDemo) return;
    const ahora = Date.now();
    const toques = toquesVersionRef.current;
    toques.cantidad = ahora - toques.ultimo > 2500 ? 1 : toques.cantidad + 1;
    toques.ultimo = ahora;
    if (toques.cantidad >= 5) {
      toques.cantidad = 0;
      setToquesVersion(0);
      game.activarModoDemo();
      return;
    }
    setToquesVersion(toques.cantidad);
  };

  const ejecutarAccionDemo = async (accion) => {
    if (accionDemoEnCurso) return;
    setAccionDemoEnCurso(true);
    try {
      await accion();
    } finally {
      setAccionDemoEnCurso(false);
    }
  };

  const confirmarEscenario = async () => {
    if (!escenarioPendiente || aplicandoEscenario) return;
    setAplicandoEscenario(true);
    setErrorEscenario('');
    try {
      await game.aplicarEscenario(escenarioPendiente);
      setEscenarioPendiente(null);
      setAplicandoEscenario(false);
      router.replace('/');
    } catch (error) {
      setErrorEscenario(error.message || 'No se pudo aplicar el escenario.');
      setAplicandoEscenario(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Ajustes</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Perfil y ranking</Text>
        <Text style={styles.detail}>Se muestran tu apodo, puntuación y edad actual. Tu correo y otros datos personales nunca se publican.</Text>
        {perfilCargando ? (
          <ActivityIndicator color={theme.colors.acento} style={styles.profileLoading} />
        ) : (
          <>
            <Text style={styles.profileLabel}>Apodo (3–16 caracteres)</Text>
            <TextInput
              accessibilityLabel="Apodo para el ranking"
              autoCapitalize="words"
              maxLength={16}
              onChangeText={setApodo}
              placeholder="Elige un apodo"
              placeholderTextColor={theme.colors.placeholder}
              style={styles.profileInput}
              value={apodo}
            />
            <Text style={styles.detail}>Letras, números, espacios y guion bajo. Solo puedes cambiarlo una vez al día.</Text>
            <Pressable
              accessibilityRole="button"
              disabled={guardandoApodo || !apodo.trim() || apodo.trim() === apodoGuardado}
              onPress={guardarApodo}
              style={[styles.profileButton, (guardandoApodo || !apodo.trim() || apodo.trim() === apodoGuardado) && styles.disabled]}
            >
              <Text style={styles.profileButtonText}>{guardandoApodo ? 'Guardando…' : 'Guardar apodo'}</Text>
            </Pressable>
            <View style={styles.cardRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.label}>Aparecer en el ranking</Text>
                <Text style={styles.detail}>{apodoGuardado ? 'Solo se mostrará tu apodo, puntuación y edad actual.' : 'Guarda un apodo antes de aparecer en el ranking.'}</Text>
              </View>
              <Switch
                accessibilityRole="switch"
                accessibilityLabel="Aparecer en el ranking"
                accessibilityState={{ checked: rankingVisible, disabled: guardandoVisibilidad || perfilCargando || !apodoGuardado }}
                disabled={guardandoVisibilidad || perfilCargando || !apodoGuardado}
                onValueChange={cambiarVisibilidad}
                thumbColor={theme.colors.textoPrimario}
                trackColor={{ false: theme.colors.borde, true: theme.colors.acento }}
                value={rankingVisible}
              />
            </View>
            {mensajePerfil ? <Text accessibilityRole="text" style={styles.profileSuccess}>{mensajePerfil}</Text> : null}
          </>
        )}
        {errorPerfil ? <Text accessibilityRole="alert" style={styles.scenarioError}>{errorPerfil}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push('/ranking')} style={styles.profileButton}>
          <Text style={styles.profileButtonText}>Ver ranking</Text>
        </Pressable>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.settingCopy}>
          <Text style={styles.label}>Sonido</Text>
          <Text style={styles.detail}>Efectos de acciones y eventos.</Text>
        </View>
        <Switch accessibilityRole="switch" accessibilityLabel="Sonido" accessibilityState={{ checked: sonido.habilitado }} value={sonido.habilitado} onValueChange={sonido.setHabilitado} trackColor={{ false: theme.colors.borde, true: theme.colors.acento }} thumbColor={theme.colors.textoPrimario} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Volumen</Text>
        <View style={styles.volumeButtons}>
          {NIVELES_VOLUMEN.map((nivel) => (
            <Pressable key={nivel} disabled={!sonido.habilitado} accessibilityRole="button" accessibilityState={{ selected: sonido.volumen === nivel }} accessibilityLabel={`Volumen ${nivel}`} style={[styles.volumeOption, sonido.volumen === nivel && styles.volumeOptionActive]} onPress={() => sonido.setVolumen(nivel)}>
              <Text style={[styles.volumeOptionText, sonido.volumen === nivel && styles.volumeOptionTextActive]}>{nivel[0].toUpperCase() + nivel.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.settingCopy}>
          <Text style={styles.label}>Vibración</Text>
          <Text style={styles.detail}>Retroalimentación al realizar acciones.</Text>
        </View>
        <Switch accessibilityRole="switch" accessibilityLabel="Vibración" accessibilityState={{ checked: haptics.enabled }} value={haptics.enabled} onValueChange={haptics.setHapticsEnabled} trackColor={{ false: theme.colors.borde, true: theme.colors.acento }} thumbColor={theme.colors.textoPrimario} />
      </View>

      <View style={styles.cardRow}>
        <View style={styles.settingCopy}>
          <Text style={styles.label}>Reducir animaciones</Text>
          <Text style={styles.detail}>Desactiva movimientos decorativos y transiciones.</Text>
        </View>
        <Switch accessibilityRole="switch" accessibilityLabel="Reducir animaciones" accessibilityState={{ checked: reducirAnimaciones }} value={reducirAnimaciones} onValueChange={setReducirAnimaciones} trackColor={{ false: theme.colors.borde, true: theme.colors.acento }} thumbColor={theme.colors.textoPrimario} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Calidad gráfica</Text>
        <Text style={styles.detail}>Ajusta los efectos visuales para equilibrar detalle y rendimiento.</Text>
        <View style={styles.qualityOptions}>
          {CALIDADES_GRAFICAS.map((nivel) => {
            const nombre = nivel === 'auto' ? 'Auto' : `${nivel[0].toUpperCase()}${nivel.slice(1)}`;
            const seleccionado = calidadGrafica.calidad === nivel;
            return (
              <Pressable
                key={nivel}
                accessibilityRole="button"
                accessibilityLabel={`Calidad gráfica ${nombre}`}
                accessibilityState={{ selected: seleccionado }}
                style={[styles.qualityOption, seleccionado && styles.qualityOptionActive]}
                onPress={() => calidadGrafica.setCalidad(nivel)}
              >
                <Text style={[styles.qualityOptionText, seleccionado && styles.qualityOptionTextActive]}>{nombre}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.detail}>
          {calidadGrafica.calidad === 'baja'
            ? 'Sin partículas ni movimiento continuo en la escena; máximo dos textos flotantes.'
            : calidadGrafica.calidad === 'media'
              ? 'Reduce a la mitad las partículas ambientales.'
              : calidadGrafica.calidad === 'auto'
                ? 'Mide el rendimiento durante 5 segundos y te avisa si conviene reducir la calidad.'
                : 'Escena y efectos visuales completos.'}
        </Text>
        {calidadGrafica.midiendo ? <Text style={styles.qualityStatus}>Midiendo FPS durante 5 segundos…</Text> : null}
        {calidadGrafica.fps !== null && calidadGrafica.calidad === 'auto' && !calidadGrafica.midiendo
          ? <Text style={styles.qualityStatus}>Última medición: {calidadGrafica.fps} FPS.</Text>
          : null}
        {calidadGrafica.propuesta ? (
          <View accessibilityRole="alert" style={styles.qualityNotice}>
            <Text style={styles.qualityNoticeText}>
              El promedio fue {Math.round(calidadGrafica.propuesta.fps)} FPS. ¿Quieres probar calidad {calidadGrafica.propuesta.nivel}?
            </Text>
            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Pasar a calidad ${calidadGrafica.propuesta.nivel}`}
                style={styles.confirmButton}
                onPress={() => calidadGrafica.setCalidad(calidadGrafica.propuesta.nivel)}
              >
                <Text style={styles.confirmButtonText}>Cambiar calidad</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.cancelButton} onPress={calidadGrafica.descartarPropuesta}>
                <Text style={styles.cancelButtonText}>Ahora no</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {calidadGrafica.error ? <Text accessibilityRole="alert" style={styles.scenarioError}>{calidadGrafica.error}</Text> : null}
      </View>

      <View style={styles.presentations}>
        <Text style={styles.sectionTitle}>Para presentaciones</Text>
        <Text style={styles.detail}>Carga una aldea preparada para mostrar el juego.</Text>
        {ESCENARIOS_PRESENTACION.map((escenario) => (
          <View key={escenario.id} style={styles.card}>
            <Text style={styles.label}>{escenario.nombre}</Text>
            <Text style={styles.detail}>{escenario.descripcion}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Preparar escenario ${escenario.nombre}`}
              disabled={aplicandoEscenario}
              style={[styles.presentationButton, aplicandoEscenario && styles.disabled]}
              onPress={() => {
                setErrorEscenario('');
                setEscenarioPendiente(escenario.id);
              }}
            >
              <Text style={styles.presentationButtonText}>Usar escenario</Text>
            </Pressable>
            {escenarioPendiente === escenario.id ? (
              <View style={styles.confirmation}>
                <Text style={styles.confirmationText}>Esto reemplaza tu aldea actual.</Text>
                <View style={styles.confirmationActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={aplicandoEscenario}
                    style={[styles.cancelButton, aplicandoEscenario && styles.disabled]}
                    onPress={() => setEscenarioPendiente(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={aplicandoEscenario}
                    style={[styles.confirmButton, aplicandoEscenario && styles.disabled]}
                    onPress={confirmarEscenario}
                  >
                    <Text style={styles.confirmButtonText}>{aplicandoEscenario ? 'Aplicando…' : 'Reemplazar aldea'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))}
        {errorEscenario ? <Text accessibilityRole="alert" style={styles.scenarioError}>{errorEscenario}</Text> : null}
      </View>

      <View>
        <Text style={styles.sectionTitle}>Diagnóstico</Text>
        <DiagnosticoPanel />
      </View>
      <View>
        <Text style={styles.sectionTitle}>Copia de partida</Text>
        <HerramientasPartida
          aldea={game.aldea}
          catalogo={game.catalogo}
          importarPartida={game.importarPartida}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Versión Vilai ${Constants.expoConfig?.version || '1.0.0'}. Toca cinco veces para activar el modo demo.`}
        style={styles.cardRow}
        onPress={tocarVersion}
      >
        <View style={styles.settingCopy}><Text style={styles.label}>Versión</Text><Text style={styles.detail}>Vilai {Constants.expoConfig?.version || '1.0.0'}</Text></View>
        {!game.modoDemo && toquesVersion > 0 ? <Text style={styles.tapCount}>{toquesVersion}/5</Text> : null}
      </Pressable>
      {game.modoDemo ? (
        <View style={styles.demoPanel}>
          <Text style={styles.sectionTitle}>Modo de demostración</Text>
          <Text style={styles.detail}>Acelera el tiempo y activa eventos para la presentación.</Text>
          <View style={styles.demoSpeeds}>
            {[1, 5, 20].map((velocidad) => (
              <Pressable
                key={velocidad}
                accessibilityRole="button"
                accessibilityLabel={`Velocidad del tiempo por ${velocidad}`}
                accessibilityState={{ selected: game.velocidadDemo === velocidad }}
                style={[styles.speedButton, game.velocidadDemo === velocidad && styles.speedButtonActive]}
                onPress={() => game.cambiarVelocidadDemo(velocidad)}
              >
                <Text style={[styles.speedText, game.velocidadDemo === velocidad && styles.speedTextActive]}>x{velocidad}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={accionDemoEnCurso}
            style={[styles.demoAction, accionDemoEnCurso && styles.disabled]}
            onPress={() => ejecutarAccionDemo(game.siguienteEstacion)}
          >
            <Text style={styles.demoActionText}>Siguiente estación</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={accionDemoEnCurso}
            style={[styles.demoAction, accionDemoEnCurso && styles.disabled]}
            onPress={() => ejecutarAccionDemo(game.forzarCambioEdad)}
          >
            <Text style={styles.demoActionText}>Forzar siguiente edad</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={accionDemoEnCurso}
            style={[styles.demoAction, accionDemoEnCurso && styles.disabled]}
            onPress={() => ejecutarAccionDemo(game.dispararEventoAnual)}
          >
            <Text style={styles.demoActionText}>Disparar evento del año</Text>
          </Pressable>
          {game.error ? <Text accessibilityRole="alert" style={styles.scenarioError}>{game.error}</Text> : null}
        </View>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir créditos" style={styles.credits} onPress={() => router.push('/creditos')}>
        <Text style={styles.creditsText}>Créditos</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={styles.logout} onPress={() => Alert.alert('Cerrar sesión', '¿Quieres salir y volver a la pantalla de entrada?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', style: 'destructive', onPress: game.cerrarSesion }])}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, width: '100%', maxWidth: 960, alignSelf: 'center', backgroundColor: theme.colors.fondo, padding: theme.spacing[16], paddingBottom: 88 },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario, marginBottom: theme.spacing[16] },
  card: { backgroundColor: theme.colors.superficie, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[16], marginBottom: theme.spacing[16] },
  cardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.superficie, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[16], marginBottom: theme.spacing[16] },
  settingCopy: { flex: 1, paddingRight: theme.spacing[12] },
  label: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  detail: { color: theme.colors.textoSecundario, marginTop: theme.spacing[8] },
  tapCount: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold },
  demoPanel: { backgroundColor: theme.colors.superficie, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.acento, padding: theme.spacing[16], marginBottom: theme.spacing[16] },
  demoSpeeds: { flexDirection: 'row', gap: theme.spacing[8], marginTop: theme.spacing[12], marginBottom: theme.spacing[8] },
  speedButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  speedButtonActive: { backgroundColor: theme.colors.acento, borderColor: theme.colors.acento },
  speedText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  speedTextActive: { color: theme.colors.fondo },
  demoAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12], marginTop: theme.spacing[8] },
  demoActionText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold, textAlign: 'center' },
  presentations: { marginBottom: theme.spacing[16] },
  sectionTitle: { ...theme.typography.titulo, color: theme.colors.acento, marginBottom: theme.spacing[8] },
  presentationButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[12], marginTop: theme.spacing[12] },
  presentationButtonText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  confirmation: { marginTop: theme.spacing[12], padding: theme.spacing[12], borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  confirmationText: { color: theme.colors.aviso, fontWeight: theme.typography.weights.bold },
  confirmationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  cancelButton: { flex: 1, minWidth: 120, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde },
  cancelButtonText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  confirmButton: { flex: 1, minWidth: 160, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento, paddingHorizontal: theme.spacing[8] },
  confirmButtonText: { color: theme.colors.fondo, fontWeight: theme.typography.weights.bold, textAlign: 'center' },
  scenarioError: { color: theme.colors.peligro, marginTop: theme.spacing[8] },
  disabled: { opacity: 0.5 },
  volumeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  volumeOption: { minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  volumeOptionActive: { borderColor: theme.colors.acento, backgroundColor: theme.colors.acento },
  volumeOptionText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  volumeOptionTextActive: { color: theme.colors.fondo },
  qualityOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  qualityOption: { flex: 1, minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, paddingHorizontal: theme.spacing[8] },
  qualityOptionActive: { borderColor: theme.colors.acento, backgroundColor: theme.colors.acento },
  qualityOptionText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  qualityOptionTextActive: { color: theme.colors.fondo },
  qualityStatus: { color: theme.colors.acento, marginTop: theme.spacing[8], fontWeight: theme.typography.weights.semibold },
  qualityNotice: { backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.aviso, padding: theme.spacing[12], marginTop: theme.spacing[12] },
  qualityNoticeText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.semibold },
  profileLabel: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.small, fontWeight: theme.typography.weights.semibold, marginTop: theme.spacing[16], marginBottom: theme.spacing[4] },
  profileInput: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, color: theme.colors.textoPrimario, paddingHorizontal: theme.spacing[12], marginTop: theme.spacing[8] },
  profileButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[12], marginTop: theme.spacing[12] },
  profileButtonText: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold },
  profileLoading: { margin: theme.spacing[16] },
  profileSuccess: { color: theme.colors.exito, marginTop: theme.spacing[8] },
  credits: { minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[12], marginBottom: theme.spacing[16] },
  creditsText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  logout: { minHeight: 44, justifyContent: 'center', backgroundColor: theme.colors.peligro, borderRadius: theme.radius[10], padding: theme.spacing[12], alignItems: 'center' },
  logoutText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold },
});
