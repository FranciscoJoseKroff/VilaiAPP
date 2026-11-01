import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { ResourceIcon } from './icons';

export function CostChips({ resources, available = {}, compact = false }) {
  if (!resources) return null;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {Object.entries(resources).map(([resource, required]) => {
        const owned = Number(available[resource] || 0);
        const alcanza = owned >= required;
        const ownedText = Math.floor(owned);
        return (
          <View key={resource} style={[styles.chip, alcanza ? styles.chipOk : styles.chipMissing]}>
            <ResourceIcon resource={resource} size={compact ? 14 : 16} />
            <Text style={styles.text}>{required > owned ? `${RESOURCE_NAMES[resource] || resource} ${ownedText}/${required}` : `${RESOURCE_NAMES[resource] || resource} ${required}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

const RESOURCE_NAMES = {
  madera: 'Madera', comida: 'Comida', oro: 'Oro', trigo: 'Trigo', harina: 'Harina', pan: 'Pan', hierro: 'Hierro',
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[8] },
  rowCompact: { gap: theme.spacing[4] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: theme.radius[6], borderWidth: 1, paddingHorizontal: theme.spacing[8], paddingVertical: 6 },
  chipOk: { borderColor: theme.colors.exito, backgroundColor: theme.colors.superficieAlta },
  chipMissing: { borderColor: theme.colors.peligro, backgroundColor: theme.colors.superficie },
  text: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.semibold },
});
