import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';
import { useCalidadGrafica } from '../context/CalidadGraficaContext';
import { perfilCalidadGrafica } from '../game/calidadGrafica';
import { useReducedMotion } from '../hooks/useReducedMotion';

let textosFlotantesActivos = 0;

function reservarTextoFlotante(limite) {
  if (textosFlotantesActivos >= limite) return null;
  textosFlotantesActivos += 1;
  let activo = true;
  return () => {
    if (!activo) return;
    activo = false;
    textosFlotantesActivos = Math.max(0, textosFlotantesActivos - 1);
  };
}

export const TextoFlotante = memo(function TextoFlotante({ cantidad, id }) {
  const { calidad } = useCalidadGrafica();
  const movimientoReducido = useReducedMotion();
  const perfilGrafico = perfilCalidadGrafica(calidad, movimientoReducido);
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const estilo = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    if (!cantidad) {
      setVisible(false);
      return undefined;
    }
    const liberar = reservarTextoFlotante(perfilGrafico.textosFlotantes);
    setVisible(Boolean(liberar));
    if (!liberar) return undefined;
    const temporizador = setTimeout(() => {
      liberar();
      setVisible(false);
    }, 1200);
    return () => {
      clearTimeout(temporizador);
      liberar();
    };
  }, [cantidad, id, perfilGrafico.textosFlotantes]);

  useEffect(() => {
    if (!visible || !cantidad) {
      opacity.value = 0;
      translateY.value = 0;
      return undefined;
    }
    opacity.value = 0;
    translateY.value = 0;
    if (movimientoReducido) {
      opacity.value = 1;
      return undefined;
    }
    opacity.value = withTiming(1, { duration: 120 });
    translateY.value = withTiming(-30, { duration: 900 }, (finished) => {
      if (finished) opacity.value = withTiming(0, { duration: 180 });
    });
    return undefined;
  }, [cantidad, id, movimientoReducido, opacity, translateY, visible]);

  if (!cantidad || !visible) return null;
  const texto = cantidad > 0 ? `+${Math.round(cantidad)}` : `${Math.round(cantidad)}`;

  return (
    <Animated.View pointerEvents="none" style={[styles.contenedor, estilo]}>
      <Text style={[styles.texto, cantidad < 0 && styles.perdida]}>{texto}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  texto: {
    color: theme.colors.exito,
    fontSize: theme.typography.sizes.small,
    fontWeight: theme.typography.weights.bold,
    textShadowColor: theme.colors.fondo,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  perdida: {
    color: theme.colors.aviso,
  },
});
