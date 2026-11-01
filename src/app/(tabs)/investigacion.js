import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../../../theme';
import { useGame } from '../../context/GameContext';
import { AppIcon } from '../../components/icons';
import NodoInvestigacion from '../../components/NodoInvestigacion';
import InvestigacionBottomSheet from '../../components/InvestigacionBottomSheet';
import { efectoDescripcion, formatearCosto, textoRequisito } from '../../game/format';
import { costoDe, efectosActivos, nivelDe, puedeInvestigar } from '../../game/investigacion';

const RAMAS = [
  { id: 'economia', nombre: 'Economía', color: theme.colors.exito },
  { id: 'industria', nombre: 'Industria', color: theme.colors.pan },
  { id: 'defensa', nombre: 'Defensa', color: theme.colors.peligro },
  { id: 'saber', nombre: 'Saber', color: theme.colors.estacionVeranoCielo },
];

const NOMBRES_RECURSOS = {
  madera: 'madera', comida: 'comida', oro: 'oro', trigo: 'trigo',
  harina: 'harina', pan: 'pan', hierro: 'hierro',
};
const NOMBRES_ESTACIONES = { primavera: 'primavera', verano: 'verano', otono: 'otoño', otoño: 'otoño', invierno: 'invierno' };
const NOMBRES_DESBLOQUEOS = { observatorio: 'el Observatorio antiguo' };
const NOMBRES_EVENTOS = { bestias: 'bestias', helada: 'heladas', recaudador: 'recaudadores' };
const ARBOL_VACIO = [];

function numeroBonito(valor) {
  return Number((Number(valor) || 0).toFixed(1)).toString().replace('.', ',');
}

function porcentaje(valor) {
  const numero = Number(valor) || 0;
  return `${numero < 0 ? '−' : '+'}${numeroBonito(Math.abs(numero) * 100)} %`;
}

function bonosActivosTexto(efectos) {
  const bonos = [];
  if (efectos.produccionGeneral) bonos.push(`${porcentaje(efectos.produccionGeneral)} de producción general`);
  if (efectos.bonoReliquias) bonos.push(`${porcentaje(efectos.bonoReliquias)} de producción por reliquias`);
  for (const [recurso, valor] of Object.entries(efectos.produccionRecurso)) {
    bonos.push(`${porcentaje(valor)} de ${NOMBRES_RECURSOS[recurso] || 'recurso'}`);
  }
  for (const [recurso, valor] of Object.entries(efectos.capacidadPlana)) {
    const nombre = recurso === '*' ? 'todos los recursos' : NOMBRES_RECURSOS[recurso] || 'recursos';
    bonos.push(`${valor > 0 ? '+' : ''}${numeroBonito(valor)} de capacidad para ${nombre}`);
  }
  for (const [recurso, valor] of Object.entries(efectos.capacidadPct)) {
    const nombre = recurso === '*' ? 'todos los recursos' : NOMBRES_RECURSOS[recurso] || 'recursos';
    bonos.push(`${porcentaje(valor)} de capacidad para ${nombre}`);
  }
  for (const [estacion, recursos] of Object.entries(efectos.estacionMod)) {
    for (const [recurso, valor] of Object.entries(recursos)) {
      bonos.push(`${porcentaje(valor)} de ${NOMBRES_RECURSOS[recurso] || 'recurso'} en ${NOMBRES_ESTACIONES[estacion] || 'una estación'}`);
    }
  }
  for (const [recurso, valor] of Object.entries(efectos.multiplicadorRecurso)) {
    bonos.push(`${NOMBRES_RECURSOS[recurso] || 'Recurso'} ×${numeroBonito(valor)}`);
  }
  for (const [recurso, valor] of Object.entries(efectos.reduccionDanoTipo)) {
    const evento = recurso === '*' ? 'eventos' : NOMBRES_EVENTOS[recurso] || 'un evento';
    bonos.push(`${porcentaje(valor)} de reducción de daño de ${evento}`);
  }
  for (const [recurso, valor] of Object.entries(efectos.bonoRasgoProduccion)) {
    const nombre = recurso === '*' ? 'recursos' : NOMBRES_RECURSOS[recurso] || 'recurso';
    bonos.push(`${porcentaje(valor)} de producción por rasgos de ${nombre}`);
  }
  if (efectos.reduccionDanoEventos) bonos.push(`${porcentaje(efectos.reduccionDanoEventos)} de reducción de daño de eventos`);
  if (efectos.guardiaEficacia) bonos.push(`${numeroBonito(efectos.guardiaEficacia)} de eficacia de guardia`);
  if (efectos.avisoEventoSegundos) bonos.push(`${numeroBonito(efectos.avisoEventoSegundos)} s de aviso de eventos`);
  if (efectos.iaIntervaloSegundos) bonos.push(`${efectos.iaIntervaloSegundos > 0 ? '+' : '−'}${numeroBonito(Math.abs(efectos.iaIntervaloSegundos))} s al intervalo de la IA`);
  if (efectos.iaBonoRasgo) bonos.push(`${porcentaje(efectos.iaBonoRasgo)} para rasgos de aldeanos`);
  if (efectos.pronosticoEdadAnios) bonos.push(`${numeroBonito(efectos.pronosticoEdadAnios)} años de pronóstico de edades`);
  if (efectos.velocidadInvestigacion !== 1) bonos.push(`Velocidad de investigación ×${numeroBonito(efectos.velocidadInvestigacion)}`);
  if (efectos.costoInvestigacion !== 1) bonos.push(`Costo de investigación ×${numeroBonito(efectos.costoInvestigacion)}`);
  if (efectos.costoConstruccion !== 1) bonos.push(`Costo de construcción ×${numeroBonito(efectos.costoConstruccion)}`);
  if (efectos.consumoMineros !== 1) bonos.push(`Consumo de pan de mineros ×${numeroBonito(efectos.consumoMineros)}`);
  if (efectos.inmunidadEvento.length > 0) {
    const eventos = efectos.inmunidadEvento.map((evento) => (
      evento === '*' ? 'eventos' : NOMBRES_EVENTOS[evento] || 'un evento'
    )).join(', ');
    bonos.push(`Inmunidad a ${eventos}`);
  }
  if (efectos.desbloquea.length > 0) {
    bonos.push(`Desbloquea ${efectos.desbloquea.map((id) => NOMBRES_DESBLOQUEOS[id] || 'una mejora').join(', ')}`);
  }
  return bonos;
}

