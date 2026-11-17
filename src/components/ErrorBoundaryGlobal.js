import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { registrarError } from '../diagnostico/registro';

export class ErrorBoundaryGlobal extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    registrarError('Interfaz', error?.message || 'Error inesperado en la interfaz.');
  }

  reintentar = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Algo no salió como esperábamos</Text>
          <Text style={styles.message}>La aldea sigue a salvo. Puedes volver a intentarlo.</Text>
          <Pressable accessibilityRole="button" onPress={this.reintentar} style={styles.button}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.fondo, padding: theme.spacing[16] },
  card: { width: '100%', maxWidth: 480, alignItems: 'center', borderRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.superficie, padding: theme.spacing[24] },
  title: { color: theme.colors.acento, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold, textAlign: 'center' },
  message: { color: theme.colors.textoPrimario, textAlign: 'center', marginTop: theme.spacing[12] },
  button: { minHeight: 48, minWidth: 160, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento, paddingHorizontal: theme.spacing[16], marginTop: theme.spacing[20] },
  buttonText: { color: theme.colors.fondo, fontWeight: theme.typography.weights.bold },
});
