import { useEffect } from 'react';
import { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function useMovimientoAldeanos({ activo, entrando = false, indice = 0, ahorroBateria = false }) {
  const desplazamientoX = useSharedValue(0);
  const desplazamientoY = useSharedValue(0);
  const entradaX = useSharedValue(entrando ? -80 : 0);

  useEffect(() => {
    entradaX.value = entrando ? -80 : 0;
    desplazamientoX.value = 0;
    desplazamientoY.value = 0;

    if (!activo || ahorroBateria) return undefined;

    const duracionEntrada = 1400 + (indice % 3) * 180;
    if (entrando) {
      entradaX.value = withTiming(0, { duration: duracionEntrada });
    }

    desplazamientoX.value = withRepeat(
      withSequence(
        withTiming(indice % 2 === 0 ? 10 : -8, { duration: 1800 + indice * 90 }),
        withTiming(indice % 2 === 0 ? -8 : 10, { duration: 1800 + indice * 90 }),
      ),
      -1,
      true,
    );
    desplazamientoY.value = withRepeat(
      withSequence(withTiming(-2, { duration: 380 }), withTiming(0, { duration: 380 })),
      -1,
      true,
    );

    return () => {
      cancelAnimation(entradaX);
      cancelAnimation(desplazamientoX);
      cancelAnimation(desplazamientoY);
    };
  }, [activo, ahorroBateria, entradaX, desplazamientoX, desplazamientoY, entrando, indice]);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [
      { translateX: entradaX.value + desplazamientoX.value },
      { translateY: desplazamientoY.value },
    ],
  }));

  return estiloAnimado;
}
