import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import { aldeanosStore } from '../simulacion/villagerStore';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { ParticulasAmbiente } from './scene/ParticulasAmbiente';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTemaTiempo } from '../hooks/useTemaTiempo';
import Animated from 'react-native-reanimated';

const MAPA = { ancho: 760, alto: 360 };
const COLORES_PROFESION = {
  lenador: '#6d4b2c',
  granjero: '#d7a23b',
  minero: '#737d8c',
  sin_oficio: '#6f9f5c',
};

function firmaEdificio(edificio, indice) {
  return String(edificio._id || `${edificio.tipoId || 'edificio'}-${edificio.x || 0}-${edificio.y || 0}-${indice}`);
}

function SpriteAldeano({ aldeano, indice, ahora, seleccionado }) {
  const posicion = aldeano.posicion || { x: 240, y: 300 };
  const x = Number(posicion.x || 0);
  const y = MAPA.alto - Number(posicion.y || 0);
  const destino = aldeano.destino;
  const direccion = destino ? Math.sign(Number(destino.x) - x) : ((indice % 2) * 2 - 1);
  const caminando = Boolean(destino) || aldeano.estadoVida === 'ir_al_trabajo';
  const durmiendo = aldeano.estadoVida === 'descansar' && Number(aldeano.necesidades?.energia || 100) < 35;
  const frame = caminando ? Math.floor(ahora / 180 + indice) % 2 : 0;
  const escala = direccion < 0 ? -1 : 1;
  const ropa = COLORES_PROFESION[aldeano.profesion || aldeano.trabajo] || COLORES_PROFESION.sin_oficio;
  const pieles = ['#dba77a', '#b9784f', '#7f4f32'];
  const pelos = ['#493225', '#7a4a2d', '#d8c48b'];
  const piel = pieles[indice % pieles.length];
  const pelo = pelos[(indice * 2) % pelos.length];
  const cargaVisible = Number(aldeano.carga || 0) > 0;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: escala }, { translateX: direccion < 0 ? 16 : 0 }]}>
      {seleccionado ? (
        <Circle cx={4} cy={25} r={12} color="#e7b85c" style="stroke" strokeWidth={2} />
      ) : null}
      <Rect x={-2} y={18} width={10 + frame * 2} height={2} color="#5d3f2a" opacity={0.45} />
      {durmiendo ? (
        <>
          <Rect x={-4} y={8} width={17} height={7} color={ropa} />
          <Rect x={9} y={3} width={7} height={7} color={piel} />
        </>
      ) : (
        <>
          <Rect x={1} y={0} width={10} height={6} color={pelo} />
          <Rect x={2} y={4} width={8} height={7} color={piel} />
          <Rect x={0} y={10} width={12} height={8} color={ropa} />
          <Rect x={-1 + frame} y={18} width={5} height={5} color="#4b3526" />
          <Rect x={7 - frame} y={18} width={5} height={5} color="#4b3526" />
          {aldeano.estadoVida === 'trabajar' ? (
            <Rect x={12} y={7 + (frame ? 2 : -1)} width={2} height={11} color="#7b5133" />
          ) : null}
        </>
      )}
      {cargaVisible ? <Rect x={2} y={-8} width={8} height={5} color="#9b6738" /> : null}
      {aldeano.emote ? <Emote tipo={aldeano.emote} /> : null}
    </Group>
  );
}

function Emote({ tipo }) {
  let color = '#f2ca52';
  let forma = 'peligro';
  if (tipo.includes('💬')) forma = 'dialogo';
  if (tipo.includes('🍎')) forma = 'hambre';
  if (tipo.includes('💤')) forma = 'sueño';
  if (tipo.includes('❤️')) { forma = 'corazon'; color = '#e26666'; }
  return (
    <Group>
      <Rect x={-1} y={-31} width={14} height={13} color="#fff8df" />
      <Rect x={0} y={-30} width={12} height={11} color="#342923" />
      {forma === 'corazon' ? (
        <>
          <Rect x={3} y={-27} width={3} height={3} color={color} />
          <Rect x={7} y={-27} width={3} height={3} color={color} />
          <Rect x={5} y={-24} width={3} height={3} color={color} />
        </>
      ) : forma === 'dialogo' ? (
        <>
          <Rect x={2} y={-27} width={2} height={2} color="#342923" />
          <Rect x={5} y={-27} width={2} height={2} color="#342923" />
          <Rect x={8} y={-27} width={2} height={2} color="#342923" />
        </>
      ) : (
        <Rect x={5} y={-28} width={2} height={7} color={color} />
      )}
    </Group>
  );
}

