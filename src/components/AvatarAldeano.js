import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import { create as pixelArt } from '@dicebear/pixel-art';
import { theme } from '../../theme';
import { EtapaVidaIcon, datosEtapaVida } from './EtapaVidaIcon';

const svgCache = new Map();

function semillaAldeano(aldeano, indice = 0) {
  if (!aldeano) return `aldeano-${indice}`;
  return String(aldeano._id || aldeano.id || `${aldeano.nombre || 'aldeano'}-${indice}`);
}

function generarAvatar(seed) {
  if (svgCache.has(seed)) return svgCache.get(seed);
  const svg = createAvatar(pixelArt, { seed: [seed] }).toString();
  svgCache.set(seed, svg);
  return svg;
}

function AvatarAldeanoComponent({ aldeano, size = 48, indice = 0 }) {
  const seed = useMemo(() => semillaAldeano(aldeano, indice), [aldeano, indice]);
  const svg = useMemo(() => {
    try {
      return generarAvatar(seed);
    } catch (_error) {
      return null;
    }
  }, [seed]);

  const inicial = String(aldeano?.nombre || '?').trim().charAt(0).toUpperCase() || '?';
  const etapa = datosEtapaVida(aldeano);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${aldeano?.nombre || 'aldeano'}, ${etapa.nombre.toLowerCase()}`}
      style={[styles.avatar, { width: size, height: size, borderRadius: size * theme.avatar.radiusFactor }]}
    >
      {svg ? <SvgXml xml={svg} width={size} height={size} /> : <Text style={{ color: theme.colors.textoPrimario, fontSize: Math.max(12, size * theme.avatar.inicialFactor), fontWeight: theme.typography.weights.bold }}>{inicial}</Text>}
      <View style={styles.etapa}><EtapaVidaIcon aldeano={aldeano} size={Math.max(11, Math.round(size * 0.3))} /></View>
    </View>
  );
}

export const AvatarAldeano = memo(AvatarAldeanoComponent);
export { semillaAldeano };

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta },
  etapa: { position: 'absolute', right: 0, bottom: 0, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 8, backgroundColor: theme.colors.superficie },
});
