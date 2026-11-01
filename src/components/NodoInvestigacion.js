import { memo, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from './icons';
import PixelPanel from './pixel/PixelPanel';
import PixelBadge from './pixel/PixelBadge';
import { useReducedMotion } from '../hooks/useReducedMotion';
import GameIcon from './GameIcon';

const ESTADOS = {
  blocked: { label: 'Bloqueado', icon: 'lock-outline' },
  available: { label: 'Disponible', icon: 'circle-outline' },
  reachable: { label: 'Alcanzable ahora', icon: 'target' },
  noResources: { label: 'Sin recursos', icon: 'alert-circle-outline' },
  complete: { label: 'Completado', icon: 'check-circle' },
};

const COLOR_ESTADO = {
  blocked: theme.colors.textoSecundario,
  available: theme.colors.acento,
  reachable: theme.colors.acento,
  noResources: theme.colors.peligro,
  complete: theme.colors.exito,
};

function NodoInvestigacion({
  nodo,
  nivel,
  nivelTexto,
  efectoTexto,
  estado,
  costoTexto,
  sugerido,
  seleccionado,
  requisitos,
  pulso,
  onSelect,
}) {
  const [valorPulso] = useState(() => new Animated.Value(0));
  const configEstado = ESTADOS[estado] || ESTADOS.blocked;
  const colorEstado = COLOR_ESTADO[estado] || COLOR_ESTADO.blocked;
  const escala = valorPulso.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.045, 1] });

  useEffect(() => {
    if (!pulso || movimientoReducido) return undefined;
    valorPulso.setValue(0);
    const animacion = Animated.sequence([
      Animated.timing(valorPulso, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(valorPulso, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, [movimientoReducido, pulso, valorPulso]);

  const etiquetaAccesible = `${nodo.nombre}, nivel ${nivelTexto}, ${configEstado.label}, costo ${costoTexto || 'sin costo'}${sugerido ? ', sugerido' : ''}`;
  const movimientoReducido = useReducedMotion();

  return (
    <View style={styles.wrapper}>
      {requisitos.length > 0 ? (
        <View style={styles.dependencies}>
          {requisitos.map((requisito, index) => (
            <View key={`${requisito.texto}-${index}`} style={styles.dependency}>
              <View style={[styles.connector, { backgroundColor: requisito.cumplido ? theme.colors.exito : theme.colors.borde }]}>
                <View style={[styles.connectorDot, { backgroundColor: requisito.cumplido ? theme.colors.exito : theme.colors.borde }]} />
              </View>
              <Text style={[styles.dependencyText, requisito.cumplido && styles.dependencyMet]} numberOfLines={2}>
                {requisito.texto}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={etiquetaAccesible}
          accessibilityState={{ selected: seleccionado }}
          style={[
            styles.card,
            { borderColor: colorEstado },
            estado === 'blocked' && styles.blocked,
            estado === 'reachable' && styles.reachable,
            estado === 'noResources' && styles.noResources,
            seleccionado && styles.selected,
          ]}
          onPress={() => onSelect(nodo.id)}
        >
          <PixelPanel variant={estado === 'reachable' ? 'acento' : estado === 'blocked' ? 'normal' : 'elevada'} style={styles.pixelCard}>
          <View style={styles.topRow}>
            <View style={[styles.iconWrap, { borderColor: `${colorEstado}80` }]}>
              <GameIcon id={nodo.icono || 'fallback'} size={30} color={colorEstado} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.name} maxFontSizeMultiplier={1.3}>{nodo.nombre}</Text>
              <Text style={styles.level}>{estado === 'complete' ? 'MÁX' : nivelTexto}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <AppIcon name={configEstado.icon} size={18} color={colorEstado} />
            <Text style={[styles.status, { color: colorEstado }]}>{configEstado.label}</Text>
            {sugerido ? <PixelBadge label="sugerido">SUGERIDO</PixelBadge> : null}
          </View>
          <Text style={styles.effect} numberOfLines={2}>{efectoTexto || nodo.descripcion}</Text>
          {costoTexto ? <Text style={styles.cost} numberOfLines={2}>Costo · {costoTexto}</Text> : null}
          </PixelPanel>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function mismasDependencias(anterior = [], siguiente = []) {
  return anterior.length === siguiente.length && anterior.every((item, index) => (
    item.texto === siguiente[index].texto && item.cumplido === siguiente[index].cumplido
  ));
}

export default memo(NodoInvestigacion, (anterior, siguiente) => (
  anterior.nodo === siguiente.nodo
  && anterior.nivel === siguiente.nivel
  && anterior.nivelTexto === siguiente.nivelTexto
  && anterior.efectoTexto === siguiente.efectoTexto
  && anterior.estado === siguiente.estado
  && anterior.costoTexto === siguiente.costoTexto
  && anterior.sugerido === siguiente.sugerido
  && anterior.seleccionado === siguiente.seleccionado
  && anterior.pulso === siguiente.pulso
  && anterior.onSelect === siguiente.onSelect
  && mismasDependencias(anterior.requisitos, siguiente.requisitos)
));

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  dependencies: { paddingLeft: theme.spacing[12], marginBottom: theme.spacing[8] },
  dependency: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  connector: { width: 18, height: 2, position: 'relative' },
  connectorDot: { position: 'absolute', right: -2, top: -3, width: 8, height: 8, borderRadius: 4 },
  dependencyText: { flex: 1, color: theme.colors.textoSecundario, fontSize: 14 },
  dependencyMet: { color: theme.colors.exito },
  card: { minHeight: 150 },
  pixelCard: { minHeight: 150, padding: theme.spacing[12] },
  blocked: { opacity: 0.62 },
  reachable: { backgroundColor: theme.colors.superficieAlta, borderWidth: 2, shadowColor: theme.colors.acento, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  noResources: { borderWidth: 2 },
  selected: { backgroundColor: theme.colors.superficieAlta },
  topRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  iconWrap: { width: 48, height: 48, borderRadius: theme.radius[10], borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.fondo },
  copy: { flex: 1, gap: 4 },
  name: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.bold },
  level: { color: theme.colors.textoSecundario, fontSize: 14 },
  statusRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4], marginTop: theme.spacing[4] },
  status: { flex: 1, fontSize: 14, fontWeight: theme.typography.weights.bold },
  suggested: { color: theme.colors.acento, fontSize: 14, fontWeight: theme.typography.weights.bold },
  effect: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: theme.spacing[4] },
  cost: { color: theme.colors.textoPrimario, fontSize: 14, marginTop: theme.spacing[8] },
});