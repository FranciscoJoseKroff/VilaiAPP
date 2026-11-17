import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../../theme';
import { useGame } from '../context/GameContext';
import { progresoLogro } from '../game/logros';
import GameIcon from '../components/GameIcon';
import { AppIcon } from '../components/icons';

const FORMATO = new Intl.NumberFormat('es-ES');

function TarjetaLogro({ logro, progreso, desbloqueado, dosColumnas }) {
  const meta = Number(logro.meta?.valor || 1);
  const proporcion = Math.min(1, Math.max(0, progreso / meta));
  return (
    <View
      accessible
      style={[styles.card, dosColumnas && styles.cardHalf, desbloqueado && styles.cardUnlocked]}
      accessibilityLabel={`${logro.nombre}. ${logro.descripcion}. ${desbloqueado ? 'Desbloqueado' : `Progreso: ${FORMATO.format(progreso)} de ${FORMATO.format(meta)}`}`}
    >
      <View style={[styles.iconFrame, desbloqueado && styles.iconFrameUnlocked]}>
        <GameIcon
          id={logro.icono}
          size={36}
          color={desbloqueado ? theme.colors.acento : theme.colors.textoSecundario}
        />
      </View>
      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, desbloqueado && styles.cardTitleUnlocked]}>{logro.nombre}</Text>
        <Text style={styles.cardDescription}>{logro.descripcion}</Text>
        {desbloqueado ? (
          <View style={styles.unlockedLabel}>
            <AppIcon name="check-circle" size={15} color={theme.colors.exito} />
            <Text style={styles.unlockedText}>Desbloqueado</Text>
          </View>
        ) : (
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: meta, now: Math.min(progreso, meta) }}
            accessibilityLabel={`Progreso de ${logro.nombre}`}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${proporcion * 100}%` }]} />
            <Text style={styles.progressLabel}>{FORMATO.format(Math.min(progreso, meta))}/{FORMATO.format(meta)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function LogrosScreen() {
  const game = useGame();
  const { width } = useWindowDimensions();
  const columnas = width >= 820 ? 2 : 1;
  const logros = Array.isArray(game.catalogo?.logros) ? game.catalogo.logros : [];
  const obtenidos = new Set((game.aldea?.logros || []).map((logro) => logro.id));
  const cantidadObtenida = logros.filter((logro) => obtenidos.has(logro.id)).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a la aldea"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <AppIcon name="arrow-left" size={20} color={theme.colors.acento} />
          <Text style={styles.backText}>Aldea</Text>
        </Pressable>
        <View style={styles.heading}>
          <View>
            <Text accessibilityRole="header" style={styles.title}>Logros</Text>
            <Text style={styles.subtitle}>Un registro de los hitos de tu comunidad.</Text>
          </View>
          <Text accessibilityLabel={`${cantidadObtenida} de ${logros.length} logros`} style={styles.counter}>
            {cantidadObtenida}/{logros.length}
          </Text>
        </View>
        {logros.length ? (
          <View style={[styles.grid, columnas === 2 && styles.gridTwoColumns]}>
            {logros.map((logro) => (
              <TarjetaLogro
                key={logro.id}
                logro={logro}
                desbloqueado={obtenidos.has(logro.id)}
                progreso={progresoLogro(game.aldea, logro)}
                dosColumnas={columnas === 2}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>Los logros aparecerán aquí cuando el catálogo esté disponible.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.fondo },
  container: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: theme.spacing[16], paddingBottom: theme.spacing[32] },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, minHeight: 44, paddingHorizontal: 8 },
  backText: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8, marginBottom: theme.spacing[16] },
  title: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.heavy },
  subtitle: { color: theme.colors.textoSecundario, marginTop: 5, fontSize: theme.typography.sizes.small },
  counter: { color: theme.colors.acento, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.heavy },
  grid: { gap: theme.spacing[12] },
  gridTwoColumns: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12], width: '100%', minHeight: 130, padding: theme.spacing[12], borderRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.superficie },
  cardHalf: { width: '49%' },
  cardUnlocked: { borderColor: theme.colors.acento },
  iconFrame: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[12], backgroundColor: theme.colors.superficieAlta },
  iconFrameUnlocked: { backgroundColor: theme.colors.etiquetaBosque },
  cardCopy: { flex: 1, gap: 5 },
  cardTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  cardTitleUnlocked: { color: theme.colors.acento },
  cardDescription: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.small, lineHeight: 19 },
  unlockedLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  unlockedText: { color: theme.colors.exito, fontSize: theme.typography.sizes.small, fontWeight: theme.typography.weights.bold },
  progressTrack: { height: 21, justifyContent: 'center', overflow: 'hidden', marginTop: 3, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  progressFill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: theme.colors.acento, opacity: 0.65 },
  progressLabel: { paddingHorizontal: 8, color: theme.colors.textoPrimario, fontSize: 11, fontWeight: theme.typography.weights.bold },
  empty: { padding: theme.spacing[16], color: theme.colors.textoSecundario, textAlign: 'center' },
});