function requisitosDe(nodo, aldea) {
  const tecnologias = (nodo.requiere || []).map((requisito) => ({
    texto: textoRequisito(requisito),
    cumplido: nivelDe(aldea, requisito.id) >= requisito.nivel,
  }));
  const edificios = (nodo.requiereEdificio || []).map((requisito) => {
    const edificio = (aldea.edificios || []).find((item) => item.tipoId === requisito.tipoId);
    return {
      texto: textoRequisito(requisito),
      cumplido: Boolean(edificio && Number(edificio.nivel || 1) >= requisito.nivel),
    };
  });
  return [...tecnologias, ...edificios];
}

function estaCompleto(nodo, aldea) {
  const nivel = nivelDe(aldea, nodo.id);
  return (nodo.maxNivel != null && nivel >= nodo.maxNivel) || (nodo.permanente && nivel > 0);
}

function puntajeDeCosto(nodo, aldea) {
  const costo = costoDe(nodo, nivelDe(aldea, nodo.id));
  const reliquiasDisponibles = Math.max(0,
    (Number(aldea.legado?.reliquias) || 0) - (Number(aldea.legado?.reliquiasGastadas) || 0)
  );
  const costoRecursos = Object.entries(costo.recursos).reduce((total, [recurso, cantidad]) => (
    total + cantidad / Math.max(1, Number(aldea.recursos?.[recurso]) || 0)
  ), 0);
  return costoRecursos + costo.reliquias / Math.max(1, reliquiasDisponibles);
}

function NodoEnRama({ nodo, aldea, sugerido, seleccionado, pulso, onSelect }) {
  const nivel = nivelDe(aldea, nodo.id);
  const disponibilidad = puedeInvestigar(aldea, nodo);
  const requisitosOk = (nodo.requiere || []).every((requisito) => nivelDe(aldea, requisito.id) >= requisito.nivel)
    && (nodo.requiereEdificio || []).every((requisito) => {
      const edificio = (aldea.edificios || []).find((item) => item.tipoId === requisito.tipoId);
      return Boolean(edificio && Number(edificio.nivel || 1) >= requisito.nivel);
    });
  const completado = estaCompleto(nodo, aldea);
  const efectoTexto = efectoDescripcion(nodo, completado ? nivel : nivel + 1);
  const estado = completado
    ? 'complete'
    : !requisitosOk
      ? 'blocked'
      : disponibilidad.ok
        ? sugerido ? 'reachable' : 'available'
        : 'noResources';
  const costo = costoDe(nodo, nivel);
  const costoTexto = [
    formatearCosto(costo.recursos),
    costo.reliquias > 0 ? `${costo.reliquias} reliquias` : '',
  ].filter(Boolean).join(' · ') || 'sin costo';
  const nivelTexto = nodo.maxNivel == null ? `Nivel ${nivel}` : `Nivel ${nivel}/${nodo.maxNivel}`;

  return (
    <NodoInvestigacion
      nodo={nodo}
      nivel={nivel}
      nivelTexto={nivelTexto}
      efectoTexto={efectoTexto}
      estado={estado}
      costoTexto={costoTexto}
      sugerido={sugerido}
      seleccionado={seleccionado}
      requisitos={requisitosDe(nodo, aldea)}
      pulso={pulso}
      onSelect={onSelect}
    />
  );
}

