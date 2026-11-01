import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme';
import { useGame } from '../context/GameContext';
import { estacionEn } from '../game/tiempo';

const NORMALIZAR_ESTACION = { otoño: 'otono' };
const NORMALIZAR_EDAD = { Calma: 'calma', Abundancia: 'abundancia', Hielo: 'hielo', Ceniza: 'ceniza', Sombras: 'sombras', Descubrimientos: 'descubrimientos' };

export function useTemaTiempo() {
  const game = useGame();
  const aldea = game.aldea || {};
  const segundos = Number(aldea.ciclo?.segundos || 0);
  const estacionId = NORMALIZAR_ESTACION[estacionEn(segundos).id] || estacionEn(segundos).id || 'primavera';
  const edadId = String(aldea.edad?.id || 'calma').toLowerCase();
  const estacion = theme.colors.estacionTema[estacionId] || theme.colors.estacionTema.primavera;
  const edad = theme.colors.edadTema[edadId] || theme.colors.edadTema.calma;
  const cielo = useSharedValue(estacion.cielo[0]);
  const suelo = useSharedValue(estacion.cielo[1]);

  useEffect(() => {
    cielo.value = withTiming(estacion.cielo[0], { duration: 900 });
    suelo.value = withTiming(estacion.cielo[1], { duration: 900 });
  }, [estacionId, estacion.cielo, cielo, suelo]);

  const hudStyle = useAnimatedStyle(() => ({
    backgroundColor: cielo.value,
  }));
  const cieloOverlayStyle = useAnimatedStyle(() => ({
    backgroundColor: cielo.value,
  }));
  const acento = estacion.acento;

  return {
    estacionId,
    edadId,
    acento,
    cielo: estacion.cielo,
    hudTint: estacion.hudTint,
    edadTint: edad,
    edadIdNormalizado: NORMALIZAR_EDAD[edadId] || edadId,
    hudStyle,
    cieloOverlayStyle,
  };
}