function Edificio({ edificio, indice }) {
  const x = Number(edificio.x || 40 + (indice % 8) * 92);
  const y = MAPA.alto - Number(edificio.y || 100 + (indice % 3) * 90);
  const nivel = Math.max(1, Number(edificio.nivel || 1));
  const ancho = 40 + nivel * 8;
  const alto = 30 + nivel * 4;
  const completo = edificio.completo !== false;
  const colores = {
    aserradero: ['#8b5a3c', '#d39a62'],
    granja: ['#c9a24a', '#6f9c4c'],
    mina: ['#777d83', '#4b5056'],
    casa: ['#b96d45', '#deaa72'],
  };
  const [pared, techo] = colores[edificio.tipoId] || colores.casa;
  return (
    <Group>
      <Rect x={x - 4} y={y + 30} width={ancho + 8} height={5} color="#3f5a32" opacity={0.55} />
      <Rect x={x} y={y + 10} width={ancho} height={alto} color={completo ? pared : '#9a7654'} />
      <Rect x={x - 5} y={y + 2} width={ancho + 10} height={12} color={completo ? techo : '#aa8d63'} />
      {!completo ? (
        <>
          <Rect x={x + 5} y={y - 12} width={3} height={34} color="#6b4a32" />
          <Rect x={x + ancho - 8} y={y - 12} width={3} height={34} color="#6b4a32" />
        </>
      ) : null}
      <Rect x={x + ancho / 2 - 4} y={y + alto - 18} width={8} height={18} color="#4a3327" />
    </Group>
  );
}

function Baldosas() {
  const baldosas = [];
  for (let fila = 0; fila < 12; fila += 1) {
    for (let columna = 0; columna < 25; columna += 1) {
      const color = ((fila * 13 + columna * 7) % 4 === 0) ? '#7daf55' : '#82b861';
      baldosas.push(<Rect key={`${fila}-${columna}`} x={columna * 32} y={fila * 32} width={32} height={32} color={color} />);
      if ((fila * 3 + columna) % 19 === 0) {
        baldosas.push(<Rect key={`agua-${fila}-${columna}`} x={columna * 32} y={fila * 32} width={32} height={32} color="#5f91a9" />);
      }
    }
  }
  return baldosas;
}

