import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, router, usePathname } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { AppIcon } from '../../components/icons';
import { useGame } from '../../context/GameContext';
import { LoginScreen } from '../../screens/LoginScreen';
import { GameFeedback } from '../../components/GameFeedback';
import { OnboardingModal } from '../../components/OnboardingModal';
import { useMetas } from '../../hooks/useMetas';
import { PanelMetas } from '../../components/PanelMetas';
import { incrementarContador } from '../../game/estadisticas.js';
import { aplicarLogros } from '../../game/logros.js';
import { sumarRecursosConCapacidad } from '../../game/recompensas';
import { calcularCapacidadesAldea } from '../../game/simulation';
import { hayConstruccionDisponible } from '../../game/construccion';
import { puedeInvestigar } from '../../game/investigacion';
import { MetaDestacadaContext } from '../../components/CintaMeta';

function LoadingVilai({ message }) {
  return <SafeAreaView style={styles.center} edges={['top', 'bottom']}><View style={styles.brandMark}><Text style={styles.brandText}>VILAI</Text><ActivityIndicator color={theme.colors.acento} />{message ? <Text accessibilityRole="alert" style={styles.loadingMessage}>{message}</Text> : null}</View></SafeAreaView>;
}

export default function TabsLayout() {
  const game = useGame();
  const pathname = usePathname();
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [onboardingComprobado, setOnboardingComprobado] = useState(false);
  const [mostrarMetas, setMostrarMetas] = useState(false);

  const reclamarRecompensa = useCallback((meta) => {
    const actual = game.aldeaRef.current || game.aldea;
    if (!actual) return;
    // Respeta la capacidad: el servidor rechaza recursos sobre el tope y, al resincronizar, se perdía
    // la recompensa entera (la meta ya quedaba marcada como reclamada).
    const { recursos, sobrante } = sumarRecursosConCapacidad(
      actual.recursos || {},
      meta.recompensa.recursos,
      calcularCapacidadesAldea(actual, game.catalogo || {}),
    );

    let aldeanos = actual.aldeanos || [];
    const cantidadAldeanos = Number(meta.recompensa.aldeanos || 0);
    if (cantidadAldeanos > 0) {
      const nuevos = Array.from({ length: cantidadAldeanos }, (_, indice) => ({
        nombre: `Nuevo aldeano ${aldeanos.length + indice + 1}`,
        x: 400 + indice * 24,
        y: 300 + indice * 24,
        trabajo: 'libre',
        modoTrabajo: 'automatico',
        rasgo: 'polivalente',
        estado: 'buscando_arbol',
        pensamientoActual: 'Estoy listo para ayudar.',
      }));
      aldeanos = [...aldeanos, ...nuevos];
    }

    const desbloqueos = meta.recompensa.desbloqueo
      ? [...new Set([...(actual.desbloqueos || []), meta.recompensa.desbloqueo])]
      : actual.desbloqueos;
    const puntosInvestigacion = Number(actual.puntosInvestigacion || 0) + Number(meta.recompensa.puntosInvestigacion || 0);
    // Los aldeanos de premio también suben el máximo; si no, la aldea quedaba en "3 de 1 habitantes".
    const poblacionMaxima = Number(actual.poblacionMaxima || 1) + cantidadAldeanos;
    let actualizada = { ...actual, recursos, aldeanos, desbloqueos, puntosInvestigacion, poblacionMaxima };
    for (let indice = 0; indice < cantidadAldeanos; indice += 1) {
      actualizada = incrementarContador(actualizada, 'aldeanosLlegados');
    }
    actualizada = aplicarLogros(actualizada, game.catalogo?.logros);
    game.setAldea(actualizada);
    game.guardar(actualizada, game.token);
    const puntos = Number(meta.recompensa.puntosInvestigacion || 0);
    const sinEspacio = Object.entries(sobrante).map(([recurso, cantidad]) => `${Math.round(cantidad)} ${recurso}`).join(', ');
    const base = puntos > 0 ? `Meta completada: +${puntos} puntos de investigación` : `Meta completada: ${meta.titulo}`;
    game.setMensaje(sinEspacio ? `${base} · el almacén no tenía espacio para ${sinEspacio}` : base);
  }, [game]);

  const metasJuego = useMemo(() => ({
    aldea: game.aldea,
  }), [game.aldea]);
  const sistemaMetas = useMetas(metasJuego, {
    capacidades: game.capacidades,
    produccion: game.produccion,
    onRecompensa: reclamarRecompensa,
  });

  useEffect(() => {
    if (!game.token || game.cargandoAldea || !game.aldea || onboardingComprobado) return;
    let activo = true;
    AsyncStorage.getItem('vilai_onboarding_visto').then((visto) => {
      if (!activo) return;
      setOnboardingComprobado(true);
      if (!visto) setMostrarOnboarding(true);
    });
    return () => { activo = false; };
  }, [game.token, game.cargandoAldea, game.aldea, onboardingComprobado]);

  if (game.verificandoSesion) {
    return <LoadingVilai />;
  }
  if (!game.token) {
    return (
      <SafeAreaView style={styles.login} edges={['top', 'bottom']}>
        <LoginScreen
          modoRegistro={game.modoRegistro}
          nombre={game.nombre} setNombre={game.setNombre}
          apodo={game.apodo} setApodo={game.setApodo}
          email={game.email} setEmail={game.setEmail}
          password={game.password} setPassword={game.setPassword}
          error={game.error} enviando={game.enviando}
          enviarFormulario={game.enviarFormulario}
          cambiarModo={() => { game.setModoRegistro(!game.modoRegistro); game.setError(''); }}
        />
      </SafeAreaView>
    );
  }
  if (game.cargandoAldea || !game.aldea || !game.catalogo) {
    return <LoadingVilai message={game.error || undefined} />;
  }

  // Insignias: avisan desde cualquier pestaña que hay algo que hacer en Construir o Investigación.
  const puedeConstruir = hayConstruccionDisponible(game.aldea, game.catalogo, game.costosMejora);
  const puedeInvestigarAlgo = game.arbolDesbloqueado && (game.catalogo.arbol || []).some((nodo) => puedeInvestigar(game.aldea, nodo).ok);
  // Misma meta destacada que muestra PanelMetas: una principal, con prioridad a la que ya se puede reclamar.
  const metaDestacada = [...sistemaMetas.metas]
    .filter((meta) => meta.categoria === 'principal')
    .sort((a, b) => Number(b.estado === 'lista') - Number(a.estado === 'lista'))[0] || sistemaMetas.metas[0];
  const metaDestacadaValor = metaDestacada
    ? { meta: metaDestacada, progreso: sistemaMetas.progresoMeta(metaDestacada), porReclamar: sistemaMetas.porReclamar, abrir: () => setMostrarMetas(true) }
    : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Pressable accessibilityLabel="Abrir ajustes" accessibilityHint="Abre los ajustes de la aldea" accessibilityRole="button" hitSlop={8} style={styles.gear} onPress={() => router.push('/ajustes')}>
        <AppIcon name="cog" size={20} />
      </Pressable>
      {game.modoDemo ? (
        <View pointerEvents="none" style={styles.demoBadgeContainer}>
          <Text style={styles.demoBadge}>MODO DEMO</Text>
        </View>
      ) : null}
      <GameFeedback />
      <OnboardingModal visible={mostrarOnboarding} onClose={() => setMostrarOnboarding(false)} />
      {pathname === '/' ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Metas de la aldea${sistemaMetas.porReclamar ? `, ${sistemaMetas.porReclamar} por reclamar` : ''}`}
          style={styles.goalsButton}
          onPress={() => setMostrarMetas(true)}
        >
          <AppIcon name="flag-checkered" size={22} color={theme.colors.superficie} />
          {sistemaMetas.porReclamar > 0 ? (
            <View style={styles.goalsBadge}><Text style={styles.goalsBadgeText}>{sistemaMetas.porReclamar}</Text></View>
          ) : null}
        </Pressable>
      )}
      <PanelMetas
        visible={mostrarMetas}
        metas={sistemaMetas.metas}
        progresoMeta={sistemaMetas.progresoMeta}
        porReclamar={sistemaMetas.porReclamar}
        sugerencias={sistemaMetas.sugerencias}
        onReclamar={sistemaMetas.reclamar}
        onClose={() => setMostrarMetas(false)}
      />
      <MetaDestacadaContext.Provider value={metaDestacadaValor}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarActiveTintColor: theme.colors.acento, tabBarInactiveTintColor: theme.colors.textoSecundario, tabBarLabelStyle: styles.tabLabel }}>
        <Tabs.Screen name="index" options={{ title: 'Aldea', tabBarIcon: ({ color }) => <AppIcon name="home-variant" size={20} color={color} /> }} />
        <Tabs.Screen name="aldeanos" options={{ title: 'Aldeanos', tabBarIcon: ({ color }) => <AppIcon name="account-group" size={20} color={color} /> }} />
        <Tabs.Screen name="construir" options={{ title: 'Construir', tabBarBadge: puedeConstruir ? '!' : undefined, tabBarBadgeStyle: styles.tabBadge, tabBarAccessibilityLabel: puedeConstruir ? 'Construir, hay edificios que puedes pagar' : 'Construir', tabBarIcon: ({ color }) => <AppIcon name="hammer-wrench" size={20} color={color} /> }} />
        <Tabs.Screen name="investigacion" options={{ title: 'Investigación', tabBarBadge: puedeInvestigarAlgo ? '!' : undefined, tabBarBadgeStyle: styles.tabBadge, tabBarAccessibilityLabel: puedeInvestigarAlgo ? 'Investigación, hay investigaciones disponibles' : 'Investigación', tabBarIcon: ({ color }) => <AppIcon name={game.arbolDesbloqueado ? 'flask' : 'lock'} size={20} color={color} /> }} />
        <Tabs.Screen name="ajustes" options={{ tabBarButton: () => null, title: 'Ajustes' }} />
      </Tabs>
      </MetaDestacadaContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.fondo },
  login: { flex: 1, backgroundColor: theme.colors.fondo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.fondo },
  brandMark: { alignItems: 'center', gap: theme.spacing[16] }, brandText: { color: theme.colors.acento, fontSize: theme.typography.sizes.hero, fontWeight: theme.typography.weights.heavy, letterSpacing: 6 }, loadingMessage: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, textAlign: 'center', maxWidth: 320 },
  gear: { position: 'absolute', top: 8, right: 12, zIndex: 30, width: 44, height: 44, borderRadius: theme.radius[16], alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta, borderWidth: 1, borderColor: theme.colors.borde },
  gearText: { color: theme.colors.textoPrimario, fontSize: 20 },
  demoBadgeContainer: { position: 'absolute', top: 8, left: 0, right: 0, zIndex: 30, alignItems: 'center' },
  demoBadge: { overflow: 'hidden', borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.acento, backgroundColor: theme.colors.superficie, color: theme.colors.acento, fontSize: theme.typography.sizes.small, fontWeight: theme.typography.weights.bold, paddingHorizontal: theme.spacing[12], paddingVertical: theme.spacing[8] },
  tabBar: { backgroundColor: theme.colors.superficie, borderTopColor: theme.colors.borde, height: 72, paddingTop: 6, paddingBottom: 8 },
  tabLabel: { fontSize: 14, fontWeight: theme.typography.weights.semibold },
  tabIcon: { color: theme.colors.textoPrimario, fontSize: 18 },
  goalsButton: { position: 'absolute', right: 12, bottom: 82, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, zIndex: 20, elevation: 20, backgroundColor: theme.colors.acento, borderWidth: 2, borderColor: theme.colors.superficie },
  goalsBadge: { position: 'absolute', top: -5, right: -5, minWidth: 22, height: 22, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: theme.colors.peligro },
  goalsBadgeText: { color: theme.colors.textoPrimario, fontSize: 12, fontWeight: theme.typography.weights.bold },
  tabBadge: { backgroundColor: theme.colors.acento, color: theme.colors.fondo, fontWeight: theme.typography.weights.bold },
});
