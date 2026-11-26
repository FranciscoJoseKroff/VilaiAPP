import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { RESOURCE_ICONS, ResourceIcon } from './icons';
import { ResourceChip } from './ResourceChip';
import { formatoCorto } from '../game/format';
import { useGame } from '../context/GameContext';
import { calcularCapacidadesAldea } from '../game/simulation';
import { estacionEn } from '../game/tiempo';

// Primero los recursos del inicio de la partida; los de la cadena del pan quedan al final de la fila.
const ORDEN_RECURSOS = ['madera', 'comida', 'oro', 'hierro', 'trigo', 'harina', 'pan'];

// Fila de recursos siempre visible (HUD de Aldea y encabezado de las demás pestañas).
// Tocar un recurso muestra su detalle: capacidad, tasa y efecto de la estación.
export function FilaRecursos() {
  const game = useGame();
  const [detalleId, setDetalleId] = useState(null);
  const aldea = game.aldea;
  const capacidades = calcularCapacidadesAldea(aldea, game.catalogo);
  const estacion = estacionEn(aldea.ciclo?.segundos || 0);
  const estacionCatalogo = game.catalogo?.estaciones?.[estacion.id === 'otoño' ? 'otono' : estacion.id];
  const recursos = ORDEN_RECURSOS.map((id) => {
    const cantidad = Number(aldea.recursos?.[id] || 0);
    return {
      id,
      cantidad,
      capacidad: Number(capacidades[id] || 0),
      tasa: Math.round((Number(game.produccion[id] || 0) - cantidad) * 10) / 10,
      factorEstacional: estacionCatalogo?.recursos?.[id],
    };
  });
  const detalle = recursos.find((recurso) => recurso.id === detalleId);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recursos}>
        {recursos.map((recurso) => (
          <PildoraRecurso key={recurso.id} recurso={recurso} activa={recurso.id === detalleId} onPress={() => setDetalleId((actual) => actual === recurso.id ? null : recurso.id)} />
        ))}
      </ScrollView>
      {detalle ? (
        <ResourceChip resource={detalle.id} amount={detalle.cantidad} capacity={detalle.capacidad} rate={detalle.tasa} seasonFactor={detalle.factorEstacional} />
      ) : null}
    </>
  );
}

function PildoraRecurso({ recurso, activa, onPress }) {
  const { id, cantidad, capacidad } = recurso;
  const lleno = capacidad > 0 && cantidad >= capacidad;
  const proporcion = capacidad > 0 ? Math.min(1, cantidad / capacidad) : 0;
  const nombre = RESOURCE_ICONS[id]?.label || id;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nombre}: ${Math.floor(cantidad)}${capacidad > 0 ? ` de ${Math.floor(capacidad)}` : ''}${lleno ? ', lleno' : ''}. Toca para ver el detalle`}
      accessibilityState={{ expanded: activa }}
      onPress={onPress}
      style={({ pressed }) => [styles.pildora, lleno && styles.pildoraLlena, activa && styles.pildoraActiva, pressed && styles.presionado]}
    >
      <View style={styles.pildoraFila}>
        <ResourceIcon resource={id} size={18} />
        <Text style={[styles.cantidad, lleno && styles.cantidadLlena]}>{formatoCorto(cantidad)}</Text>
      </View>
      {capacidad > 0 ? (
        <View style={styles.capacidad}>
          <View style={[styles.capacidadRelleno, { width: `${proporcion * 100}%` }, lleno && styles.capacidadLlena]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recursos: { gap: theme.spacing[8], paddingRight: theme.spacing[12] },
  presionado: { transform: [{ translateY: 1 }], opacity: 0.85 },
  pildora: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.borde,
    backgroundColor: theme.colors.fondo,
  },
  pildoraLlena: { borderColor: theme.colors.peligro },
  pildoraActiva: { borderColor: theme.colors.acento, backgroundColor: theme.colors.superficieAlta },
  pildoraFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cantidad: { fontFamily: theme.typography.cifra.fontFamily, fontSize: 12, lineHeight: 16, color: theme.colors.textoPrimario },
  cantidadLlena: { color: theme.colors.peligro },
  capacidad: { height: 3, backgroundColor: theme.colors.superficieAlta, overflow: 'hidden' },
  capacidadRelleno: { height: '100%', backgroundColor: theme.colors.exito },
  capacidadLlena: { backgroundColor: theme.colors.peligro },
});
