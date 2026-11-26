import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon, BuildingIcon } from './icons';
import { CostChips } from './CostChips';
import { useHapticsFeedback } from '../context/HapticsContext';
import { useSonido } from '../servicios/sonidos';
import PixelPanel from './pixel/PixelPanel';
import PixelButton from './pixel/PixelButton';
import PixelBar from './pixel/PixelBar';

export function BuildingCard({ buildingId, info, existente, cost, available = {}, costLoading = false, blocked = false, blockedReason, maxLevelReached = false, canPay = false, effect, onAction }) {
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const integridad = existente ? (existente.integridad ?? 100) : null;
  const nextLevel = existente ? existente.nivel + 1 : null;
  const tecnologiaBonita = ({ planosAntiguos: 'Planos antiguos', metalurgia: 'Metalurgia' })[info.requiereTecnologia] || info.requiereTecnologia;
  // Cuánto del costo ya se tiene (0 a 1), para la barra de "Faltan recursos".
  const costoTotal = cost ? Object.values(cost).reduce((total, cantidad) => total + Number(cantidad || 0), 0) : 0;
  const reunido = cost ? Object.entries(cost).reduce((total, [recurso, cantidad]) => total + Math.min(Number(available[recurso] || 0), Number(cantidad || 0)), 0) : 0;
  const progresoCosto = costoTotal > 0 ? reunido / costoTotal : 0;
  const destacada = !blocked && !maxLevelReached && !costLoading && canPay;
  const reason = blocked ? (blockedReason || `Requiere: ${tecnologiaBonita}`) : maxLevelReached ? `Nivel máximo: ${info.maxNivel}` : costLoading ? 'Calculando costo...' : !canPay && cost ? 'Faltan recursos' : null;

  return (
    <PixelPanel variant={blocked ? 'normal' : destacada ? 'acento' : 'elevada'} style={[styles.card, blocked && styles.blocked]} accessibilityLabel={`Edificio ${info.nombre}`}>
      <View style={styles.header}>
        <View style={styles.iconWrap}><BuildingIcon buildingId={buildingId} size={32} /></View>
        <View style={styles.identity}>
          <Text style={styles.name} maxFontSizeMultiplier={1.3}>{info.nombre}</Text>
          <Text style={styles.level}>{existente ? `Nv. ${existente.nivel}` : 'Sin construir'}</Text>
        </View>
        {blocked ? <AppIcon name="lock" size={20} color={theme.colors.textoSecundario} accessibilityLabel="Bloqueado" /> : null}
      </View>

      {integridad !== null ? (
        <View style={styles.integrityBlock}>
          <View style={styles.integrityHeading}><Text style={styles.integrityLabel}>Integridad</Text><Text style={styles.integrityValue}>{integridad}%</Text></View>
          <PixelBar value={integridad / 100} segments={20} color="exito" height={8} accessibilityLabel={`Integridad de ${info.nombre}`} />
        </View>
      ) : null}

      <Text style={styles.effect}>{effect}</Text>

      {blocked ? (
        <Text style={styles.lockedText}>{reason}</Text>
      ) : costLoading ? (
        <View style={styles.skeletonRow}><View style={styles.skeletonChip} /><View style={styles.skeletonChip} /></View>
      ) : cost ? (
        <CostChips resources={cost} available={available} />
      ) : null}

      {blocked ? null : (
        <>
          {reason && !costLoading ? (
            <View style={styles.reasonRow}>
              <Text style={styles.reason}>{reason}</Text>
              {!canPay && cost && !maxLevelReached ? <Text style={styles.reasonPct}>{Math.floor(progresoCosto * 100)}%</Text> : null}
            </View>
          ) : null}
          {!canPay && cost && !maxLevelReached && !costLoading ? <PixelBar value={progresoCosto} continuous color="acento" height={10} accessibilityLabel={`Recursos reunidos para ${info.nombre}`} /> : null}
          <PixelButton
            accessibilityLabel={existente ? `Mejorar ${info.nombre} a nivel ${nextLevel}` : `Construir ${info.nombre}`}
            disabled={costLoading || maxLevelReached || !cost || !canPay}
            style={styles.button}
            onPress={() => { haptics.light(); sonido.reproducir(existente ? 'mejorar' : 'construir'); onAction(); }}
          >
            {existente ? `Mejorar a Nv. ${nextLevel}` : 'Construir'}
          </PixelButton>
        </>
      )}
    </PixelPanel>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[12] },
  blocked: { opacity: 0.58 },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }, iconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, marginRight: theme.spacing[12] },
  identity: { flex: 1 }, name: { fontFamily: theme.typography.titulo.fontFamily, fontSize: 13, lineHeight: 20, color: theme.colors.textoPrimario }, level: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold, marginTop: 2 },
  integrityBlock: { marginTop: theme.spacing[8] }, integrityHeading: { flexDirection: 'row', justifyContent: 'space-between' }, integrityLabel: { color: theme.colors.textoSecundario, fontSize: 14 }, integrityValue: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold },
  integrityTrack: { height: 5, borderRadius: theme.radius[6], overflow: 'hidden', backgroundColor: theme.colors.superficieAlta, marginTop: 4 }, integrityFill: { height: '100%', backgroundColor: theme.colors.exito },
  effect: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[8] }, lockedText: { color: theme.colors.peligro, fontSize: 14, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[12] },
  skeletonRow: { flexDirection: 'row', gap: theme.spacing[8], marginTop: theme.spacing[12] }, skeletonChip: { width: 92, height: 30, borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta },
  reasonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing[8], marginBottom: 4 }, reason: { color: theme.colors.aviso, fontSize: 14 }, reasonPct: { fontFamily: theme.typography.cifra.fontFamily, fontSize: 10, lineHeight: 18, color: theme.colors.aviso }, button: { marginTop: theme.spacing[12] }, buttonDisabled: { backgroundColor: theme.colors.superficieAlta, opacity: 0.75 }, buttonText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
});
