import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from './icons';
import { FilaRecursos } from './FilaRecursos';
import { estilosEncabezado } from './EncabezadoPestana';
import PixelBar from './pixel/PixelBar';

// Barra fija de la pantalla Aldea: estación y año, accesos rápidos y recursos siempre visibles.
// paddingRight deja libre el engranaje de ajustes, que (tabs)/_layout dibuja en posición absoluta.
export const HudAldea = memo(function HudAldea({ estacion, onCronica, onEstadisticas, onLogros }) {

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
              <View style={styles.flex}><PixelBar value={estacion.progreso} segments={8} continuous color={estacion.advertencia ? 'aviso' : 'acento'} height={10} /></View>
            </View>
          </View>
        </View>
        <BotonHud icono="book-open-page-variant" etiqueta="Ver la crónica y la edad de la aldea" onPress={onCronica} />
        <BotonHud icono="chart-line" etiqueta="Ver estadísticas de la aldea" onPress={onEstadisticas} />
        <BotonHud icono="trophy" etiqueta="Ver logros de la aldea" onPress={onLogros} />
      </View>

      <FilaRecursos />
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

const styles = StyleSheet.create({
  hud: estilosEncabezado.franja,
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
});
