import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { ResourceIcon } from './icons';

export function ResourceCostChips({ resources, available }) {
  return (
    <View style={styles.costList}>
      {Object.entries(resources).map(([resource, cost]) => {
        const alcanza = (available?.[resource] || 0) >= cost;
        return (
          <View key={resource} style={[styles.costChip, alcanza ? styles.costOk : styles.costMissing]}>
            <ResourceIcon resource={resource} size={14} />
            <Text style={styles.costText}>{cost}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function GoalTrack({ etapa, titulo, detalle, progreso, destacado = etapa?.startsWith('AHORA'), children }) {
  const porcentaje = Math.max(0, Math.min(100, Math.round(progreso * 100)));
  return (
    <View style={[styles.goalTrack, destacado && styles.goalFeatured]}>
      <View style={styles.goalHeading}>
        <Text style={[styles.goalStage, destacado && styles.goalStageFeatured]}>{etapa}</Text>
        <Text style={[styles.goalPercent, destacado && styles.goalPercentFeatured]}>{porcentaje}%</Text>
      </View>
      <Text style={[styles.goalTitle, destacado && styles.goalTitleFeatured]}>{titulo}</Text>
      <Text style={styles.goalDetail}>{detalle}</Text>
      <View style={styles.goalMeter}>
        <View style={[styles.goalFill, destacado && styles.goalFillFeatured, { width: `${porcentaje}%` }]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  goalTrack: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], padding: theme.spacing[12], marginBottom: theme.spacing[12], opacity: 0.82 },
  goalFeatured: { borderColor: theme.colors.acento, borderWidth: 2, padding: theme.spacing[16], opacity: 1 },
  goalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[8] },
  goalStage: { color: theme.colors.textoSecundario, fontSize: 14, fontWeight: theme.typography.weights.semibold },
  goalStageFeatured: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.heavy },
  goalPercent: { color: theme.colors.textoSecundario, fontSize: 14 }, goalPercentFeatured: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  goalTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.semibold },
  goalTitleFeatured: { fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.heavy },
  goalDetail: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[4] },
  goalMeter: { height: 6, overflow: 'hidden', backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[6], marginTop: theme.spacing[12] },
  goalFill: { height: '100%', backgroundColor: theme.colors.textoSecundario }, goalFillFeatured: { backgroundColor: theme.colors.acento },
  costList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[8] },
  costChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: theme.radius[6], paddingHorizontal: theme.spacing[8], paddingVertical: 6, borderWidth: 1 },
  costOk: { borderColor: theme.colors.exito, backgroundColor: theme.colors.superficieAlta }, costMissing: { borderColor: theme.colors.peligro },
  costText: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold },
});
