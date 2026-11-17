import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { theme } from '../../theme';
import { AppIcon } from '../components/icons';
import { useGame } from '../context/GameContext';

const SERIES = [
  { id: 'madera', nombre: 'Madera', color: theme.colors.madera },
  { id: 'comida', nombre: 'Comida', color: theme.colors.comida },
  { id: 'hierro', nombre: 'Hierro', color: theme.colors.hierro },
  { id: 'oro', nombre: 'Oro', color: theme.colors.oro },
  { id: 'poblacion', nombre: 'Población', color: theme.colors.exito },
];

const FORMATO = new Intl.NumberFormat('es-ES');
const ESTADISTICAS_VACIAS = { serie: [], contadores: {} };

function valorDelPunto(punto, serie) {
  return serie === 'poblacion' ? punto.p : punto.r?.[serie] || 0;
}

function colorEdad(edad) {
  return edad === 'calma'
    ? theme.colors.etiquetaBosque
    : theme.colors.edadTema?.[edad] || theme.colors.superficieAlta;
}

function TarjetaResumen({ titulo, valor, detalle, icono }) {
  return (
    <View style={styles.summaryCard} accessibilityRole="summary" accessibilityLabel={`${titulo}: ${valor}. ${detalle}`}>
      <AppIcon name={icono} size={22} color={theme.colors.acento} />
      <Text style={styles.summaryTitle}>{titulo}</Text>
      <Text style={styles.summaryValue}>{valor}</Text>
      <Text style={styles.summaryDetail}>{detalle}</Text>
    </View>
  );
}

