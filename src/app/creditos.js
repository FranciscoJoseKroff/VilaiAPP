import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../../theme';
import { CREDITOS } from '../data/creditos';

function CreditosCategoria({ titulo, elementos }) {
  return (
    <View style={styles.category} accessibilityRole="summary">
      <Text accessibilityRole="header" style={styles.categoryTitle}>{titulo}</Text>
      {elementos.map((elemento) => (
        <Pressable
          key={elemento.id || elemento.nombre}
          accessibilityRole="link"
          accessibilityLabel={`Abrir ${elemento.nombre}${elemento.autor ? `, por ${elemento.autor}` : ''}`}
          style={styles.credit}
          onPress={() => Linking.openURL(elemento.url)}
        >
          <Text style={styles.creditName}>{elemento.nombre}</Text>
          {elemento.autor ? <Text style={styles.creditMeta}>{elemento.autor}</Text> : null}
          {elemento.licencia ? <Text style={styles.creditMeta}>{elemento.licencia}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

export default function CreditosScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a ajustes" onPress={() => router.back()}>
        <Text style={styles.back}>← Ajustes</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>Créditos</Text>
      <Text style={styles.intro}>Vilai agradece a las personas y proyectos que hacen posible su arte, diseño y tecnología.</Text>
      <Text style={styles.attribution}>Iconos de game-icons.net, licencia CC BY 3.0. Autores: {CREDITOS.iconos.map((icono) => icono.autor).join(', ')}.</Text>
      <CreditosCategoria titulo="Iconos" elementos={CREDITOS.iconos} />
      <CreditosCategoria titulo="Fuentes" elementos={CREDITOS.fuentes} />
      <CreditosCategoria titulo="Bibliotecas" elementos={CREDITOS.bibliotecas} />
      <CreditosCategoria titulo="Avatares" elementos={CREDITOS.avatares} />
      <CreditosCategoria titulo="Audio" elementos={CREDITOS.audio} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, width: '100%', maxWidth: 960, alignSelf: 'center', padding: theme.spacing[16], backgroundColor: theme.colors.fondo },
  back: { color: theme.colors.acento, minHeight: 44, textAlignVertical: 'center' },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario, marginBottom: theme.spacing[12] },
  intro: { ...theme.typography.cuerpo, color: theme.colors.textoSecundario, marginBottom: theme.spacing[12] },
  attribution: { ...theme.typography.cuerpo, color: theme.colors.textoPrimario, marginBottom: theme.spacing[16] },
  category: { marginBottom: theme.spacing[16] },
  categoryTitle: { ...theme.typography.titulo, color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, marginBottom: theme.spacing[8] },
  credit: { minHeight: 44, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[12], marginBottom: theme.spacing[8] },
  creditName: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  creditMeta: { color: theme.colors.textoSecundario, marginTop: theme.spacing[4] },
});
