import React, { useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from './icons';
import { CostChips } from './CostChips';
import PixelPanel from './pixel/PixelPanel';
import PixelButton from './pixel/PixelButton';

const ICONOS = { bestias: 'paw', helada: 'snowflake', recaudador: 'cash' };
const TITULOS = { bestias: 'Bestias acechantes', helada: 'Helada nocturna', recaudador: 'Recaudador del camino' };

export function EventoModal({ evento, tipo, recursos, puedeDefender, onDefender, onAceptar, visible }) {
  const costo = evento?.costoDefensa || {};
  const [entrada] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }).start();
  }, [entrada, visible]);

  if (!evento) return null;
  const consecuenciaAceptar = tipo === 'helada'
    ? 'Daño en granjas y hornos.'
    : tipo === 'bestias'
      ? 'Daño en edificios y posible pérdida de integridad.'
      : `Pérdida de hasta ${evento.perdidaMadera || 15} madera.`;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={{ width: '100%', maxWidth: 440, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { scale: entrada }] }}>
          <PixelPanel variant="elevada" style={styles.modal}>
            <View style={styles.icono}>
              <AppIcon name={ICONOS[tipo] || 'weather-lightning'} size={52} color={theme.colors.aviso} />
            </View>
            <Text accessibilityRole="header" style={styles.titulo}>{evento.nombre || TITULOS[tipo] || tipo}</Text>
            <Text style={styles.descripcion}>{tipo === 'recaudador' ? 'El recaudador exige tributo antes de continuar por el camino.' : evento.descripcion || 'Una amenaza obliga a la aldea a tomar una decisión.'}</Text>

            <View style={styles.opcion}>
              <Text style={styles.opcionTitulo}>Defender la aldea</Text>
              <Text style={styles.opcionConsecuencia}>Evita el daño a cambio de recursos.</Text>
              {Object.keys(costo).length > 0 ? <CostChips resources={costo} available={recursos} compact /> : null}
            </View>
            <View style={styles.opcion}>
              <Text style={styles.opcionTitulo}>Aceptar las consecuencias</Text>
              <Text style={styles.consecuencia}>{consecuenciaAceptar}</Text>
            </View>

            <View style={styles.botones}>
              <PixelButton disabled={!puedeDefender} variant="primario" style={styles.boton} onPress={onDefender}>Defender</PixelButton>
              <PixelButton variant="secundario" style={styles.boton} onPress={onAceptar}>Aceptar</PixelButton>
            </View>
          </PixelPanel>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[16], backgroundColor: 'rgba(0,0,0,0.68)' },
  modal: { width: '100%', maxWidth: 440, borderRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.superficie, padding: theme.spacing[24], alignItems: 'center' },
  icono: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.superficieAlta, marginBottom: theme.spacing[12] },
  titulo: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.heavy, textAlign: 'center' },
  descripcion: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, textAlign: 'center', marginTop: theme.spacing[8] },
  opcion: { width: '100%', borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[12], marginTop: theme.spacing[12] },
  opcionTitulo: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  opcionConsecuencia: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: 4 },
  consecuencia: { color: theme.colors.aviso, fontSize: 14, marginTop: 4 },
  botones: { flexDirection: 'row', gap: theme.spacing[8], width: '100%', marginTop: theme.spacing[16] },
  boton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10] },
  defender: { backgroundColor: theme.colors.acento }, aceptar: { borderWidth: 1, borderColor: theme.colors.borde },
  deshabilitado: { opacity: 0.45 }, botonDefender: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold }, botonAceptar: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
});
