import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from './icons';
import PixelBar from './pixel/PixelBar';

// (tabs)/_layout calcula la meta destacada (useMetas vive ahí) y la comparte con la pantalla Aldea.
export const MetaDestacadaContext = createContext(null);

// Cinta de la meta actual sobre la escena. Va dentro de la pantalla (no en el layout) para que
// las hojas del aldeano y de la crónica queden por encima de ella.
export function CintaMeta({ style }) {
  const datos = useContext(MetaDestacadaContext);
  if (!datos?.meta) return null;
  const { meta, progreso, porReclamar, abrir } = datos;
  const lista = porReclamar > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lista ? `Meta lista para reclamar: ${meta.titulo}. Abre las metas` : `Meta: ${meta.titulo}, ${progreso.actual} de ${progreso.objetivo}. Abre las metas`}
      style={({ pressed }) => [styles.cinta, lista && styles.lista, pressed && styles.presionada, style]}
      onPress={abrir}
    >
      <AppIcon name={lista ? 'gift' : 'flag-checkered'} size={22} color={lista ? theme.colors.fondo : theme.colors.acento} />
      <View style={styles.texto}>
        <Text style={[styles.titulo, lista && styles.tituloLista]} numberOfLines={1}>{lista ? '¡Meta lista! Toca para reclamar' : meta.titulo}</Text>
        {lista ? null : <PixelBar value={progreso.proporcion} segments={16} continuous color="acento" height={10} />}
      </View>
      {lista ? null : <Text style={styles.conteo}>{progreso.actual}/{progreso.objetivo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cinta: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: theme.colors.acento,
    borderLeftColor: theme.colors.acento,
    borderBottomColor: theme.colors.troncoOscuro,
    borderRightColor: theme.colors.troncoOscuro,
    backgroundColor: theme.colors.superficie,
  },
  lista: { backgroundColor: theme.colors.acento, borderTopColor: theme.colors.oro, borderLeftColor: theme.colors.oro, borderBottomColor: theme.colors.cobre, borderRightColor: theme.colors.cobre },
  presionada: { transform: [{ translateY: 2 }] },
  texto: { flex: 1, gap: 6, minWidth: 0 },
  titulo: { ...theme.typography.cuerpoNegrita, color: theme.colors.textoPrimario, lineHeight: 20 },
  tituloLista: { color: theme.colors.fondo },
  conteo: { fontFamily: theme.typography.cifra.fontFamily, fontSize: 12, color: theme.colors.acento },
});