function PixelVillageComponent({ aldea, estacion = 'primavera', ahorroBateria = false, particulas = true, aldeanoSeleccionadoId = null, onSeleccionarAldeano }) {
  const [aldeanos, setAldeanos] = useState(() => aldeanosStore.getState().slice(0, 30));
  const [ahora] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const ultimoToque = useRef(0);
  const seleccionId = String(aldeanoSeleccionadoId || '');
  const movimientoReducido = useReducedMotion();
  const temaTiempo = useTemaTiempo();

  useEffect(() => aldeanosStore.subscribe((siguientes) => {
    setAldeanos(siguientes.slice(0, 30));
  }), []);

  useEffect(() => {
    if (!seleccionId) return;
    const aldeano = aldeanos.find((item) => String(item.id) === seleccionId);
    if (!aldeano) return;
    const x = Number(aldeano.posicion?.x || 240);
    const y = MAPA.alto - Number(aldeano.posicion?.y || 300);
    const destinoX = Math.max(-90, Math.min(90, MAPA.ancho / 2 - x));
    const destinoY = Math.max(-45, Math.min(45, MAPA.alto / 2 - y));
    let paso = 0;
    const temporizador = setInterval(() => {
      paso += 1;
      const avance = paso / 18;
      const suavizado = avance * avance * (3 - 2 * avance);
      setPan((actual) => ({
        x: actual.x + (destinoX - actual.x) * suavizado / 2,
        y: actual.y + (destinoY - actual.y) * suavizado / 2,
      }));
      if (paso >= 18) clearInterval(temporizador);
    }, 16);
    return () => clearInterval(temporizador);
  }, [seleccionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const edificios = useMemo(() => (aldea?.edificios || []).filter((edificio) => edificio?.tipoId), [aldea?.edificios]);
  const noche = Number(aldea?.ciclo?.segundos || 0) >= 120;
  const estacionTema = estacion === 'otoño' || estacion === 'otono' ? 'Otono' : estacion === 'primavera' ? 'Primavera' : estacion === 'verano' ? 'Verano' : 'Invierno';

  const panInicial = { x: 0, y: 0 };
  // eslint-disable-next-line react-hooks/refs
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evento) => {
      panInicial.x = pan.x;
      panInicial.y = pan.y;
      const pulsado = Number(evento.nativeEvent.timestamp || 0);
      if (pulsado - ultimoToque.current < 280) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
      ultimoToque.current = pulsado;
    },
    onPanResponderMove: (evento, gesto) => {
      const limiteX = MAPA.ancho * (zoom - 1) / 2;
      const limiteY = MAPA.alto * (zoom - 1) / 2;
      setPan({
        x: Math.max(-limiteX, Math.min(limiteX, panInicial.x + gesto.dx)),
        y: Math.max(-limiteY, Math.min(limiteY, panInicial.y + gesto.dy)),
      });
    },
  });

  return (
    <View style={styles.frame} {...panResponder.panHandlers}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.12 }, temaTiempo.cieloOverlayStyle]} />
      <LinearGradient
        colors={[
          theme.colors[`estacion${estacionTema}Cielo`] || theme.colors.estacionPrimaveraCielo,
          theme.colors[`estacion${estacionTema}Suelo`] || theme.colors.estacionPrimaveraSuelo,
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Canvas style={StyleSheet.flatten([styles.canvas, { height: 360 }])}>
        <Group transform={[{ translateX: pan.x }, { translateY: pan.y }, { scale: zoom }]}>
          <Baldosas />
          {edificios.map((edificio, indice) => <Edificio key={firmaEdificio(edificio, indice)} edificio={edificio} indice={indice} />)}
          {aldeanos.map((aldeano, indice) => <SpriteAldeano key={String(aldeano.id || indice)} aldeano={aldeano} indice={indice} ahora={ahora} seleccionado={String(aldeano.id) === seleccionId} />)}
        </Group>
        {noche ? <Rect x={0} y={0} width={760} height={360} color="#182b4a" opacity={0.48} /> : null}
        {particulas && !ahorroBateria && estacion === 'invierno' ? (
          <>
            <Rect x={90} y={50} width={3} height={3} color="#ffffff" />
            <Rect x={210} y={130} width={4} height={4} color="#ffffff" />
            <Rect x={470} y={80} width={3} height={3} color="#ffffff" />
            <Rect x={650} y={170} width={4} height={4} color="#ffffff" />
          </>
        ) : null}
      </Canvas>
      {aldeanos.map((aldeano, indice) => {
        const x = Number(aldeano.posicion?.x || 240 + indice * 18);
        const y = MAPA.alto - Number(aldeano.posicion?.y || 300);
        return (
          <Pressable
            key={`tocar-${aldeano.id || indice}`}
            accessibilityRole="button"
            accessibilityLabel={`Seleccionar a ${aldeano.nombre || 'aldeano'}`}
            hitSlop={10}
            onPress={() => onSeleccionarAldeano?.(aldeano)}
            style={[styles.aldeanoTactil, { left: `${(x / MAPA.ancho) * 100}%`, top: `${(y / MAPA.alto) * 100}%` }]}
          />
        );
      })}
      {!ahorroBateria && particulas && !movimientoReducido ? (
        <ParticulasAmbiente estacion={estacion} enabled={particulas} ahorroBateria={ahorroBateria} />
      ) : null}
      <View style={styles.controles} pointerEvents="box-none">
        <Text style={styles.zoom} onPress={() => setZoom((actual) => Math.max(0.8, Math.min(2, actual - 0.2)))}>−</Text>
        <Text style={styles.zoom} onPress={() => setZoom((actual) => Math.max(0.8, Math.min(2, actual + 0.2)))}>+</Text>
      </View>
    </View>
  );
}

export const PixelVillage = memo(PixelVillageComponent);

const styles = StyleSheet.create({
  frame: { width: '100%', height: 360, overflow: 'hidden', borderRadius: 12, backgroundColor: '#82b861' },
  canvas: { width: '100%' },
  aldeanoTactil: { position: 'absolute', width: 30, height: 34, marginLeft: -15, marginTop: -17, borderRadius: 15 },
  controles: { position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 8 },
  zoom: { width: 34, height: 34, textAlign: 'center', lineHeight: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: '#fff8df', color: '#342923', fontSize: 22 },
});
