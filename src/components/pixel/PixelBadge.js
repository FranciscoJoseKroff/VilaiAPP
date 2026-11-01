import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';

const LABELS = {
  nuevo: { text: 'NUEVO', backgroundColor: theme.colors.exito, color: theme.colors.fondo },
  sugerido: { text: 'SUGERIDO', backgroundColor: theme.colors.acento, color: theme.colors.fondo },
  max: { text: 'MÁX', backgroundColor: theme.colors.peligro, color: theme.colors.fondo },
};

function PixelBadge({ label, children, style, textStyle }) {
  const config = LABELS[String(label || '').toLowerCase()] || LABELS.nuevo;
  const value = children || config.text;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }, style]}>
      <Text style={[styles.text, { color: config.color }, textStyle]}>{value}</Text>
    </View>
  );
}

export default memo(PixelBadge);

const styles = StyleSheet.create({
  badge: { minHeight: 24, alignSelf: 'flex-start', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.troncoOscuro, paddingHorizontal: 7, borderRadius: 3 },
  text: { fontSize: 12, lineHeight: 16, fontWeight: theme.typography.weights.bold },
});
