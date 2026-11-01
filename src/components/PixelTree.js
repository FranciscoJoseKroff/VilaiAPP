import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

function PixelTreeComponent({ left, top, tone = 'light' }) {
  return (
    <View style={[styles.pixelTree, { left, top }]}> 
      <View style={[styles.treeCrown, styles.treeCrownTop, tone === 'dark' && styles.treeDark]} />
      <View style={[styles.treeCrown, styles.treeCrownMiddle, tone === 'dark' && styles.treeDark]} />
      <View style={[styles.treeCrown, styles.treeCrownBase, tone === 'dark' && styles.treeDark]} />
      <View style={styles.treeTrunk} />
    </View>
  );
}
export const PixelTree = memo(PixelTreeComponent);

const styles = StyleSheet.create({
  pixelTree: { position: 'absolute', width: 36, height: 53 },
  treeCrown: { position: 'absolute', height: 9, backgroundColor: theme.colors.copaArbol },
  treeDark: { backgroundColor: theme.colors.copaArbolSombra },
  treeCrownTop: { width: 14, left: 11, top: 0 },
  treeCrownMiddle: { width: 26, left: 5, top: 9 },
  treeCrownBase: { width: 36, top: 18 },
  treeTrunk: { position: 'absolute', width: 8, height: 17, left: 14, top: 27, backgroundColor: theme.colors.troncoArbol },
});
