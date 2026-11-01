import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { theme } from '../theme';
import { AppIcon } from './icons';
import PixelBar from './pixel/PixelBar';
import PixelButton from './pixel/PixelButton';
import { AvatarAldeano } from './AvatarAldeano';

const NOMBRES_PROFESION = { lenador: 'Leñador', granjero: 'Granjero', agricultor: 'Agricultor', minero: 'Minero', guardia: 'Guardia', sin_oficio: 'Sin oficio' };

function Barra({ nombre, valor, color }) {
  const porcentaje = Math.max(0, Math.min(100, Number(valor || 0)));
  return <View style={styles.bar}><View style={styles.barLabel}><Text style={styles.barName}>{nombre}</Text><Text style={styles.barValue}>{porcentaje}%</Text></View><PixelBar value={porcentaje / 100} continuous color={color} height={10} accessibilityLabel={nombre} /></View>;
}

export const VillagerBottomSheet = forwardRef(function VillagerBottomSheet({ aldeano, trabajosDisponibles = [], oro = 0, onAsignar, onBendecir, onClose }, ref) {
  const sheet = useRef(null);
  const snaps = useMemo(() => ['58%', '92%'], []);
  useImperativeHandle(ref, () => ({
    abrir: () => sheet.current?.snapToIndex(0),
    cerrar: () => sheet.current?.close(),
  }), []);

  useEffect(() => { if (aldeano) sheet.current?.snapToIndex(0); }, [aldeano]);
  if (!aldeano) return null;
  const necesidades = aldeano.necesidades || {};
  const rasgos = Array.isArray(aldeano.rasgos) ? aldeano.rasgos : [aldeano.rasgo].filter(Boolean);
  const profesion = aldeano.profesion || aldeano.trabajo || 'sin_oficio';
  const bendicionDisponible = oro >= 10;

  return (
    <BottomSheet ref={sheet} index={-1} snapPoints={snaps} enablePanDownToClose onClose={onClose} backgroundStyle={styles.background} handleIndicatorStyle={styles.handle}>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AvatarAldeano aldeano={aldeano} size={64} />
          <Text style={styles.name}>{aldeano.nombre || 'Aldeano'}</Text>
        </View>
        <Text style={styles.meta}>{Number(aldeano.edad || 18)} años · {NOMBRES_PROFESION[profesion] || profesion}</Text>
        <View style={styles.traits}>{rasgos.map((rasgo) => <View key={rasgo} style={styles.trait}><Text style={styles.traitText}>{rasgo}</Text></View>)}</View>
        <Text style={styles.activityTitle}>Ahora mismo</Text>
        <View style={styles.activity}><AppIcon name="account-hard-hat-outline" size={22} color={theme.colors.acento} /><Text style={styles.activityText}>{aldeano.pensamientoActual || aldeano.actividadActual || 'Descansando en la aldea'}</Text></View>
        <Barra nombre="Hambre" valor={necesidades.hambre} color={theme.colors.aviso} />
        <Barra nombre="Energía" valor={necesidades.energia} color={theme.colors.estacionVeranoCielo} />
        <Barra nombre="Ánimo" valor={necesidades.animo} color={theme.colors.exito} />
        <Text style={styles.section}>Profesión</Text>
        <View style={styles.jobs}>{trabajosDisponibles.map((trabajo) => <PixelButton key={trabajo.id} disabled={trabajo.id === profesion} variant={trabajo.id === profesion ? 'secundario' : 'fantasma'} style={styles.job} onPress={() => onAsignar(trabajo.id)}>{trabajo.nombre}</PixelButton>)}</View>
        <PixelButton disabled={!bendicionDisponible} style={styles.bless} onPress={onBendecir}>Bendecir · 10 oro</PixelButton>
        <Text style={styles.section}>Últimas acciones</Text>
        {(Array.isArray(aldeano.historial) ? aldeano.historial : []).slice(0, 5).map((accion, indice) => <View key={`${accion}-${indice}`} style={styles.history}><View style={styles.historyDot} /><Text style={styles.historyText}>{accion}</Text></View>)}
        {!aldeano.historial?.length ? <Text style={styles.empty}>Todavía no hay acciones registradas.</Text> : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  background: { backgroundColor: theme.colors.superficie, borderTopLeftRadius: theme.radius[16], borderTopRightRadius: theme.radius[16] },
  handle: { backgroundColor: theme.colors.borde, width: 44 },
  content: { paddingHorizontal: theme.spacing[16], paddingBottom: theme.spacing[32] },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12], minHeight: 64 },
  name: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  meta: { color: theme.colors.textoSecundario, marginTop: 4 },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], marginTop: theme.spacing[12] },
  trait: { backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[10], paddingHorizontal: 10, paddingVertical: 5 },
  traitText: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, fontSize: 12 },
  activityTitle: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[20] },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 8, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, padding: 10 },
  activityText: { flex: 1, color: theme.colors.textoPrimario },
  bar: { marginTop: theme.spacing[12] },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  barName: { color: theme.colors.textoSecundario },
  barValue: { color: theme.colors.textoPrimario },
  track: { height: 8, marginTop: 4, overflow: 'hidden', borderRadius: 4, backgroundColor: theme.colors.borde },
  fill: { height: '100%', borderRadius: 4 },
  section: { color: theme.colors.acento, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[20], marginBottom: 8 },
  jobs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  job: { borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[10], paddingHorizontal: 12, paddingVertical: 9 },
  jobActive: { borderColor: theme.colors.acento, backgroundColor: theme.colors.superficieAlta },
  jobText: { color: theme.colors.textoPrimario },
  bless: { marginTop: theme.spacing[16], minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius[10], backgroundColor: theme.colors.acento },
  disabled: { opacity: 0.45 },
  blessText: { color: theme.colors.superficie, fontWeight: theme.typography.weights.bold },
  history: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  historyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.acento },
  historyText: { color: theme.colors.textoSecundario },
  empty: { color: theme.colors.textoSecundario },
});
