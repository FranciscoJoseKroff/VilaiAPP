import { memo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon, RESOURCE_ICONS, ResourceIcon } from './icons';
import { ResourceChip } from './ResourceChip';
import PixelBar from './pixel/PixelBar';
import { formatoCorto } from '../game/format';

// Barra fija de la pantalla Aldea: estación y año, accesos rápidos y recursos siempre visibles.
// paddingRight deja libre el engranaje de ajustes, que (tabs)/_layout dibuja en posición absoluta.
export const HudAldea = memo(function HudAldea({ estacion, recursos, onCronica, onEstadisticas, onLogros }) {
  const [detalleId, setDetalleId] = useState(null);
  const detalle = recursos.find((recurso) => recurso.id === detalleId);

  return (
    <View style={styles.hud}>
      <View style={styles.filaSuperior}>
        <View
          style={[styles.estacion, estacion.advertencia && styles.estacionAviso]}
          accessible
          accessibilityLabel={`${estacion.titulo}, año ${estacion.anio}. Quedan ${estacion.restante} segundos${estacion.advertencia ? '. Se acerca el invierno' : ''}`}
        >
          <AppIcon name={estacion.icono} size={20} color={estacion.advertencia ? theme.colors.aviso : theme.colors.acento} />
          <View style={styles.estacionTexto}>
            <Text style={styles.estacionTitulo} numberOfLines={1}>{estacion.titulo}</Text>
            <View style={styles.estacionFila}>
              <Text style={styles.estacionAnio}>AÑO {estacion.anio}</Text>
              <View style={styles.flex}><PixelBar value={estacion.progreso} segments={8} continuous color={estacion.advertencia ? 'aviso' : 'acento'} height={6} /></View>
            </View>
          </View>
        </View>
        <BotonHud icono="book-open-page-variant" etiqueta="Ver la crónica y la edad de la aldea" onPress={onCronica} />
        <BotonHud icono="chart-line" etiqueta="Ver estadísticas de la aldea" onPress={onEstadisticas} />
        <BotonHud icono="trophy" etiqueta="Ver logros de la aldea" onPress={onLogros} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recursos}>
        {recursos.map((recurso) => (
          <PildoraRecurso key={recurso.id} recurso={recurso} activa={recurso.id === detalleId} onPress={() => setDetalleId((actual) => actual === recurso.id ? null : recurso.id)} />
        ))}
      </ScrollView>

      {detalle ? (
        <ResourceChip resource={detalle.id} amount={detalle.cantidad} capacity={detalle.capacidad} rate={detalle.tasa} seasonFactor={detalle.factorEstacional} />
      ) : null}
    </View>
  );
});

function BotonHud({ icono, etiqueta, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} style={({ pressed }) => [styles.boton, pressed && styles.presionado]} onPress={onPress}>
      <AppIcon name={icono} size={20} />
    </Pressable>
  );
}

function PildoraRecurso({ recurso, activa, onPress }) {
  const { id, cantidad, capacidad } = recurso;
  const lleno = capacidad > 0 && cantidad >= capacidad;
  const proporcion = capacidad > 0 ? Math.min(1, cantidad / capacidad) : 0;
  const nombre = RESOURCE_ICONS[id]?.label || id;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nombre}: ${Math.floor(cantidad)}${capacidad > 0 ? ` de ${Math.floor(capacidad)}` : ''}${lleno ? ', lleno' : ''}. Toca para ver el detalle`}
      accessibilityState={{ expanded: activa }}
      onPress={onPress}
      style={({ pressed }) => [styles.pildora, lleno && styles.pildoraLlena, activa && styles.pildoraActiva, pressed && styles.presionado]}
    >
      <View style={styles.pildoraFila}>
        <ResourceIcon resource={id} size={18} />
        <Text style={[styles.cantidad, lleno && styles.cantidadLlena]}>{formatoCorto(cantidad)}</Text>
      </View>
      {capacidad > 0 ? (
        <View style={styles.capacidad}>
          <View style={[styles.capacidadRelleno, { width: `${proporcion * 100}%` }, lleno && styles.capacidadLlena]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hud: {
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[8],
    backgroundColor: theme.colors.superficie,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.troncoOscuro,
  },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], paddingRight: 52 },
  estacion: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[8],
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: theme.colors.borde,
    borderLeftColor: theme.colors.borde,
    borderBottomColor: theme.colors.troncoOscuro,
    borderRightColor: theme.colors.troncoOscuro,
    backgroundColor: theme.colors.fondo,
  },
  estacionAviso: { borderTopColor: theme.colors.aviso, borderLeftColor: theme.colors.aviso },
  estacionTexto: { flex: 1, gap: 2, minWidth: 0 },
  estacionTitulo: { ...theme.typography.cuerpoNegrita, color: theme.colors.textoPrimario, lineHeight: 20 },
  estacionFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estacionAnio: { fontFamily: theme.typography.cifra.fontFamily, fontSize: 8, lineHeight: 12, color: theme.colors.acento },
  flex: { flex: 1 },
  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: theme.colors.borde,
    borderLeftColor: theme.colors.borde,
    borderBottomColor: theme.colors.troncoOscuro,
    borderRightColor: theme.colors.troncoOscuro,
    backgroundColor: theme.colors.superficieAlta,
  },
  presionado: { transform: [{ translateY: 1 }], opacity: 0.85 },
  recursos: { gap: theme.spacing[8], paddingRight: theme.spacing[12] },
  pildora: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.borde,
    backgroundColor: theme.colors.fondo,
  },
  pildoraLlena: { borderColor: theme.colors.peligro },
  pildoraActiva: { borderColor: theme.colors.acento, backgroundColor: theme.colors.superficieAlta },
  pildoraFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cantidad: { fontFamily: theme.typography.cifra.fontFamily, fontSize: 12, lineHeight: 16, color: theme.colors.textoPrimario },
  cantidadLlena: { color: theme.colors.peligro },
  capacidad: { height: 3, backgroundColor: theme.colors.superficieAlta, overflow: 'hidden' },
  capacidadRelleno: { height: '100%', backgroundColor: theme.colors.exito },
  capacidadLlena: { backgroundColor: theme.colors.peligro },
});
