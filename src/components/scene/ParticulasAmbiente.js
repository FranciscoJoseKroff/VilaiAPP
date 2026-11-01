import React, { memo, useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PARTICULAS = Array.from({ length: 18 }, (_, indice) => ({
  left: 4 + ((indice * 47) % 92),
  delay: (indice * 370) % 2600,
  duration: 3200 + (indice * 230) % 2800,
  drift: indice % 2 === 0 ? 18 : -18,
  size: 3 + (indice % 3),
}));

const ESTILOS_ESTACION = {
  primavera: { color: '#f2b09a', opacity: 0.8, rotacion: 70 },
  verano: { color: '#fff2e8', opacity: 0.18, rotacion: 0 },
  otoño: { color: '#c89558', opacity: 0.9, rotacion: 45 },
  invierno: { color: '#f2ecd8', opacity: 0.95, rotacion: 0 },
};

function Particula({ particle, estacion, reducidas }) {
  const [progreso] = useState(() => new Animated.Value(0));
  const estilo = ESTILOS_ESTACION[estacion] || ESTILOS_ESTACION.verano;

  useEffect(() => {
    if (reducidas || estacion === 'verano') return undefined;
    progreso.setValue(0);
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(progreso, { toValue: 1, duration: particle.duration, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [particle.delay, particle.duration, progreso, estacion, reducidas]);

  const translateY = progreso.interpolate({ inputRange: [0, 1], outputRange: [-12, 220] });
  const translateX = progreso.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, particle.drift, -particle.drift * 0.6] });
  const rotate = progreso.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${estilo.rotacion * 4}deg`] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.particula, {
        left: `${particle.left}%`,
        width: particle.size,
        height: estacion === 'otoño' ? particle.size * 0.65 : particle.size,
        borderRadius: estacion === 'otoño' ? 1 : particle.size / 2,
        backgroundColor: estilo.color,
        opacity: estilo.opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }]}
    />
  );
}

function ParticulasAmbienteComponent({ estacion, enabled = true, ahorroBateria = false }) {
  if (!enabled || ahorroBateria || estacion === 'verano') return null;
  return (
    <View pointerEvents="none" style={styles.contenedor}>
      {PARTICULAS.slice(0, ahorroBateria ? 0 : 18).map((particle, indice) => (
        <Particula key={indice} particle={particle} estacion={estacion} reducidas={ahorroBateria} />
      ))}
    </View>
  );
}

export const ParticulasAmbiente = memo(ParticulasAmbienteComponent);

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 12 },
  particula: { position: 'absolute', top: 12 },
});
