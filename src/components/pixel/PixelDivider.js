import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../theme';

function PixelDivider({ vertical = false, style }) {
  return <View style={[vertical ? styles.vertical : styles.horizontal, style]} />;
}

export default memo(PixelDivider);

const styles = StyleSheet.create({
  horizontal: { height: 3, width: '100%', backgroundColor: theme.colors.borde, borderBottomWidth: 1, borderBottomColor: theme.colors.troncoOscuro },
  vertical: { width: 3, height: '100%', backgroundColor: theme.colors.borde, borderRightWidth: 1, borderRightColor: theme.colors.troncoOscuro },
});
