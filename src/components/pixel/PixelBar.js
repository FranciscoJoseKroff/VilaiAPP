import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../theme';

function PixelBar({ value = 0, segments = 20, continuous = false, color = 'exito', height = 10, style, accessibilityLabel }) {
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  const blocks = continuous ? 0 : Math.max(1, Math.min(40, Number(segments) || 20));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { height }, style]}
    >
      {continuous ? (
        <View style={[styles.fill, { width: `${progress * 100}%`, height: '100%', backgroundColor: theme.colors[color] || color }]} />
      ) : Array.from({ length: blocks }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index / blocks < progress && { backgroundColor: theme.colors[color] || color },
            index / blocks >= progress && styles.segmentEmpty,
          ]}
        />
      ))}
    </View>
  );
}

export default memo(PixelBar);

const styles = StyleSheet.create({
  track: {
    width: '100%',
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.troncoOscuro,
    backgroundColor: theme.colors.superficieAlta,
    padding: 1,
  },
  segment: { flex: 1 },
  segmentEmpty: { backgroundColor: theme.colors.borde },
  fill: {},
});
