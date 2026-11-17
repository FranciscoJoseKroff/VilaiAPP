import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { apiFetch } from '../api/client';
import { crearTextoDiagnostico, registrarError } from '../diagnostico/registro';
import { useDiagnostico } from '../diagnostico/useDiagnostico';

function mostrarHora(valor) {
  if (!valor) return 'Todavía no hay guardados correctos en esta sesión.';
  return new Date(valor).toLocaleString();
}

export function DiagnosticoPanel() {
  const snapshot = useDiagnostico();
  const [versionApi, setVersionApi] = useState('Consultando…');
  const [consultando, setConsultando] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const versionApp = Constants.expoConfig?.version || '1.0.0';

  const consultarApi = useCallback(async () => {
    if (consultando) return;
    setConsultando(true);
    setError('');
    try {
      const resultado = await apiFetch('/salud');
      setVersionApi(resultado.version || 'No informada');
    } catch (fallo) {
      setVersionApi('No disponible');
      setError(fallo.message || 'No se pudo consultar la API.');
    } finally {
      setConsultando(false);
    }
  }, [consultando]);

  useEffect(() => {
    let activo = true;
    apiFetch('/salud')
      .then((resultado) => activo && setVersionApi(resultado.version || 'No informada'))
      .catch((fallo) => {
        if (activo) {
          setVersionApi('No disponible');
          setError(fallo.message || 'No se pudo consultar la API.');
        }
      })
      .finally(() => activo && setConsultando(false));
    return () => { activo = false; };
  }, []);

  const copiarDiagnostico = async () => {
    if (copiando) return;
    setCopiando(true);
    setMensaje('');
    setError('');
    try {
      await Clipboard.setStringAsync(crearTextoDiagnostico({
        versionApp,
        versionApi,
        snapshot,
      }));
      setMensaje('Diagnóstico copiado. Ya puedes enviarlo a soporte.');
    } catch (fallo) {
      registrarError('Diagnóstico', fallo?.message || 'No se pudo copiar el diagnóstico.');
      setError('No se pudo copiar el diagnóstico. Comprueba los permisos del portapapeles.');
    } finally {
      setCopiando(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Diagnóstico</Text>
      <Text style={styles.label}>Versión de la app: <Text style={styles.value}>{versionApp}</Text></Text>
      <Text style={styles.label}>Versión de la API: <Text style={styles.value}>{versionApi}</Text></Text>
      <Text style={styles.label}>Conexión: <Text style={styles.value}>{snapshot.conexion}</Text></Text>
      <Text style={styles.label}>Último guardado correcto: <Text style={styles.value}>{mostrarHora(snapshot.ultimoGuardado)}</Text></Text>
      <Pressable accessibilityRole="button" disabled={consultando} onPress={consultarApi} style={styles.action}>
        <Text style={styles.actionText}>{consultando ? 'Comprobando…' : 'Comprobar conexión'}</Text>
      </Pressable>
      <Text style={styles.subtitle}>Errores recientes ({snapshot.errores.length}/20)</Text>
      {snapshot.errores.length ? snapshot.errores.slice().reverse().map((entrada, indice) => (
        <Text key={`${entrada.hora}-${indice}`} style={styles.errorLine}>
          {new Date(entrada.hora).toLocaleTimeString()} · {entrada.origen}: {entrada.mensaje}
        </Text>
      )) : <Text style={styles.value}>No hay errores registrados.</Text>}
      <Pressable accessibilityRole="button" disabled={copiando} onPress={copiarDiagnostico} style={styles.copy}>
        {copiando ? <ActivityIndicator color={theme.colors.fondo} /> : <Text style={styles.copyText}>Copiar diagnóstico</Text>}
      </Pressable>
      {mensaje ? <Text accessibilityRole="status" style={styles.success}>{mensaje}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[16], marginBottom: theme.spacing[16] },
  title: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, fontSize: theme.typography.sizes.normal, marginBottom: theme.spacing[8] },
  subtitle: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[16], marginBottom: theme.spacing[8] },
  label: { color: theme.colors.textoSecundario, marginTop: theme.spacing[4] },
  value: { color: theme.colors.textoPrimario },
  errorLine: { color: theme.colors.aviso, fontSize: theme.typography.sizes.small, marginTop: theme.spacing[6] },
  action: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], padding: theme.spacing[8], marginTop: theme.spacing[12] },
  actionText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  copy: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.acento, borderRadius: theme.radius[10], padding: theme.spacing[12], marginTop: theme.spacing[16] },
  copyText: { color: theme.colors.fondo, fontWeight: theme.typography.weights.bold },
  success: { color: theme.colors.exito, marginTop: theme.spacing[8] },
  error: { color: theme.colors.peligro, marginTop: theme.spacing[8] },
});
