import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';
import { GAME_ICONS } from '../data/gameIcons';

function GameIcon({ id, size = 24, color = theme.colors.textoPrimario }) {
  const icono = GAME_ICONS[id];
  if (!icono) {
    if (__DEV__) console.warn(`GameIcon: no existe el icono "${id}".`);
  }
  const mostrado = icono || GAME_ICONS.fallback;
  return (
    <Svg width={size} height={size} viewBox={mostrado.viewBox}>
      {mostrado.paths.map((d, index) => (
        <Path key={`${id || 'fallback'}-${index}`} d={d} fill={color} />
      ))}
    </Svg>
  );
}

export default memo(GameIcon);
