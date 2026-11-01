import React, { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import { create as pixelArt } from '@dicebear/pixel-art';
import { theme } from '../../theme';

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
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${aldeano?.nombre || 'aldeano'}`}
      style={{ width: size, height: size, borderRadius: size * theme.avatar.radiusFactor, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta }}
    >
      {svg ? <SvgXml xml={svg} width={size} height={size} /> : <Text style={{ color: theme.colors.textoPrimario, fontSize: Math.max(12, size * theme.avatar.inicialFactor), fontWeight: theme.typography.weights.bold }}>{inicial}</Text>}
    </View>
  );
}

export const AvatarAldeano = memo(AvatarAldeanoComponent);
export { semillaAldeano };
