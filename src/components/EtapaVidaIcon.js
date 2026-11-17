import { AppIcon } from './icons';
import { etapaVida, NOMBRES_ETAPA } from '../game/cicloVida';
import { Text } from 'react-native';
import { theme } from '../../theme';

const ETAPAS = {
  nino: { icono: 'baby-face-outline', color: theme.colors.acento },
  adulto: { icono: 'account-outline', color: theme.colors.exito },
  anciano: { icono: 'account-clock-outline', color: theme.colors.aviso },
};

export function datosEtapaVida(aldeano) {
  const etapa = etapaVida(aldeano);
  return { ...ETAPAS[etapa], nombre: NOMBRES_ETAPA[etapa] };
}

export function EtapaVidaIcon({ aldeano, size = 16, mostrarNombre = false }) {
  const etapa = datosEtapaVida(aldeano);
  return (
    <>
      <AppIcon name={etapa.icono} size={size} color={etapa.color} />
      {mostrarNombre ? <Text style={{ color: etapa.color }}>{` ${etapa.nombre}`}</Text> : null}
    </>
  );
}
