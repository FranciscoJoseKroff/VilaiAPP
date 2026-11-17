import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { theme } from '../../theme';
import { exportarPartida, TAMANO_MAXIMO_PARTIDA, validarPartida } from '../game/copiaPartida';
import { registrarError } from '../diagnostico/registro';

export function HerramientasPartida({ aldea, catalogo, importarPartida }) {
  const [pendiente, setPendiente] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const exportar = async () => {
    setProcesando(true);
    setMensaje('');
    setError('');
    try {
      const json = exportarPartida(aldea);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'vilai-partida.json';
        enlace.click();
        URL.revokeObjectURL(url);
        setMensaje('Se descargó vilai-partida.json.');
      } else {
        await Clipboard.setStringAsync(json);
        setMensaje('Partida copiada al portapapeles.');
      }
    } catch (fallo) {
      registrarError('Exportación de partida', fallo.message);
      setError(fallo.message || 'No se pudo exportar la partida.');
    } finally {
      setProcesando(false);
    }
  };

  const seleccionar = async () => {
    setError('');
    setMensaje('');
    setPendiente(null);
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        base64: false,
      });
      if (resultado.canceled) return;
      const archivo = resultado.assets[0];
      const fuente = archivo.file || new File(archivo.uri);
      if ((archivo.size ?? fuente.size) > TAMANO_MAXIMO_PARTIDA) {
        throw new Error('El archivo de partida supera el límite de 1 MB.');
      }
      const contenido = await fuente.text();
      setPendiente(validarPartida(contenido, catalogo));
      setMensaje(`Partida validada: ${archivo.name}.`);
    } catch (fallo) {
      registrarError('Importación de partida', fallo.message);
      setError(fallo.message || 'No se pudo leer o validar el archivo.');
    }
  };

  const confirmar = async () => {
    if (!pendiente || procesando) return;
    setProcesando(true);
    setError('');
    try {
      await importarPartida(pendiente);
      setPendiente(null);
      setMensaje('Partida importada. Esta aldea queda marcada como demo y no aparece en el ranking.');
    } catch (fallo) {
      registrarError('Importación de partida', fallo.message);
      setError(fallo.message || 'No se pudo importar la partida.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Copia de partida</Text>
      <Text style={styles.detail}>Exporta un JSON sin correo ni identificadores personales. Importar reemplaza la aldea y la marca como demo.</Text>
      <Pressable accessibilityRole="button" disabled={procesando || !aldea} onPress={exportar} style={[styles.button, procesando && styles.disabled]}>
        <Text style={styles.buttonText}>{procesando ? 'Procesando…' : Platform.OS === 'web' ? 'Descargar partida' : 'Copiar partida'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={procesando} onPress={seleccionar} style={[styles.button, procesando && styles.disabled]}>
        <Text style={styles.buttonText}>Importar partida JSON</Text>
      </Pressable>
      {pendiente ? (
        <View style={styles.confirmation}>
          <Text style={styles.confirmText}>Esto reemplaza tu aldea actual.</Text>
          <Text style={styles.detail}>La partida se validó. Al importarla, la aldea quedará excluida del ranking.</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={procesando} onPress={() => setPendiente(null)} style={styles.cancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={procesando} onPress={confirmar} style={styles.confirm}>
              <Text style={styles.confirmButtonText}>{procesando ? 'Importando…' : 'Reemplazar aldea'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {mensaje ? <Text accessibilityRole="status" style={styles.success}>{mensaje}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[16], marginBottom: theme.spacing[16] },
  title: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, fontSize: theme.typography.sizes.normal },
  detail: { color: theme.colors.textoSecundario, marginTop: theme.spacing[8] },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[8], marginTop: theme.spacing[12] },
  buttonText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  disabled: { opacity: 0.5 },
  confirmation: { borderWidth: 1, borderColor: theme.colors.aviso, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12], marginTop: theme.spacing[12] },
  confirmText: { color: theme.colors.aviso, fontWeight: theme.typography.weights.bold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  cancel: { flex: 1, minWidth: 110, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde },
  confirm: { flex: 1, minWidth: 145, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.acento, paddingHorizontal: theme.spacing[8] },
  confirmButtonText: { color: theme.colors.fondo, fontWeight: theme.typography.weights.bold },
  success: { color: theme.colors.exito, marginTop: theme.spacing[8] },
  error: { color: theme.colors.peligro, marginTop: theme.spacing[8] },
});
