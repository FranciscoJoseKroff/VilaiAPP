import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { AppIcon } from './icons';
import { AvatarAldeano } from './AvatarAldeano';

const ICONOS = { evento: 'weather-lightning', construccion: 'hammer', edad: 'crown' };

// Hoja inferior con la edad actual y la crónica completa (antes ocupaban la pantalla Aldea).
export function CronicaSheet({ visible, onClose, edad, entradas }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar la crónica" style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: theme.spacing[16] + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.encabezado}>
            <Text accessibilityRole="header" style={styles.titulo}>Crónica</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.cerrar} onPress={onClose}>
              <AppIcon name="close" size={22} />
            </Pressable>
          </View>

          {edad ? (
            <View style={styles.edad} accessible accessibilityLabel={`${edad.nombre}. Quedan ${edad.quedan} años. ${edad.descripcion}`}>
              <View style={styles.edadFila}>
                <AppIcon name={edad.icono || 'weather-partly-cloudy'} size={28} color={theme.colors.acento} />
                <View style={styles.flex}>
                  <Text style={styles.edadNombre}>{edad.nombre}</Text>
                  <Text style={styles.edadQuedan}>Quedan {edad.quedan} año{edad.quedan === 1 ? '' : 's'}</Text>
                </View>
              </View>
              <Text style={styles.texto}>{edad.descripcion}</Text>
              <Text style={styles.edadEfectos}>{edad.efectos.length ? edad.efectos.join(' · ') : 'Sin modificaciones'}</Text>
            </View>
          ) : null}

          <FlatList
            data={entradas}
            keyExtractor={(entrada, indice) => `${entrada.anio}-${entrada.tipo}-${indice}`}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={(
              <View style={styles.vacio}>
                <AppIcon name="book-open-outline" size={24} color={theme.colors.textoSecundario} />
                <Text style={[styles.texto, styles.flex]}>La historia de tu aldea comienza aquí.</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.entrada} accessible accessibilityLabel={`Año ${item.anio}. ${item.texto}`}>
                {item.tipo === 'aldeano'
                  ? <AvatarAldeano aldeano={{ nombre: item.texto.replace(/^Llegó\s+/i, '') }} size={32} />
                  : <View style={styles.icono}><AppIcon name={ICONOS[item.tipo] || 'book-open-page-variant'} size={20} color={theme.colors.acento} /></View>}
                <View style={styles.flex}>
                  <Text style={styles.anio}>Año {item.anio}</Text>
                  <Text style={styles.texto}>{item.texto}</Text>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '85%',
    backgroundColor: theme.colors.superficie,
    borderTopLeftRadius: theme.radius[16],
    borderTopRightRadius: theme.radius[16],
    borderWidth: 1,
    borderColor: theme.colors.borde,
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[8],
  },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 4, backgroundColor: theme.colors.textoSecundario, marginBottom: theme.spacing[12] },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing[12] },
  titulo: { ...theme.typography.titulo, color: theme.colors.textoPrimario },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  flex: { flex: 1 },
  edad: { gap: theme.spacing[8], padding: theme.spacing[12], borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.fondo, marginBottom: theme.spacing[16] },
  edadFila: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  edadNombre: { ...theme.typography.titulo, fontSize: 16, lineHeight: 24, color: theme.colors.textoPrimario },
  edadQuedan: { ...theme.typography.cuerpo, color: theme.colors.acento },
  edadEfectos: { ...theme.typography.cuerpoNegrita, color: theme.colors.exito },
  lista: { paddingBottom: theme.spacing[8] },
  entrada: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[12], paddingVertical: theme.spacing[8], borderBottomWidth: 1, borderBottomColor: theme.colors.borde },
  icono: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  anio: { ...theme.typography.cuerpoNegrita, color: theme.colors.acento },
  texto: { ...theme.typography.cuerpo, color: theme.colors.textoPrimario },
  vacio: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], minHeight: 44 },
});
