import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { theme } from '../../../theme';
import { AppIcon } from '../icons';

export function EdificioBottomSheet({ visible, edificio, catalogo, onClose }) {
  const router = useRouter();
  if (!visible || !edificio) return null;

  const informacion = catalogo?.tiposEdificio?.[edificio.tipoId] || {};
  const nivel = Number(edificio.nivel || 1);
  const integridad = Number(edificio.integridad ?? 100);
  const efectos = {};
  if (informacion.efectoTasa) {
    efectos[informacion.efectoTasa.recurso] = informacion.efectoTasa.base * nivel;
  }
  if (informacion.efectoPoblacion) efectos.poblacion = informacion.efectoPoblacion * nivel;
  const efecto = Object.entries(efectos).map(([nombre, cantidad]) => `${nombre}: +${cantidad}`).join(' · ');

  const abrirConstruccion = () => {
    onClose();
    router.push('/construir');
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle del edificio" style={styles.backdrop} onPress={onClose} />
        <Animated.View entering={FadeInDown.duration(220)} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.identity}>
              <View style={styles.icono}><AppIcon name="home-city-outline" size={28} color={theme.colors.acento} /></View>
              <View>
                <Text accessibilityRole="header" style={styles.title}>{informacion.nombre || edificio.tipoId}</Text>
                <Text style={styles.level}>Nivel {nivel}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} style={styles.close} onPress={onClose}><AppIcon name="close" size={22} color={theme.colors.textoPrimario} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>{informacion.descripcion || 'Edificio de la aldea.'}</Text>
            <View style={styles.integrity}>
              <View style={styles.integrityTrack}><View style={[styles.integrityFill, { width: `${Math.max(0, Math.min(100, integridad))}%` }]} /></View>
              <Text style={styles.integrityText}>Integridad {integridad}%</Text>
            </View>
            {efecto ? <><Text style={styles.section}>Efecto actual</Text><Text style={styles.detail}>{efecto}</Text></> : null}
            {edificio.mejorando ? <Text style={styles.working}>Mejora en curso · {Math.round(Number(edificio.progresoMejora || 0))}/{Math.round(Number(edificio.tiempoMejora || 0))}</Text> : null}
            <Pressable accessibilityRole="button" style={styles.action} onPress={abrirConstruccion}>
              <AppIcon name="hammer" size={20} color={theme.colors.superficie} />
              <Text style={styles.actionText}>Ver construcción y mejoras</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  backdrop: { flex: 1 },
  sheet: { maxHeight: '70%', backgroundColor: theme.colors.superficie, borderTopLeftRadius: theme.radius[16], borderTopRightRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, paddingBottom: theme.spacing[16] },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.borde, marginTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing[16], borderBottomWidth: 1, borderBottomColor: theme.colors.borde },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  icono: { width: 44, height: 44, borderRadius: theme.radius[10], alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta },
  title: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  level: { color: theme.colors.acento, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: theme.spacing[16] },
  description: { color: theme.colors.textoSecundario, lineHeight: 22 },
  integrity: { marginTop: theme.spacing[16] },
  integrityTrack: { height: 8, overflow: 'hidden', borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta },
  integrityFill: { height: '100%', backgroundColor: theme.colors.exito },
  integrityText: { color: theme.colors.textoSecundario, marginTop: theme.spacing[8] },
  section: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[16] },
  detail: { color: theme.colors.textoPrimario, marginTop: theme.spacing[8] },
  working: { color: theme.colors.aviso, marginTop: theme.spacing[16], fontWeight: theme.typography.weights.bold },
  action: { minHeight: 44, marginTop: theme.spacing[24], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[8], borderRadius: theme.radius[10], backgroundColor: theme.colors.acento },
  actionText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold },
});
