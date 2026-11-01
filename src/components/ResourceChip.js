import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';
import { RESOURCE_ICONS, ResourceIcon } from './icons';
import { ContadorAnimado } from './ContadorAnimado';
import { TextoFlotante } from './TextoFlotante';
import PixelPanel from './pixel/PixelPanel';
import PixelBar from './pixel/PixelBar';

export const ResourceChip = memo(function ResourceChip({ resource, amount = 0, capacity, rate = 0, compact = false, showLabel = true, seasonFactor }) {
  const capacidad = Number(capacity) || 0;
  const lleno = capacidad > 0 && amount >= capacidad;
  const porcentaje = capacidad > 0 ? Math.max(0, Math.min(1, amount / capacidad)) : 0;
  const previous = useRef(Number(amount));
  const diferenciaAnterior = Math.abs(Number(amount) - previous.current);
  const animarCantidad = diferenciaAnterior / Math.max(1, capacidad) > 0.02;
  const advertencia = capacidad > 0 && porcentaje >= 0.8 && !lleno;
  const etiqueta = RESOURCE_ICONS[resource]?.label || resource;
  const tasaTexto = `${rate >= 0 ? '+' : ''}${Number(rate).toFixed(1)}/s`;
  const factorEstacional = Number(seasonFactor ?? 1);
  const indicadorEstacional = factorEstacional !== 1 ? (factorEstacional > 1 ? '▲ por la estación' : '▼ por la estación') : '';
  const [cambioGrande, setCambioGrande] = useState(null);
  const pulsoAlerta = useSharedValue(1);

  useEffect(() => {
    const diferencia = Number(amount) - previous.current;
    previous.current = Number(amount);
    // Solo cambios destacados: el tick normal debe añadir variaciones menores.
    if (Math.abs(diferencia) >= 5) {
      setCambioGrande({ id: `${Date.now()}-${diferencia}`, cantidad: diferencia });
    }
  }, [amount]);

  useEffect(() => {
    pulsoAlerta.value = lleno
      ? withRepeat(withTiming(0.55, { duration: 700 }), -1, true)
      : 1;
  }, [lleno, pulsoAlerta]);

  const estiloAlerta = useAnimatedStyle(() => ({
    opacity: pulsoAlerta.value,
  }));

  return (
    <PixelPanel variant={lleno ? 'peligro' : 'normal'} style={[styles.chip, compact && styles.chipCompact]} accessibilityLabel={`${etiqueta}: ${Math.floor(amount)}`}>
      <View style={styles.heading}>
        <ResourceIcon resource={resource} size={compact ? 16 : 18} />
        <View style={styles.copy}>
          {showLabel && <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>{etiqueta}</Text>}
          <View style={styles.amountRow}>
            <ContadorAnimado
              value={amount}
              style={[styles.amount, compact && styles.amountCompact]}
              formato={(valor) => `${Math.floor(valor)}${capacidad > 0 ? ` / ${Math.floor(capacidad)}` : ''}`}
              compacto={compact}
              animate={animarCantidad}
            />
            {cambioGrande ? <TextoFlotante cantidad={cambioGrande.cantidad} id={cambioGrande.id} /> : null}
          </View>
        </View>
      </View>
      {capacidad > 0 ? (
        <PixelBar value={porcentaje} segments={20} color={lleno ? 'peligro' : advertencia ? 'acento' : 'exito'} height={10} continuous accessibilityLabel={`Capacidad de ${etiqueta}`} />
      ) : null}
      <View style={styles.footer}>
        {lleno ? (
          <Animated.Text style={[styles.rate, styles.fullText, estiloAlerta]}>{'Lleno'}</Animated.Text>
        ) : (
          <Text style={[styles.rate, advertencia && styles.warningText]}>{tasaTexto}</Text>
        )}
        {indicadorEstacional ? <Text style={[styles.seasonIndicator, factorEstacional > 1 ? styles.seasonUp : styles.seasonDown]}>{indicadorEstacional}</Text> : null}
      </View>
      </PixelPanel>
  );
});

const styles = StyleSheet.create({
  chip: { flexGrow: 1, position: 'relative' },
  chipCompact: { minWidth: 76, padding: theme.spacing[4], alignItems: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', minWidth: 0 }, copy: { marginLeft: theme.spacing[4], flex: 1, minWidth: 0 },
  label: { color: theme.colors.textoSecundario, fontSize: 14 }, labelCompact: { fontSize: 14 },
  amountRow: { position: 'relative' },   amount: { ...theme.typography.cifra, fontSize: theme.typography.sizes.normal, lineHeight: 22, fontWeight: theme.typography.weights.bold },   amountCompact: { fontFamily: undefined, fontSize: 14, lineHeight: 18 },
  capacityTrack: { height: 4, backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius[6], overflow: 'hidden', marginTop: theme.spacing[8] },
  capacityFill: { height: '100%', backgroundColor: theme.colors.exito }, capacityWarning: { backgroundColor: theme.colors.acento }, capacityFull: { backgroundColor: theme.colors.peligro },
  footer: { minHeight: 18, marginTop: theme.spacing[4] }, rate: { color: theme.colors.exito, fontSize: 14, fontWeight: theme.typography.weights.semibold }, warningText: { color: theme.colors.acento }, fullText: { color: theme.colors.peligro }, seasonIndicator: { fontSize: 12, marginTop: 2 }, seasonUp: { color: theme.colors.exito }, seasonDown: { color: theme.colors.aviso },
});