function RamaArbol({ rama, nodos, aldea, ancho, sugeridoId, seleccionadoId, pulso, onSelect }) {
  const ordenados = [...nodos].sort((a, b) => (
    (a.posicion?.fila || 0) - (b.posicion?.fila || 0)
    || (a.posicion?.columna || 0) - (b.posicion?.columna || 0)
  ));
  const filas = [...new Set(ordenados.map((nodo, index) => nodo.posicion?.fila ?? index))];
  const columnas = ordenados.map((nodo, index) => nodo.posicion?.columna ?? index);
  const columnaMinima = columnas.length ? Math.min(...columnas) : 0;
  const cantidadColumnas = Math.max(1, ...columnas.map((columna) => columna - columnaMinima + 1));
  const espacio = theme.spacing[8];
  const anchoCelda = (ancho - espacio * (cantidadColumnas - 1)) / cantidadColumnas;

  return (
    <View style={[styles.branch, { width: ancho, borderTopColor: rama.color }]}>
      <View style={styles.branchHeading}>
        <View style={[styles.branchMark, { backgroundColor: rama.color }]} />
        <Text style={styles.branchTitle}>{rama.nombre}</Text>
        <Text style={styles.branchCount}>{nodos.length}</Text>
      </View>
      {nodos.length === 0 ? <Text style={styles.emptyBranch}>Sin investigaciones en esta rama.</Text> : filas.map((fila) => {
        const filaNodos = ordenados.filter((nodo, index) => (nodo.posicion?.fila ?? index) === fila);
        const nodosPorColumna = new Map(filaNodos.map((nodo, index) => [
          Math.max(0, (nodo.posicion?.columna ?? index) - columnaMinima),
          nodo,
        ]));
        return (
          <View key={`fila-${fila}`} style={[styles.nodeRow, { marginTop: fila === filas[0] ? theme.spacing[8] : theme.spacing[16] }]}>
            {Array.from({ length: cantidadColumnas }, (_, columna) => {
              const nodo = nodosPorColumna.get(columna);
              return (
                <View key={`columna-${columna}`} style={{ width: anchoCelda, marginRight: columna < cantidadColumnas - 1 ? espacio : 0 }}>
                  {nodo ? (
                    <NodoEnRama
                      nodo={nodo}
                      aldea={aldea}
                      sugerido={sugeridoId === nodo.id}
                      seleccionado={seleccionadoId === nodo.id}
                      pulso={pulso?.id === nodo.id ? pulso.clave : 0}
                      onSelect={onSelect}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function InvestigacionBloqueada({ centroNivel }) {
  return (
    <View style={styles.locked}>
      <AppIcon name="lock-outline" size={36} color={theme.colors.aviso} />
      <Text style={styles.lockedTitle}>Falta el Centro de Investigación</Text>
      <Text style={styles.lockedText}>Construye un Centro de Investigación para acceder al árbol.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Ir a Construir para construir el Centro de Investigación" style={styles.buildButton} onPress={() => router.push('/construir')}>
        <AppIcon name="hammer-wrench" size={18} color={theme.colors.fondo} />
        <Text style={styles.buildButtonText}>Ir a Construir</Text>
      </Pressable>
      <Text style={styles.centerLevel}>Nivel del Centro de Investigación: {centroNivel}</Text>
    </View>
  );
}

export default function InvestigacionTab() {
  const game = useGame();
  const { width: anchoPantalla } = useWindowDimensions();
  const [ramaSeleccionada, setRamaSeleccionada] = useState('economia');
  const [nodoSeleccionadoId, setNodoSeleccionadoId] = useState(null);
  const [pulso, setPulso] = useState(null);
  const nivelesAnteriores = useRef(null);
  const seleccionarNodo = useCallback((id) => setNodoSeleccionadoId(id), []);
  const cerrarFicha = useCallback(() => setNodoSeleccionadoId(null), []);
  const aldea = game.aldea;
  const catalogo = game.catalogo;
  const arbol = catalogo?.arbol || ARBOL_VACIO;
  const esAncha = anchoPantalla >= 900;
  const anchoContenido = Math.max(280, Math.min(1280, anchoPantalla - 32));
  const anchoRama = esAncha ? Math.max(190, (anchoContenido - 36) / RAMAS.length) : anchoContenido;

  const efectos = useMemo(() => (
    efectosActivos(aldea, arbol, catalogo?.reliquias)
  ), [aldea, arbol, catalogo?.reliquias]);
  const bonos = useMemo(() => bonosActivosTexto(efectos), [efectos]);
  const centro = aldea?.edificios?.find((edificio) => edificio.tipoId === 'centroInvestigacion');
  const centroNivel = Number(centro?.nivel) || 0;
  const reliquias = Number(aldea?.legado?.reliquias) || 0;
  const gastadas = Number(aldea?.legado?.reliquiasGastadas) || 0;
  const disponibles = Math.max(0, reliquias - gastadas);

  // Sugerido minimiza la suma de coste/recursos actuales entre nodos ya investigables.
  const sugeridoId = useMemo(() => {
    const candidatos = arbol
      .filter((nodo) => !estaCompleto(nodo, aldea) && puedeInvestigar(aldea, nodo).ok)
      .map((nodo, indice) => ({ nodo, indice, puntaje: puntajeDeCosto(nodo, aldea) }))
      .sort((a, b) => a.puntaje - b.puntaje || a.indice - b.indice);
    return candidatos[0]?.nodo.id || null;
  }, [arbol, aldea]);

  useEffect(() => {
    const tecnologias = aldea?.tecnologias;
    if (!tecnologias) return;
    const anterior = nivelesAnteriores.current;
    if (anterior) {
      const investigacionCompletada = Object.keys(tecnologias).find((id) => (
        (Number(tecnologias[id]) || 0) > (Number(anterior[id]) || 0)
      ));
      if (investigacionCompletada) {
        setPulso((actual) => ({ id: investigacionCompletada, clave: (actual?.clave || 0) + 1 }));
      }
    }
    nivelesAnteriores.current = { ...tecnologias };
  }, [aldea?.tecnologias]);

  useEffect(() => {
    if (!pulso) return undefined;
    const temporizador = setTimeout(() => setPulso((actual) => (actual?.clave === pulso.clave ? null : actual)), 800);
    return () => clearTimeout(temporizador);
  }, [pulso]);

  if (!aldea || !catalogo) return null;

  const nodoSeleccionado = arbol.find((nodo) => nodo.id === nodoSeleccionadoId) || null;
  const disponibilidadSeleccionada = nodoSeleccionado
    ? puedeInvestigar(aldea, nodoSeleccionado)
    : { ok: false, motivo: '' };
  const ramasVisibles = esAncha ? RAMAS : RAMAS.filter((rama) => rama.id === ramaSeleccionada);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.content, { width: anchoContenido }]}>
          <Text accessibilityRole="header" style={styles.title}>Investigación</Text>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <AppIcon name="diamond-stone" size={20} color={theme.colors.acento} />
              <Text style={styles.summaryText}>Reliquias: {disponibles} disponibles / {reliquias} totales</Text>
            </View>
            <View style={styles.summaryItem}>
              <AppIcon name="flask" size={20} color={theme.colors.acento} />
              <Text style={styles.summaryText}>Centro de Investigación · nivel {centroNivel}</Text>
            </View>
          </View>

          <View style={styles.bonuses}>
            <Text style={styles.sectionTitle}>Bonos activos</Text>
            {bonos.length > 0 ? (
              <View style={styles.bonusList}>
                {bonos.map((bono, index) => <Text key={`${bono}-${index}`} style={styles.bonusText}>• {bono}</Text>)}
              </View>
            ) : <Text style={styles.muted}>Aún no hay bonos de investigación activos.</Text>}
          </View>

          {!centro ? <InvestigacionBloqueada centroNivel={centroNivel} /> : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchSelector}>
                {RAMAS.map((rama) => {
                  const seleccionada = ramaSeleccionada === rama.id;
                  return (
                    <Pressable
                      key={rama.id}
                      accessibilityRole="tab"
                      accessibilityLabel={`Rama ${rama.nombre}`}
                      accessibilityState={{ selected: seleccionada }}
                      style={[styles.branchChip, seleccionada && { borderColor: rama.color, backgroundColor: `${rama.color}20` }]}
                      onPress={() => { setRamaSeleccionada(rama.id); if (!esAncha) cerrarFicha(); }}
                    >
                      <View style={[styles.chipMark, { backgroundColor: rama.color }]} />
                      <Text style={[styles.branchChipText, seleccionada && { color: rama.color }]}>{rama.nombre}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {sugeridoId ? <Text style={styles.suggestionRule}>Sugerido: menor coste relativo entre las investigaciones que ya puedes pagar.</Text> : null}
              <ScrollView horizontal={esAncha} showsHorizontalScrollIndicator={esAncha} contentContainerStyle={[styles.board, esAncha && { minWidth: anchoRama * RAMAS.length + theme.spacing[12] * (RAMAS.length - 1) }]}>
                {ramasVisibles.map((rama) => (
                  <RamaArbol
                    key={rama.id}
                    rama={rama}
                    nodos={arbol.filter((nodo) => nodo.rama === rama.id)}
                    aldea={aldea}
                    ancho={anchoRama}
                    sugeridoId={sugeridoId}
                    seleccionadoId={nodoSeleccionadoId}
                    pulso={pulso}
                    onSelect={seleccionarNodo}
                  />
                ))}
              </ScrollView>
              {arbol.length === 0 ? <Text style={styles.muted}>No hay investigaciones disponibles.</Text> : null}
            </>
          )}
        </View>
      </ScrollView>

      <InvestigacionBottomSheet
        visible={Boolean(nodoSeleccionado)}
        nodo={nodoSeleccionado}
        aldea={aldea}
        disponibilidad={disponibilidadSeleccionada}
        onClose={cerrarFicha}
        onInvestigar={game.investigar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.fondo },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: theme.spacing[32] },
  content: { maxWidth: 1280, paddingTop: theme.spacing[16] },
  title: { ...theme.typography.titulo, color: theme.colors.textoPrimario },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8], paddingVertical: theme.spacing[12], borderBottomWidth: 1, borderBottomColor: theme.colors.borde },
  summaryItem: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], paddingRight: theme.spacing[16] },
  summaryText: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.semibold },
  bonuses: { paddingVertical: theme.spacing[12], borderBottomWidth: 1, borderBottomColor: theme.colors.borde },
  sectionTitle: { ...theme.typography.titulo, color: theme.colors.acento, fontSize: 16, lineHeight: 24, marginBottom: theme.spacing[4] },
  bonusList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing[16], rowGap: theme.spacing[4] },
  bonusText: { color: theme.colors.textoSecundario, fontSize: 14, lineHeight: 20 },
  muted: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: theme.spacing[4] },
  branchSelector: { flexDirection: 'row', gap: theme.spacing[8], paddingVertical: theme.spacing[12] },
  branchChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], borderRadius: theme.radius[10], borderWidth: 1, borderColor: theme.colors.borde, backgroundColor: theme.colors.superficie, paddingHorizontal: theme.spacing[12] },
  chipMark: { width: 9, height: 9, borderRadius: 5 },
  branchChipText: { color: theme.colors.textoSecundario, fontSize: 14, fontWeight: theme.typography.weights.semibold },
  suggestionRule: { color: theme.colors.textoSecundario, fontSize: 14, marginBottom: theme.spacing[8] },
  board: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[12], paddingBottom: theme.spacing[8] },
  branch: { borderTopWidth: 2, paddingTop: theme.spacing[8], paddingBottom: theme.spacing[16] },
  branchHeading: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  branchMark: { width: 12, height: 12, borderRadius: 6 },
  branchTitle: { flex: 1, color: theme.colors.textoPrimario, fontSize: 16, fontWeight: theme.typography.weights.bold },
  branchCount: { color: theme.colors.textoSecundario, fontSize: 14 },
  nodeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  emptyBranch: { color: theme.colors.textoSecundario, fontSize: 14, paddingVertical: theme.spacing[12] },
  locked: { alignItems: 'center', paddingVertical: theme.spacing[24], paddingHorizontal: theme.spacing[16], borderTopWidth: 1, borderTopColor: theme.colors.borde },
  lockedTitle: { color: theme.colors.textoPrimario, fontSize: 18, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[8], textAlign: 'center' },
  lockedText: { color: theme.colors.textoSecundario, fontSize: 14, textAlign: 'center', marginTop: theme.spacing[4] },
  buildButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[8], backgroundColor: theme.colors.acento, borderRadius: theme.radius[10], paddingHorizontal: theme.spacing[16], marginTop: theme.spacing[16] },
  buildButtonText: { color: theme.colors.fondo, fontSize: 14, fontWeight: theme.typography.weights.bold },
  centerLevel: { color: theme.colors.textoSecundario, fontSize: 14, marginTop: theme.spacing[12] },
});