import React, { memo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../theme';
import { useSonido } from '../../../src/servicios/sonidos';

const VARIANTS = {
  primario: { foreground: theme.colors.fondo, background: theme.colors.acento, border: theme.colors.cobre },
  secundario: { foreground: theme.colors.textoPrimario, background: theme.colors.superficieAlta, border: theme.colors.borde },
  peligro: { foreground: theme.colors.fondo, background: theme.colors.peligro, border: theme.colors.adobeOscuro },
  fantasma: { foreground: theme.colors.textoPrimario, background: 'transparent', border: theme.colors.borde },
};

function PixelButton({
  children,
  onPress,
  variant = 'primario',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
  textStyle,
}) {
  const [pressed, setPressed] = useState(false);
  const colors = VARIANTS[variant] || VARIANTS.primario;
  const unavailable = disabled || loading;
  const sonido = useSonido();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={() => { sonido.reproducir('clic'); onPress?.(); }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={({ focused }) => [
        styles.pressable,
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
        Platform.OS === 'web' && styles.web,
        focused && Platform.OS === 'web' && styles.focused,
        style,
      ]}
    >
      {variant === 'primario' && !unavailable ? (
        <LinearGradient
          colors={[theme.colors.oro, theme.colors.acento, theme.colors.cobre]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderColor: colors.border }]}
        >
          {loading ? <ActivityIndicator color={colors.foreground} /> : <Text style={[styles.label, { color: colors.foreground }, textStyle]}>{children}</Text>}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {loading ? <ActivityIndicator color={colors.foreground} /> : <Text style={[styles.label, { color: colors.foreground }, textStyle]}>{children}</Text>}
        </View>
      )}
      {!pressed && !unavailable ? <View pointerEvents="none" style={styles.shadow} /> : null}
    </Pressable>
  );
}

export default memo(PixelButton);

const styles = StyleSheet.create({
  pressable: { minHeight: 44, minWidth: 44, justifyContent: 'center', position: 'relative', marginBottom: 3 },
  fill: { minHeight: 44, paddingHorizontal: theme.spacing[16], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 4 },
  shadow: { position: 'absolute', left: 2, right: -2, bottom: -5, height: 5, backgroundColor: theme.colors.troncoOscuro, zIndex: -1 },
  pressed: { transform: [{ translateY: 2 }] },
  disabled: { opacity: 0.45 },
  label: { ...theme.typography.cuerpoNegrita, textAlign: 'center' },
  web: { cursor: 'pointer', userSelect: 'none' },
  focused: { outlineWidth: 3, outlineColor: theme.colors.hielo, outlineStyle: 'solid', outlineOffset: 2 },
});
