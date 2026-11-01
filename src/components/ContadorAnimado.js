import React, { memo, useEffect, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

export const ContadorAnimado = memo(function ContadorAnimado({
  value,
  style,
  formato,
  compacto = false,
  pulsoAlAumentar = true,
  animate = false,
}) {
  const valorAnterior = useRef(Number(value) || 0);
  const [visible, setVisible] = useState(valorAnterior.current);
  const escala = useSharedValue(1);
  const estiloEscala = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  useEffect(() => {
    const destino = Number(value) || 0;
    const inicio = Number(valorAnterior.current) || 0;
    valorAnterior.current = destino;

    let frame;
    let inicioTiempo = null;
    const duracion = 280;
    const actualizar = (tiempo) => {
      if (inicioTiempo === null) inicioTiempo = tiempo;
      const progreso = Math.min(1, (tiempo - inicioTiempo) / duracion);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      setVisible(inicio + (destino - inicio) * suavizado);
      if (progreso < 1) {
        frame = requestAnimationFrame(actualizar);
      }
    };
    if (animate) frame = requestAnimationFrame(actualizar);
    else setVisible(destino);

    if (animate && pulsoAlAumentar && destino > inicio) {
      escala.value = withTiming(1.12, { duration: 120 });
      escala.value = withTiming(1, { duration: 180 });
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [animate, pulsoAlAumentar, value, escala]);

  const texto = formato ? formato(visible, compacto) : String(Math.round(visible));

  return (
    <Animated.Text style={[stylesBase, style, estiloEscala]}>
      {texto}
    </Animated.Text>
  );
});

const stylesBase = {
  color: theme.colors.textoPrimario,
  fontSize: theme.typography.sizes.normal,
  fontWeight: theme.typography.weights.bold,
};
