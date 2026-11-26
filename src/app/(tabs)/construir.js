import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { puedePagar } from '../../game/simulation';
import { datosConstruccion } from '../../game/construccion';
import { describirEdificio } from '../../game/format';
import { BuildingCard } from '../../components/BuildingCard';
import { CostChips } from '../../components/CostChips';
import PixelPanel from '../../components/pixel/PixelPanel';
import PixelBar from '../../components/pixel/PixelBar';
import PixelButton from '../../components/pixel/PixelButton';
import { EncabezadoPestana } from '../../components/EncabezadoPestana';
import { AppIcon } from '../../components/icons';

export default function ConstruirTab() {
  const game = useGame();
  const recursos = game.aldea?.recursos || {};
  const [verBloqueados, setVerBloqueados] = useState(false);
  const construibles = datosConstruccion(game.aldea, game.catalogo, game.costosMejora);
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
      blockedReason={item.bloqueo}
      maxLevelReached={item.maximo}
      canPay={item.puede}
      effect={describirEdificio(item.info)}
      onAction={() => game.tocarEdificio(item.id)}
    />
  );

  const damaged = edificados.filter((e) => (e.integridad ?? 100) < 100);

  return (
    <View style={styles.pantalla}>
    <EncabezadoPestana titulo="Construir" />
    <ScrollView contentContainerStyle={[styles.container, { maxWidth: 960, width: '100%', alignSelf: 'center' }]}>
      {!edificados.length ? (
        <PixelPanel variant="normal" style={styles.empty}>
          <Text style={styles.emptyTitle}>La aldea está lista para comenzar</Text>
          <Text style={styles.emptyText}>Recomendación: construye una casa para aumentar la población máxima.</Text>
        </PixelPanel>
      ) : null}

      {disponibles.length ? <><Text style={styles.section}>Disponibles ahora</Text>{disponibles.map(renderCard)}</> : null}
      {casiDisponibles.length ? <><Text style={styles.section}>Casi disponibles</Text>{casiDisponibles.map(renderCard)}</> : null}
      {cargando.length ? <><Text style={styles.section}>Calculando mejoras</Text>{cargando.map(renderCard)}</> : null}
      {bloqueados.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: verBloqueados }}
            accessibilityLabel={`${verBloqueados ? 'Ocultar' : 'Ver'} bloqueados, ${bloqueados.length}`}
            style={styles.plegable}
            onPress={() => setVerBloqueados((actual) => !actual)}
          >
            <Text style={styles.section}>Bloqueados ({bloqueados.length})</Text>
            <AppIcon name={verBloqueados ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.acento} />
          </Pressable>
          {verBloqueados ? bloqueados.map(renderCard) : null}
        </>
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: theme.colors.fondo },
  container: { flexGrow: 1, backgroundColor: theme.colors.fondo, padding: theme.spacing[12], paddingBottom: 88 },
  section: { fontFamily: theme.typography.titulo.fontFamily, fontSize: 12, lineHeight: 18, color: theme.colors.acento, marginTop: theme.spacing[12], marginBottom: theme.spacing[8] },
  plegable: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[16], marginBottom: theme.spacing[8] },
  emptyTitle: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  emptyText: { color: theme.colors.textoSecundario, fontSize: theme.typography.sizes.normal, marginTop: theme.spacing[8] },
  repair: { backgroundColor: theme.colors.superficie, borderWidth: 1, borderColor: theme.colors.borde, borderRadius: theme.radius[16], padding: theme.spacing[16], marginBottom: theme.spacing[12] },
  repairHeader: { flexDirection: 'row', justifyContent: 'space-between' }, repairName: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold }, repairValue: { color: theme.colors.textoSecundario, fontSize: 14 },
  integrityTrack: { height: 6, borderRadius: theme.radius[6], overflow: 'hidden', backgroundColor: theme.colors.superficieAlta, marginTop: theme.spacing[8] }, integrityFill: { height: '100%', backgroundColor: theme.colors.aviso },
  repairButton: { marginTop: theme.spacing[12] }, buttonDisabled: { backgroundColor: theme.colors.superficieAlta, opacity: 0.75 }, repairText: { color: theme.colors.superficie, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.bold },
  message: { color: theme.colors.textoPrimario, backgroundColor: theme.colors.superficieAlta, padding: theme.spacing[12], borderRadius: theme.radius[10], marginTop: theme.spacing[8], fontSize: 14 },
});
