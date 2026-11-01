import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export function InvestigacionScreen({ volver, children }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.backButton} onPress={volver}>
        <Text style={styles.link}>‹ Volver a la aldea</Text>
      </Pressable>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CONSEJO DEL POBLADO</Text>
        <Text style={styles.title}>Árbol de habilidades</Text>
        <Text style={styles.subtitle}>Tecnologías, defensa y planos heredados.</Text>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.colors.fondo, padding: theme.spacing[24] },
  backButton: { alignSelf: 'flex-start', marginBottom: 14 },
  header: { marginBottom: theme.spacing[24] },
  eyebrow: { color: theme.colors.acento, fontWeight: '700', letterSpacing: 2, fontSize: theme.typography.sizes.small, marginBottom: theme.spacing[8] },
  title: { color: theme.colors.textoPrimario, fontSize: 30, fontWeight: '800', marginBottom: theme.spacing[4] },
  subtitle: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal },
  link: { color: theme.colors.exito, fontSize: theme.typography.sizes.small },
});
