import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from './icons';
import { useHapticsFeedback } from '../context/HapticsContext';
import { useSonido } from '../servicios/sonidos';

function textoRecompensa(recompensa) {
  const partes = Object.entries(recompensa.recursos || {}).map(([recurso, cantidad]) => `+${cantidad} ${recurso}`);
  if (recompensa.aldeanos) partes.push(`+${recompensa.aldeanos} aldeano${recompensa.aldeanos === 1 ? '' : 's'}`);
  if (recompensa.puntosInvestigacion) partes.push(`+${recompensa.puntosInvestigacion} pts. investigación`);
  if (recompensa.desbloqueo) partes.push(`Desbloqueo: ${recompensa.desbloqueo}`);
  return partes.join(' · ');
}

export function PanelMetas({
  visible,
  metas,
  progresoMeta,
  porReclamar,
  sugerencias,
  onReclamar,
  onClose,
}) {
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const [expandida, setExpandida] = useState(false);
  const [reclamando, setReclamando] = useState(null);
  const [entrada] = useState(() => new Animated.Value(1));
  const principal = [...metas]
    .filter((meta) => meta.categoria === 'principal')
    .sort((a, b) => Number(b.estado === 'lista') - Number(a.estado === 'lista'))[0]
    || metas[0];
  const restantes = principal ? metas.filter((meta) => meta.id !== principal.id) : [];

  useEffect(() => {
    entrada.setValue(0.94);
    Animated.timing(entrada, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [principal?.id, entrada]);

  function reclamar(id) {
    setReclamando(id);
    Animated.timing(entrada, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      onReclamar(id);
      haptics.success();
      sonido.reproducir('reclamar');
      setReclamando(null);
    });
  }

  if (!visible) return null;

  const progresoPrincipal = principal ? progresoMeta(principal) : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar metas" style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>Metas de la aldea</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.close} onPress={onClose}>
              <AppIcon name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {principal ? (
              <Animated.View style={[styles.featured, principal.estado === 'lista' && styles.ready, { transform: [{ scale: entrada }] }]}>
                <Text style={styles.featuredLabel}>{principal.estado === 'lista' ? 'META LISTA' : 'META PRINCIPAL'}</Text>
                <Text style={styles.featuredTitle}>{principal.titulo}</Text>
                <Text style={styles.description}>{principal.descripcion}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progresoPrincipal.proporcion * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progresoPrincipal.actual}/{progresoPrincipal.objetivo}</Text>
                </View>
                <Text style={styles.reward}>Recompensa · {textoRecompensa(principal.recompensa)}</Text>
                {principal.estado === 'lista' ? (
                  <Pressable accessibilityRole="button" style={styles.claim} onPress={() => reclamar(principal.id)}>
                    <AppIcon name="gift-outline" size={20} color={theme.colors.superficie} />
                    <Text style={styles.claimText}>{reclamando === principal.id ? 'Reclamando...' : 'Reclamar'}</Text>
                  </Pressable>
                ) : null}
              </Animated.View>
            ) : <Text style={styles.empty}>No quedan metas activas.</Text>}

            {restantes.length > 0 ? (
              <>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandida }} style={styles.toggle} onPress={() => setExpandida((valor) => !valor)}>
                  <Text style={styles.toggleText}>Otras metas ({restantes.length})</Text>
                  <AppIcon name={expandida ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.acento} />
                </Pressable>
                {expandida ? restantes.map((meta) => {
                  const progreso = progresoMeta(meta);
                  return (
                    <View key={meta.id} style={[styles.metaRow, meta.estado === 'lista' && styles.readyRow]}>
                      <View style={styles.metaCopy}>
                        <Text style={styles.metaTitle}>{meta.titulo}</Text>
                        <Text style={styles.metaProgress}>{progreso.actual}/{progreso.objetivo}</Text>
                        <Text style={styles.metaReward}>{textoRecompensa(meta.recompensa)}</Text>
                      </View>
                      {meta.estado === 'lista' ? (
                        <Pressable accessibilityRole="button" style={styles.smallClaim} onPress={() => reclamar(meta.id)}>
                          <Text style={styles.smallClaimText}>Reclamar</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                }) : null}
              </>
            ) : null}

            {sugerencias.length > 0 ? (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Sugerencias para ahora</Text>
                {sugerencias.map((sugerencia) => (
                  <View key={sugerencia.id} style={styles.suggestion}>
                    <AppIcon name="lightbulb-on-outline" size={18} color={theme.colors.acento} />
                    <View style={styles.suggestionCopy}>
                      <Text style={styles.suggestionTitle}>{sugerencia.titulo}</Text>
                      <Text style={styles.suggestionText}>{sugerencia.descripcion}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
          {porReclamar > 0 ? <Text style={styles.badgeHint}>{porReclamar} recompensa{porReclamar === 1 ? '' : 's'} por reclamar</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { maxHeight: '88%', backgroundColor: theme.colors.superficie, borderTopLeftRadius: theme.radius[16], borderTopRightRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, paddingHorizontal: theme.spacing[16], paddingTop: theme.spacing[8], paddingBottom: theme.spacing[16] },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 4, backgroundColor: theme.colors.textoSecundario, marginBottom: theme.spacing[12] },
  heading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  content: { paddingTop: theme.spacing[12], paddingBottom: theme.spacing[16] },
  featured: { backgroundColor: theme.colors.superficieAlta, borderColor: theme.colors.borde, borderWidth: 1, borderRadius: theme.radius[16], padding: theme.spacing[16] },
  ready: { borderColor: theme.colors.acento, borderWidth: 2 },
  featuredLabel: { color: theme.colors.acento, fontSize: 14, fontWeight: theme.typography.weights.bold },
  featuredTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold, marginTop: 4 },
  description: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  progressTrack: { flex: 1, height: 10, overflow: 'hidden', borderRadius: 5, backgroundColor: theme.colors.fondo },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: theme.colors.acento },
  progressText: { minWidth: 48, color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold, textAlign: 'right' },
  reward: { color: theme.colors.acento, fontSize: 14, marginTop: theme.spacing[12] },
  claim: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[8], backgroundColor: theme.colors.acento, borderRadius: theme.radius[10], marginTop: theme.spacing[12] },
  claimText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing[8] },
  toggleText: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  metaRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], borderBottomWidth: 1, borderBottomColor: theme.colors.borde, paddingVertical: theme.spacing[8] },
  readyRow: { borderColor: theme.colors.acento, borderWidth: 1, borderRadius: theme.radius[10], paddingHorizontal: theme.spacing[8], marginVertical: 4 },
  metaCopy: { flex: 1 },
  metaTitle: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold },
  metaProgress: { color: theme.colors.textoSecundario, fontSize: 14 },
  metaReward: { color: theme.colors.acento, fontSize: 14 },
  smallClaim: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing[12], backgroundColor: theme.colors.acento, borderRadius: theme.radius[6] },
  smallClaimText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold },
  suggestions: { marginTop: theme.spacing[16], borderTopWidth: 1, borderTopColor: theme.colors.borde, paddingTop: theme.spacing[12] },
  suggestionsTitle: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold, marginBottom: theme.spacing[8] },
  suggestion: { minHeight: 44, flexDirection: 'row', gap: theme.spacing[8], marginBottom: theme.spacing[8] },
  suggestionCopy: { flex: 1 },
  suggestionTitle: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold },
  suggestionText: { color: theme.colors.textoSecundario, fontSize: 14 },
  empty: { color: theme.colors.textoSecundario, textAlign: 'center', marginTop: theme.spacing[16] },
  badgeHint: { color: theme.colors.acento, fontSize: 14, textAlign: 'center', marginTop: 4 },
});