export default function EstadisticasScreen() {
  const game = useGame();
  const { width: windowWidth } = useWindowDimensions();
  const [serieSeleccionada, setSerieSeleccionada] = useState('madera');
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(null);
  const estadisticas = game.aldea?.estadisticas || ESTADISTICAS_VACIAS;
  const puntos = useMemo(
    () => (Array.isArray(estadisticas.serie) ? estadisticas.serie : []),
    [estadisticas]
  );
  const edades = game.catalogo?.edades || {};
  const serieInfo = SERIES.find((serie) => serie.id === serieSeleccionada) || SERIES[0];
  const chartWidth = Math.max(240, Math.min(800, windowWidth - theme.spacing[32] * 2));
  const chartHeight = 250;
  const margin = { top: 16, right: 12, bottom: 28, left: 36 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const valores = useMemo(() => puntos.map((punto) => valorDelPunto(punto, serieSeleccionada)), [puntos, serieSeleccionada]);
  const maximo = Math.max(1, ...valores);
  const posiciones = valores.map((valor, indice) => ({
    x: margin.left + (valores.length > 1 ? (indice / (valores.length - 1)) * plotWidth : plotWidth / 2),
    y: margin.top + plotHeight - (valor / maximo) * plotHeight,
  }));
  const linea = posiciones.map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`).join(' ');
  const seleccionado = indiceSeleccionado == null ? puntos[puntos.length - 1] : puntos[indiceSeleccionado];
  const anioActual = Number(game.aldea?.ciclo?.dia || 1);
  const edadesSuperadas = Math.max(0, Number(game.aldea?.edad?.numero || 1) - 1);
  const tarjetas = [
    { titulo: 'Años', valor: FORMATO.format(anioActual), detalle: 'año actual', icono: 'calendar-range' },
    { titulo: 'Edades superadas', valor: FORMATO.format(edadesSuperadas), detalle: 'transiciones completadas', icono: 'weather-sunset' },
    { titulo: 'Reliquias', valor: FORMATO.format(Number(game.aldea?.legado?.reliquias || 0)), detalle: 'halladas en las ruinas', icono: 'diamond-stone' },
    { titulo: 'Aldeanos', valor: FORMATO.format(game.aldea?.aldeanos?.length || 0), detalle: 'en la aldea', icono: 'account-group' },
    { titulo: 'Eventos defendidos', valor: FORMATO.format(Number(estadisticas.contadores?.eventosDefendidos || 0)), detalle: 'noches protegidas', icono: 'shield-check' },
  ];
  const edadesPresentes = [...new Set(puntos.map((punto) => punto.e))];
  const resumenAccesible = puntos.length
    ? `Gráfico de ${serieInfo.nombre}, con ${puntos.length} registros anuales. Último registro: año ${puntos[puntos.length - 1].a}, ${serieInfo.nombre.toLowerCase()} ${FORMATO.format(valorDelPunto(puntos[puntos.length - 1], serieSeleccionada))}, población ${FORMATO.format(puntos[puntos.length - 1].p)}, ${edades[puntos[puntos.length - 1].e]?.nombre || puntos[puntos.length - 1].e}.`
    : 'Aún no hay datos: espera un año';

  const seleccionarSerie = (id) => {
    setSerieSeleccionada(id);
    setIndiceSeleccionado(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[styles.container, { maxWidth: 880, alignSelf: 'center', width: '100%' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a la aldea"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <AppIcon name="arrow-left" size={20} color={theme.colors.acento} />
          <Text style={styles.backText}>Aldea</Text>
        </Pressable>
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.subtitle}>La historia de tu aldea, año a año.</Text>

        <View style={styles.summaryGrid}>
          {tarjetas.map((tarjeta) => <TarjetaResumen key={tarjeta.titulo} {...tarjeta} />)}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Historia de la aldea</Text>
          <Text style={styles.chartDescription}>Elige una serie para explorar sus cambios por año.</Text>
          <View style={styles.selector} accessibilityRole="radiogroup" accessibilityLabel="Serie del gráfico">
            {SERIES.map((serie) => {
              const activo = serieSeleccionada === serie.id;
              return (
                <Pressable
                  key={serie.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activo }}
                  accessibilityLabel={serie.nombre}
                  style={[styles.selectorButton, activo && styles.selectorButtonActive]}
                  onPress={() => seleccionarSerie(serie.id)}
                >
                  <Text style={[styles.selectorText, activo && styles.selectorTextActive]}>{serie.nombre}</Text>
                </Pressable>
              );
            })}
          </View>

          {puntos.length === 0 ? (
            <View style={styles.emptyChart} accessibilityRole="summary">
              <AppIcon name="chart-line" size={34} color={theme.colors.textoSecundario} />
              <Text style={styles.emptyText}>Aún no hay datos: espera un año</Text>
            </View>
          ) : (
            <>
              <Text style={styles.accessibleSummary} accessibilityRole="summary">{resumenAccesible}</Text>
              <View style={styles.chartFrame}>
                <Svg width={chartWidth} height={chartHeight} accessibilityLabel={resumenAccesible}>
                  {puntos.map((punto, indice) => {
                    const x = posiciones[indice]?.x || margin.left;
                    const siguienteX = posiciones[indice + 1]?.x;
                    const inicio = indice === 0 ? margin.left : (posiciones[indice - 1].x + x) / 2;
                    const fin = siguienteX == null ? chartWidth - margin.right : (x + siguienteX) / 2;
                    return (
                      <Rect
                        key={`edad-${punto.a}`}
                        x={inicio}
                        y={margin.top}
                        width={Math.max(0, fin - inicio)}
                        height={plotHeight}
                        fill={colorEdad(punto.e)}
                        opacity={0.22}
                      />
                    );
                  })}
                  {[0, 0.5, 1].map((fraccion) => (
                    <Path
                      key={`grid-${fraccion}`}
                      d={`M ${margin.left} ${margin.top + plotHeight * fraccion} H ${chartWidth - margin.right}`}
                      stroke={theme.colors.borde}
                      strokeWidth="1"
                    />
                  ))}
                  {linea ? <Path d={linea} fill="none" stroke={serieInfo.color} strokeWidth="3" /> : null}
                  {posiciones.map((punto, indice) => {
                    const dato = puntos[indice];
                    const seleccionadoActivo = (indiceSeleccionado ?? (puntos.length - 1)) === indice;
                    return (
                      <Circle
                        key={`punto-${dato.a}`}
                        cx={punto.x}
                        cy={punto.y}
                        r={seleccionadoActivo ? 7 : 4}
                        fill={seleccionadoActivo ? theme.colors.acento : serieInfo.color}
                        stroke={theme.colors.fondo}
                        strokeWidth="2"
                        onPress={() => setIndiceSeleccionado(indice)}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`Año ${dato.a}: ${serieInfo.nombre.toLowerCase()} ${FORMATO.format(valorDelPunto(dato, serieSeleccionada))}, población ${FORMATO.format(dato.p)}, ${edades[dato.e]?.nombre || dato.e}`}
                      />
                    );
                  })}
                </Svg>
                <View style={styles.axisLabels} pointerEvents="none">
                  <Text style={styles.axisText}>Año {puntos[0].a}</Text>
                  {puntos.length > 1 ? <Text style={styles.axisText}>Año {puntos[puntos.length - 1].a}</Text> : null}
                </View>
              </View>

              <View style={styles.legend}>
                {edadesPresentes.map((id) => (
                  <View key={id} style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: colorEdad(id) }]} />
                    <Text style={styles.legendText}>{edades[id]?.nombre || id}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tooltip} accessibilityRole="summary" accessibilityLabel={`Año ${seleccionado.a}. ${serieInfo.nombre}: ${FORMATO.format(valorDelPunto(seleccionado, serieSeleccionada))}. Población: ${FORMATO.format(seleccionado.p)}. Edad: ${edades[seleccionado.e]?.nombre || seleccionado.e}.`}>
                <Text style={styles.tooltipTitle}>Año {seleccionado.a} · {edades[seleccionado.e]?.nombre || seleccionado.e}</Text>
                <Text style={styles.tooltipValues}>
                  {serieInfo.nombre}: {FORMATO.format(valorDelPunto(seleccionado, serieSeleccionada))}
                  {'  ·  '}Población: {FORMATO.format(seleccionado.p)}
                  {'\n'}Madera: {FORMATO.format(seleccionado.r?.madera || 0)}
                  {'  ·  '}Comida: {FORMATO.format(seleccionado.r?.comida || 0)}
                  {'\n'}Hierro: {FORMATO.format(seleccionado.r?.hierro || 0)}
                  {'  ·  '}Oro: {FORMATO.format(seleccionado.r?.oro || 0)}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.fondo },
  container: { flexGrow: 1, backgroundColor: theme.colors.fondo, padding: theme.spacing[16], paddingBottom: theme.spacing[32] },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], alignSelf: 'flex-start', paddingHorizontal: theme.spacing[8] },
  backText: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario, marginTop: theme.spacing[8] },
  subtitle: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[8], marginBottom: theme.spacing[16] },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginBottom: theme.spacing[16] },
  summaryCard: { flexGrow: 1, flexBasis: '30%', minWidth: 145, minHeight: 132, justifyContent: 'center', gap: theme.spacing[4], borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[12] },
  summaryTitle: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.small, marginTop: theme.spacing[4] },
  summaryValue: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.large, fontWeight: theme.typography.weights.bold },
  summaryDetail: { color: theme.colors.textoSecundario, fontSize: 12 },
  chartCard: { borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficie, padding: theme.spacing[12] },
  sectionTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  chartDescription: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.small, marginTop: theme.spacing[4] },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4], marginVertical: theme.spacing[12] },
  selectorButton: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[6], paddingHorizontal: theme.spacing[8] },
  selectorButtonActive: { backgroundColor: theme.colors.etiquetaBosque, borderColor: theme.colors.acento },
  selectorText: { color: theme.colors.textoSecundario, fontSize: 13 },
  selectorTextActive: { color: theme.colors.textoPrimario, fontWeight: theme.typography.weights.bold },
  emptyChart: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: theme.spacing[12] },
  emptyText: { color: theme.colors.textoSecundario, textAlign: 'center', fontSize: theme.typography.sizes.normal },
  accessibleSummary: { color: theme.colors.textoSecundario, fontSize: 12, marginBottom: theme.spacing[4] },
  chartFrame: { alignItems: 'center', alignSelf: 'center', maxWidth: '100%' },
  axisLabels: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingLeft: theme.spacing[32], paddingRight: theme.spacing[12] },
  axisText: { color: theme.colors.textoSecundario, fontSize: 11 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[8] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: theme.colors.textoSecundario, fontSize: 12 },
  tooltip: { marginTop: theme.spacing[12], borderRadius: theme.radius[6], backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12] },
  tooltipTitle: { color: theme.colors.acento, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  tooltipValues: { color: theme.colors.textoPrimario, fontSize: 13, lineHeight: 22, marginTop: theme.spacing[4] },
});
