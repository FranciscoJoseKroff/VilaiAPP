import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../theme';

const VARIANTS = {
  normal: { backgroundColor: theme.colors.superficie, borderColor: theme.colors.borde },
  elevada: { backgroundColor: theme.colors.superficieAlta, borderColor: theme.colors.borde },
  acento: { backgroundColor: theme.colors.superficie, borderColor: theme.colors.acento },
  peligro: { backgroundColor: theme.colors.superficie, borderColor: theme.colors.peligro },
};

function PixelPanel({ children, style, accessibilityLabel, variant = 'normal', ...rest }) {
  const variantStyle = VARIANTS[variant] || VARIANTS.normal;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrapper, variantStyle, style]}
      {...rest}
    >
      <View pointerEvents="none" style={styles.lightCorner} />
      <View pointerEvents="none" style={styles.darkCorner} />
      {children}
    </View>
  );
}

export default memo(PixelPanel);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderWidth: 2,
    borderTopColor: theme.colors.textoSecundario,
    borderLeftColor: theme.colors.textoSecundario,
    borderBottomColor: theme.colors.troncoOscuro,
    borderRightColor: theme.colors.troncoOscuro,
    borderRadius: 4,
    padding: theme.spacing[12],
  },
  lightCorner: {
    position: 'absolute',
    width: 8,
    height: 8,
    left: -2,
    top: -2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: theme.colors.textoSecundario,
  },
  darkCorner: {
    position: 'absolute',
    width: 8,
    height: 8,
    right: -2,
    bottom: -2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: theme.colors.troncoOscuro,
  },
});
