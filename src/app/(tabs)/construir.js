import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { puedePagar } from '../../game/simulation';
import { describirEdificio } from '../../game/format';
import { BuildingCard } from '../../components/BuildingCard';
import { CostChips } from '../../components/CostChips';
import PixelPanel from '../../components/pixel/PixelPanel';
import PixelBar from '../../components/pixel/PixelBar';
import PixelButton from '../../components/pixel/PixelButton';

export default function ConstruirTab() {
  const game = useGame();
  const recursos = game.aldea?.recursos || {};
  const entradas = Object.entries(game.catalogo?.tiposEdificio || {});

  const getDatos = ([id, info]) => {
    const existente = game.aldea.edificios.find((e) => e.tipoId === id);
    const bloqueado = Boolean(info.requiereTecnologia && !(game.aldea.tecnologias?.[info.requiereTecnologia] || 0));
    const precio = game.costosMejora[id];
    const loading = Boolean(existente && !precio?.error && (!precio || precio.nivel !== existente.nivel));
    const costo = existente ? (precio?.nivel === existente.nivel ? precio.costo : null) : info.costoBase;
    const puede = Boolean(costo && puedePagar(recursos, costo));
    const faltante = costo ? Object.entries(costo).reduce((total, [recurso, cantidad]) => total + Math.max(0, cantidad - (recursos[recurso] || 0)), 0) : 999;
    return { id, info, existente, bloqueado, loading, costo, puede, faltante };
  };

  const construibles = entradas.map(getDatos);
  const disponibles = construibles.filter((item) => !item.bloqueado && item.puede && !item.loading).sort((a, b) => a.info.nombre.localeCompare(b.info.nombre));
  const casiDisponibles = construibles.filter((item) => !item.bloqueado && !item.puede && !item.loading && item.faltante < 999).sort((a, b) => a.faltante - b.faltante);
  const cargando = construibles.filter((item) => !item.bloqueado && item.loading);
  const bloqueados = construibles.filter((item) => item.bloqueado);
  const edificados = game.aldea.edificios || [];

  const renderCard = (item) => (
    <BuildingCard
      key={item.id}
      buildingId={item.id}
      info={item.info}
      existente={item.existente}
      cost={item.costo}
      available={recursos}
      costLoading={item.loading}
      blocked={item.bloqueado}
      canPay={item.puede}
      effect={describirEdificio(item.info)}
      onAction={() => game.tocarEdificio(item.id)}
    />
  );

  const damaged = edificados.filter((e) => (e.integridad ?? 100) < 100);

  return (
    <ScrollView contentContainerStyle={[styles.container, { maxWidth: 960, width: '100%', alignSelf: 'center' }]}>
      <Text style={styles.title}>Construir</Text>
      <Text style={styles.subtitle}>Expande la aldea y mejora sus edificios.</Text>

      {!edificados.length ? (
        <PixelPanel variant="normal" style={styles.empty}>
          <Text style={styles.emptyTitle}>La aldea está lista para comenzar</Text>
          <Text style={styles.emptyText}>Recomendación: construye una casa para aumentar la población máxima.</Text>
        </PixelPanel>
      ) : null}

      {disponibles.length ? <><Text style={styles.section}>Disponibles ahora</Text>{disponibles.map(renderCard)}</> : null}
      {casiDisponibles.length ? <><Text style={styles.section}>Casi disponibles</Text>{casiDisponibles.map(renderCard)}</> : null}
      {cargando.length ? <><Text style={styles.section}>Calculando mejoras</Text>{cargando.map(renderCard)}</> : null}
      {bloqueados.length ? <><Text style={styles.section}>Bloqueados</Text>{bloqueados.map(renderCard)}</> : null}

      {damaged.length ? <>
        <Text style={styles.section}>Reparaciones</Text>
        {damaged.map((edificio) => {
          const info = game.catalogo.tiposEdificio[edificio.tipoId];
          const integridad = edificio.integridad ?? 100;
          const costo = { madera: Math.ceil((100 - integridad) / 20) * 8 };
          const puedeReparar = puedePagar(recursos, costo);
          return (
            <PixelPanel key={edificio.tipoId} variant="elevada" style={styles.repair}>
              <View style={styles.repairHeader}><Text style={styles.repairName}>{info?.nombre || edificio.tipoId}</Text><Text style={styles.repairValue}>{integridad}%</Text></View>
              <PixelBar value={integridad / 100} continuous color="aviso" height={12} accessibilityLabel={`Integridad de ${info.nombre}`} />
              <CostChips resources={costo} available={recursos} />
              <PixelButton disabled={!puedeReparar} style={styles.repairButton} onPress={() => game.repararEdificio(edificio.tipoId)}>Reparar</PixelButton>
            </PixelPanel>
          );
        })}
      </> : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.colors.fondo, padding: theme.spacing[16] },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario },
  subtitle: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginBottom: theme.spacing[16] },
  section: { color: theme.colors.acento, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.heavy, marginTop: theme.spacing[12], marginBottom: theme.spacing[12] },
  empty: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[16], marginBottom: theme.spacing[8] },
  emptyTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  emptyText: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[8] },
  repair: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[16], marginBottom: theme.spacing[12] },
  repairHeader: { flexDirection: 'row', justifyContent: 'space-between' }, repairName: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, repairValue: { color: theme.colors.textoSecundario, fontSize: 14 },
  integrityTrack: { height: 6, borderRadius: theme.radius[6], overflow: 'hidden', backgroundColor: theme.colors.superficieAlta, marginTop: theme.spacing[8] }, integrityFill: { height: '100%', backgroundColor: theme.colors.aviso },
  repairButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.acento, borderRadius: theme.radius[10], marginTop: theme.spacing[12] }, buttonDisabled: { backgroundColor: theme.colors.superficieAlta, opacity: 0.75 }, repairText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  message: { color: theme.colors.textoPrimario, backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12], borderRadius: theme.radius[10], marginTop: theme.spacing[8], fontSize: 14 },
});
