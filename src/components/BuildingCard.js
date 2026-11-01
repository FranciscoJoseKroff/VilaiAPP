import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { BuildingIcon } from './icons';
import { CostChips } from './CostChips';
import { useHapticsFeedback } from '../context/HapticsContext';
import { useSonido } from '../servicios/sonidos';
import PixelPanel from './pixel/PixelPanel';
import PixelButton from './pixel/PixelButton';
import PixelBar from './pixel/PixelBar';

export function BuildingCard({ buildingId, info, existente, cost, available = {}, costLoading = false, blocked = false, canPay = false, effect, onAction }) {
  const haptics = useHapticsFeedback();
  const sonido = useSonido();
  const integridad = existente ? (existente.integridad ?? 100) : null;
  const nextLevel = existente ? existente.nivel + 1 : null;
  const tecnologiaBonita = ({ planosAntiguos: 'Planos antiguos', metalurgia: 'Metalurgia' })[info.requiereTecnologia] || info.requiereTecnologia;
  const reason = blocked ? `Requiere: ${tecnologiaBonita}` : costLoading ? 'Calculando costo...' : !canPay && cost ? 'Faltan recursos' : null;

  return (
    <PixelPanel variant={blocked ? 'normal' : 'elevada'} style={[styles.card, blocked && styles.blocked]} accessibilityLabel={`Edificio ${info.nombre}`}>
      <View style={styles.header}>
        <View style={styles.iconWrap}><BuildingIcon buildingId={buildingId} size={42} /></View>
        <View style={styles.identity}>
          <Text style={styles.name} maxFontSizeMultiplier={1.3}>{info.nombre}</Text>
          <Text style={styles.level}>{existente ? `Nv. ${existente.nivel}` : 'Sin construir'}</Text>
        </View>
        {blocked && <Text style={styles.lock}>🔒</Text>}
      </View>

      {integridad !== null ? (
        <View style={styles.integrityBlock}>
          <View style={styles.integrityHeading}><Text style={styles.integrityLabel}>Integridad</Text><Text style={styles.integrityValue}>{integridad}%</Text></View>
          <PixelBar value={integridad / 100} segments={20} color="exito" height={12} accessibilityLabel={`Integridad de ${info.nombre}`} />
        </View>
      ) : null}

      <Text style={styles.effect}>{effect}</Text>

      {blocked ? (
        <Text style={styles.lockedText}>Requiere: {tecnologiaBonita}</Text>
      ) : costLoading ? (
        <View style={styles.skeletonRow}><View style={styles.skeletonChip} /><View style={styles.skeletonChip} /></View>
      ) : cost ? (
        <CostChips resources={cost} available={available} />
      ) : null}

      {blocked ? null : (
        <>
          {reason && !costLoading ? <Text style={styles.reason}>{reason}</Text> : null}
          <PixelButton
            accessibilityLabel={existente ? `Mejorar ${info.nombre} a nivel ${nextLevel}` : `Construir ${info.nombre}`}
            disabled={costLoading || !cost || !canPay}
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
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }, iconWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, marginRight: theme.spacing[12] },
  identity: { flex: 1 }, name: { ...theme.typography.titulo, color: theme.colors.textoPrimario }, level: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold, marginTop: 2 }, lock: { fontSize: 20 },
  integrityBlock: { marginTop: theme.spacing[12] }, integrityHeading: { flexDirection: 'row', justifyContent: 'space-between' }, integrityLabel: { color: theme.colors.textoSecundario, fontSize: 14 }, integrityValue: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold },
  integrityTrack: { height: 5, borderRadius: theme.radius[6], overflow: 'hidden', backgroundColor: theme.colors.superficieAlta, marginTop: 4 }, integrityFill: { height: '100%', backgroundColor: theme.colors.exito },
  effect: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[12] }, lockedText: { color: theme.colors.peligro, fontSize: 14, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[12] },
  skeletonRow: { flexDirection: 'row', gap: theme.spacing[8], marginTop: theme.spacing[12] }, skeletonChip: { width: 92, height: 30, borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta },
  reason: { color: theme.colors.peligro, fontSize: 14, marginTop: theme.spacing[8] }, button: { marginTop: theme.spacing[12], minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.acento, borderRadius: theme.radius[10] }, buttonDisabled: { backgroundColor: theme.colors.superficieAlta, opacity: 0.75 }, buttonText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
});
