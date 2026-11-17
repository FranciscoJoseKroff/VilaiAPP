import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../../theme';
import { AppIcon } from '../components/icons';
import { useGame } from '../context/GameContext';
import { apiFetch } from '../api/client';

const TIPOS = [
  { id: 'anios', titulo: 'Años', unidad: 'años' },
  { id: 'reliquias', titulo: 'Reliquias', unidad: 'reliquias' },
  { id: 'poblacion', titulo: 'Población', unidad: 'aldeanos' },
];

const EDADES = {
  calma: 'Edad de la Calma',
  abundancia: 'Edad de la Abundancia',
  hielo: 'Edad del Hielo',
  ceniza: 'Edad de la Ceniza',
  sombras: 'Edad de las Sombras',
  descubrimientos: 'Edad de los Descubrimientos',
};

const FORMATO = new Intl.NumberFormat('es');

export default function RankingScreen() {
  const game = useGame();
  const [tipo, setTipo] = useState('anios');
  const [resultado, setResultado] = useState({ tipo: null, filas: [], tuPosicion: null, error: '' });

  useEffect(() => {
    let activo = true;
    const cargarRanking = () => apiFetch(`/ranking?tipo=${tipo}`, { token: game.token })
      .then((respuesta) => {
        if (!activo) return;
        setResultado({
          tipo,
          filas: respuesta.filas || [],
          tuPosicion: respuesta.tuPosicion || null,
          error: '',
        });
      })
      .catch((fallo) => {
        if (activo) setResultado({ tipo, filas: [], tuPosicion: null, error: fallo.message || 'No se pudo cargar el ranking.' });
      });
    cargarRanking();
    const intervalo = setInterval(cargarRanking, 30_000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [game.token, tipo]);

  const cargando = resultado.tipo !== tipo;
  const filas = cargando ? [] : resultado.filas;
  const tuPosicion = cargando ? null : resultado.tuPosicion;
  const error = cargando ? '' : resultado.error;
  const tipoActivo = TIPOS.find((opcion) => opcion.id === tipo);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
        <AppIcon name="arrow-left" size={20} color={theme.colors.acento} />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>Ranking</Text>
      <Text style={styles.subtitle}>Compara aldeas que eligieron aparecer. No mostramos correos ni identificadores. Se actualiza cada 30 segundos.</Text>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {TIPOS.map((opcion) => (
          <Pressable
            key={opcion.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tipo === opcion.id }}
            onPress={() => setTipo(opcion.id)}
            style={[styles.tab, tipo === opcion.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tipo === opcion.id && styles.tabTextActive]}>{opcion.titulo}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tu posición</Text>
        {cargando ? (
          <ActivityIndicator color={theme.colors.acento} />
        ) : tuPosicion ? (
          <Text style={styles.positionText}>
            #{FORMATO.format(tuPosicion.posicion)} · {tuPosicion.apodo} · {FORMATO.format(tuPosicion.valor)} {tipoActivo.unidad}
          </Text>
        ) : (
          <Text style={styles.subtitle}>Aún no apareces. Elige un apodo y activa «Aparecer en el ranking» en Ajustes.</Text>
        )}
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>Las 20 mejores aldeas</Text>
      {cargando ? <ActivityIndicator color={theme.colors.acento} style={styles.loading} /> : null}
      {!cargando && error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!cargando && !error && filas.length === 0 ? <Text style={styles.empty}>Aún no hay aldeas en el ranking.</Text> : null}
      {!cargando && !error ? filas.map((fila) => (
        <View key={`${fila.posicion}-${fila.apodo}`} style={[styles.row, tuPosicion?.posicion === fila.posicion && styles.rowOwn]}>
          <View style={styles.rankBadge}><Text style={styles.rankNumber}>{fila.posicion}</Text></View>
          <View style={styles.rowCopy}>
            <Text style={styles.nickname}>{fila.apodo}</Text>
            <Text style={styles.age}>{EDADES[fila.edad] || 'Edad desconocida'}</Text>
          </View>
          <Text style={styles.value}>{FORMATO.format(fila.valor)}<Text style={styles.unit}> {tipoActivo.unidad}</Text></Text>
        </View>
      )) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: theme.colors.fondo, padding: theme.spacing[16], paddingBottom: 48 },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  backText: { color: theme.colors.textoPrimario },
  title: { ...theme.typography.titulo, color: theme.colors.acento, marginTop: theme.spacing[8] },
  subtitle: { color: theme.colors.textoSecundario, lineHeight: 22, marginTop: theme.spacing[8] },
  tabs: { flexDirection: 'row', gap: theme.spacing[8], marginVertical: theme.spacing[16] },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie },
  tabActive: { backgroundColor: theme.colors.acento, borderColor: theme.colors.acento },
  tabText: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.semibold },
  tabTextActive: { color: theme.colors.fondo },
  card: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], padding: theme.spacing[16], marginBottom: theme.spacing[16] },
  sectionTitle: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, fontSize: theme.typography.sizes.title, marginBottom: theme.spacing[8] },
  positionText: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  loading: { margin: theme.spacing[16] },
  error: { color: theme.colors.peligro, marginVertical: theme.spacing[12] },
  empty: { color: theme.colors.textoSecundario, textAlign: 'center', padding: theme.spacing[24] },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12], borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, padding: theme.spacing[12], marginTop: theme.spacing[8] },
  rowOwn: { borderColor: theme.colors.acento, backgroundColor: theme.colors.superficieAlta },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.etiquetaBosque },
  rankNumber: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold },
  rowCopy: { flex: 1 },
  nickname: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  age: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.small, marginTop: theme.spacing[4] },
  value: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, textAlign: 'right' },
  unit: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.small, fontWeight: theme.typography.weights.regular },
});
