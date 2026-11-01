import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { useHapticsFeedback } from '../../context/HapticsContext';
import { useSonido } from '../../servicios/sonidos';
import { setReducirAnimaciones, useReducedMotion } from '../../hooks/useReducedMotion';

const NIVELES_VOLUMEN = ['bajo', 'medio', 'alto'];

export default function AjustesScreen() {
  const game = useGame();
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const reducirAnimaciones = useReducedMotion();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Ajustes</Text>

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

      <View style={styles.cardRow}>
        <View style={styles.settingCopy}><Text style={styles.label}>Versión</Text><Text style={styles.detail}>Vilai {Constants.expoConfig?.version || '1.0.0'}</Text></View>
      </View>
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
  volumeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  volumeOption: { minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  volumeOptionActive: { borderColor: theme.colors.acento, backgroundColor: theme.colors.acento },
  volumeOptionText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  volumeOptionTextActive: { color: theme.colors.fondo },
  credits: { minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[12], marginBottom: theme.spacing[16] },
  creditsText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  logout: { minHeight: 44, justifyContent: 'center', backgroundColor: theme.colors.peligro, borderRadius: theme.radius[10], padding: theme.spacing[12], alignItems: 'center' },
  logoutText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold },
});
