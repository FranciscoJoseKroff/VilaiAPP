import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { FilaRecursos } from './FilaRecursos';

// Franja superior de las pestañas Aldeanos, Construir e Investigación: título y recursos siempre
// visibles, con el mismo estilo que el HUD de Aldea. paddingRight deja libre el engranaje de ajustes.
export function EncabezadoPestana({ titulo, detalle }) {
  return (
    <View style={styles.encabezado}>
      <View style={styles.filaTitulo}>
        <Text accessibilityRole="header" style={styles.titulo} numberOfLines={1}>{titulo}</Text>
        {detalle ? <Text style={styles.detalle} numberOfLines={1}>{detalle}</Text> : null}
      </View>
      <FilaRecursos />
    </View>
  );
}

export const estilosEncabezado = StyleSheet.create({
  // Fondo y borde inferior compartidos con HudAldea.
  franja: {
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[8],
    backgroundColor: theme.colors.superficie,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.troncoOscuro,
  },
});

const styles = StyleSheet.create({
  encabezado: estilosEncabezado.franja,
  filaTitulo: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], paddingRight: 52 },
  titulo: { fontFamily: theme.typography.titulo.fontFamily, fontSize: 16, lineHeight: 24, color: theme.colors.textoPrimario, flexShrink: 1 },
  detalle: { ...theme.typography.cuerpo, color: theme.colors.textoSecundario, flexShrink: 1 },
});
