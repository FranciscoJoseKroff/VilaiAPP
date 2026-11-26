import React, { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import { aldeanosStore } from '../simulacion/villagerStore';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { ParticulasAmbiente } from './scene/ParticulasAmbiente';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCalidadGrafica } from '../context/CalidadGraficaContext';
import { perfilCalidadGrafica } from '../game/calidadGrafica';
import { useTemaTiempo } from '../hooks/useTemaTiempo';
import Animated from 'react-native-reanimated';

const MAPA = { ancho: 760, alto: 360 };
const noSuscribirse = () => () => {};
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
    // Espejo en el lugar: tras scaleX(-1) se corre -12 (el ancho del sprite) para que siga ocupando x..x+12.
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: escala }, { translateX: direccion < 0 ? -12 : 0 }]}>
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
  const tipoId = edificio.tipoId;
  const torre = tipoId === 'torreVigilancia';
  const ancho = torre ? 28 : 40 + nivel * 8;
  const alto = torre ? 64 : 30 + nivel * 4;
  const completo = edificio.completo !== false;
  const colores = {
    aserradero: ['#8b5a3c', '#d39a62'],
    granja: ['#c9a24a', '#6f9c4c'],
    mina: ['#777d83', '#4b5056'],
    casa: ['#b96d45', '#deaa72'],
    taberna: [theme.colors.terracota, theme.colors.vino],
    biblioteca: [theme.colors.papelPergamino, theme.colors.azulBruma],
    torreVigilancia: [theme.colors.maderaEnvejecida, theme.colors.castañoOscuro],
  };
  const [pared, techo] = colores[tipoId] || colores.casa;
  return (
    <Group>
      <Rect x={x - 4} y={y + 30} width={ancho + 8} height={5} color="#3f5a32" opacity={0.55} />
      <Rect x={x} y={y + 10} width={ancho} height={alto} color={completo ? pared : '#9a7654'} />
      {torre ? (
        <>
          <Rect x={x - 4} y={y + 2} width={ancho + 8} height={9} color={completo ? techo : '#aa8d63'} />
          <Rect x={x + 4} y={y - 7} width={5} height={9} color={completo ? techo : '#aa8d63'} />
          <Rect x={x + 19} y={y - 7} width={5} height={9} color={completo ? techo : '#aa8d63'} />
          <Rect x={x + 9} y={y + 23} width={10} height={8} color={theme.colors.luzVentana} />
          <Rect x={x + 9} y={y + 44} width={10} height={18} color="#4a3327" />
        </>
      ) : <Rect x={x - 5} y={y + 2} width={ancho + 10} height={12} color={completo ? techo : '#aa8d63'} />}
      {!completo ? (
        <>
          <Rect x={x + 5} y={y - 12} width={3} height={34} color="#6b4a32" />
          <Rect x={x + ancho - 8} y={y - 12} width={3} height={34} color="#6b4a32" />
        </>
      ) : null}
      <Rect x={x + ancho / 2 - 4} y={y + alto - 18} width={8} height={18} color="#4a3327" />
      {tipoId === 'taberna' ? (
        <>
          <Rect x={x + ancho - 8} y={y + 15} width={16} height={13} color={theme.colors.doradoMadera} />
          <Rect x={x + ancho - 5} y={y + 18} width={7} height={7} color={theme.colors.pergaminoClaro} />
          <Rect x={x + ancho + 2} y={y + 19} width={4} height={5} color={theme.colors.pergaminoClaro} />
        </>
      ) : null}
      {tipoId === 'biblioteca' ? (
        <>
          <Rect x={x + 7} y={y + 22} width={ancho - 14} height={3} color={theme.colors.castañoOscuro} />
          <Rect x={x + 9} y={y + 14} width={5} height={8} color={theme.colors.coral} />
          <Rect x={x + 15} y={y + 12} width={5} height={10} color={theme.colors.azulBruma} />
          <Rect x={x + 21} y={y + 15} width={5} height={7} color={theme.colors.acento} />
          <Rect x={x + 7} y={y + 35} width={ancho - 14} height={3} color={theme.colors.castañoOscuro} />
          <Rect x={x + 10} y={y + 27} width={5} height={8} color={theme.colors.azulBruma} />
          <Rect x={x + 17} y={y + 29} width={5} height={6} color={theme.colors.coral} />
        </>
      ) : null}
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


const acotar = (valor, limite) => Math.max(-limite, Math.min(limite, valor));

function PixelVillageComponent({ aldea, estacion = 'primavera', ahorroBateria = false, particulas = true, aldeanoSeleccionadoId = null, onSeleccionarAldeano, style, children }) {
  const [ahora] = useState(0);
  const [zoom, setZoom] = useState(1);
  // pan = null: la cámara sigue el centro de la aldea; al arrastrar pasa a ser manual.
  const [pan, setPan] = useState(null);
  const [marco, setMarco] = useState({ ancho: 0, alto: 0 });
  const ultimoToque = useRef(0);
  const seleccionId = String(aldeanoSeleccionadoId || '');
  const movimientoReducido = useReducedMotion();
  const { calidad } = useCalidadGrafica();
  const perfilGrafico = perfilCalidadGrafica(calidad, movimientoReducido);
  const temaTiempo = useTemaTiempo();
  const aldeanos = useSyncExternalStore(
    perfilGrafico.animacionEscena ? aldeanosStore.subscribe : noSuscribirse,
    aldeanosStore.getState,
    aldeanosStore.getState,
  );
  const aldeanosEscena = aldeanos.slice(0, 30);

  // El mapa (760×360) cubre todo el marco, como "cover" en CSS; el zoom se multiplica encima.
  const escalaBase = marco.ancho && marco.alto ? Math.max(marco.ancho / MAPA.ancho, marco.alto / MAPA.alto) : 1;
  const escala = escalaBase * zoom;
  const limiteX = Math.max(0, (MAPA.ancho * escala - marco.ancho) / 2);
  const limiteY = Math.max(0, (MAPA.alto * escala - marco.alto) / 2);
  const edificios = useMemo(() => (aldea?.edificios || []).filter((edificio) => edificio?.tipoId), [aldea?.edificios]);
  // Centro de la aldea (promedio de aldeanos y edificios) en coordenadas del mapa.
  const puntos = [
    ...aldeanosEscena.map((aldeano) => [Number(aldeano.posicion?.x || 240), MAPA.alto - Number(aldeano.posicion?.y || 300)]),
    ...edificios.map((edificio, indice) => [Number(edificio.x || 40 + (indice % 8) * 92), MAPA.alto - Number(edificio.y || 100 + (indice % 3) * 90)]),
  ];
  const foco = puntos.length
    ? { x: puntos.reduce((total, [x]) => total + x, 0) / puntos.length, y: puntos.reduce((total, [, y]) => total + y, 0) / puntos.length }
    : { x: MAPA.ancho / 2, y: MAPA.alto / 2 };
  const panBase = pan || { x: -(foco.x - MAPA.ancho / 2) * escala, y: -(foco.y - MAPA.alto / 2) * escala };
  const panVisible = { x: acotar(panBase.x, limiteX), y: acotar(panBase.y, limiteY) };
  // Mapa → pantalla. La misma fórmula mueve el dibujo de Skia y las áreas táctiles, así siempre coinciden.
  const aPantalla = (x, y) => ({
    x: marco.ancho / 2 + panVisible.x + (x - MAPA.ancho / 2) * escala,
    y: marco.alto / 2 + panVisible.y + (y - MAPA.alto / 2) * escala,
  });
  const transformacionMapa = [
    { translateX: marco.ancho / 2 + panVisible.x },
    { translateY: marco.alto / 2 + panVisible.y },
    { scale: escala },
    { translateX: -MAPA.ancho / 2 },
    { translateY: -MAPA.alto / 2 },
  ];

  useEffect(() => {
    if (!seleccionId) return;
    const aldeano = aldeanos.find((item) => String(item.id) === seleccionId);
    if (!aldeano) return;
    const x = Number(aldeano.posicion?.x || 240);
    const y = MAPA.alto - Number(aldeano.posicion?.y || 300);
    const destinoX = acotar(-(x - MAPA.ancho / 2) * escala, limiteX);
    const destinoY = acotar(-(y - MAPA.alto / 2) * escala, limiteY);
    if (!perfilGrafico.animacionEscena) {
      const frame = requestAnimationFrame(() => setPan({ x: destinoX, y: destinoY }));
      return () => cancelAnimationFrame(frame);
    }
    let paso = 0;
    const temporizador = setInterval(() => {
      paso += 1;
      const avance = paso / 18;
      const suavizado = avance * avance * (3 - 2 * avance);
      setPan((actual) => {
        const desde = actual || panVisible;
        return { x: desde.x + (destinoX - desde.x) * suavizado / 2, y: desde.y + (destinoY - desde.y) * suavizado / 2 };
      });
      if (paso >= 18) clearInterval(temporizador);
    }, 16);
    return () => clearInterval(temporizador);
  }, [seleccionId, perfilGrafico.animacionEscena]); // eslint-disable-line react-hooks/exhaustive-deps

  const noche = Number(aldea?.ciclo?.segundos || 0) >= 120;
  const estacionTema = estacion === 'otoño' || estacion === 'otono' ? 'Otono' : estacion === 'primavera' ? 'Primavera' : estacion === 'verano' ? 'Verano' : 'Invierno';

  const panInicial = { x: 0, y: 0 };
  // eslint-disable-next-line react-hooks/refs
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evento) => {
      panInicial.x = panVisible.x;
      panInicial.y = panVisible.y;
      const pulsado = Number(evento.nativeEvent.timestamp || 0);
      if (pulsado - ultimoToque.current < 280) {
        setZoom(1);
        setPan(null);
      }
      ultimoToque.current = pulsado;
    },
    onPanResponderMove: (evento, gesto) => {
      setPan({
        x: acotar(panInicial.x + gesto.dx, limiteX),
        y: acotar(panInicial.y + gesto.dy, limiteY),
      });
    },
  });

  const cambiarZoom = (delta) => setZoom((actual) => Math.max(1, Math.min(2.5, Math.round((actual + delta) * 10) / 10)));

  return (
    <View
      style={[styles.frame, style]}
      onLayout={(evento) => {
        const { width, height } = evento.nativeEvent.layout;
        setMarco((actual) => (actual.ancho === width && actual.alto === height ? actual : { ancho: width, alto: height }));
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.12 }, temaTiempo.cieloOverlayStyle]} />
      <LinearGradient
        colors={[
          theme.colors[`estacion${estacionTema}Cielo`] || theme.colors.estacionPrimaveraCielo,
          theme.colors[`estacion${estacionTema}Suelo`] || theme.colors.estacionPrimaveraSuelo,
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Canvas style={StyleSheet.flatten(styles.canvas)}>
        <Group transform={transformacionMapa}>
          <Baldosas />
          {edificios.map((edificio, indice) => <Edificio key={firmaEdificio(edificio, indice)} edificio={edificio} indice={indice} />)}
          {aldeanosEscena.map((aldeano, indice) => <SpriteAldeano key={String(aldeano.id || indice)} aldeano={aldeano} indice={indice} ahora={ahora} seleccionado={String(aldeano.id) === seleccionId} />)}
          {particulas && !ahorroBateria && estacion === 'invierno' && perfilGrafico.coposNieve > 0
            ? Array.from({ length: perfilGrafico.coposNieve }, (_, indice) => {
              const size = indice % 2 === 0 ? 3 : 4;
              return <Rect key={`nieve-${indice}`} x={[90, 210, 470, 650][indice]} y={[50, 130, 80, 170][indice]} width={size} height={size} color="#ffffff" />;
            })
            : null}
        </Group>
        {noche ? <Rect x={0} y={0} width={marco.ancho} height={marco.alto} color="#182b4a" opacity={0.48} /> : null}
      </Canvas>
      {marco.ancho > 0 ? aldeanosEscena.map((aldeano, indice) => {
        const x = Number(aldeano.posicion?.x || 240 + indice * 18);
        const y = MAPA.alto - Number(aldeano.posicion?.y || 300);
        // Centro del sprite (12×23 en coordenadas del mapa); el área táctil mide 44×44 pt.
        const punto = aPantalla(x + 6, y + 11);
        if (punto.x < 0 || punto.y < 0 || punto.x > marco.ancho || punto.y > marco.alto) return null;
        return (
          <Pressable
            key={`tocar-${aldeano.id || indice}`}
            accessibilityRole="button"
            accessibilityLabel={`Seleccionar a ${aldeano.nombre || 'aldeano'}`}
            onPress={() => onSeleccionarAldeano?.(aldeano)}
            style={[styles.aldeanoTactil, { left: punto.x - 22, top: punto.y - 22 }]}
          />
        );
      }) : null}
      {!ahorroBateria && particulas && perfilGrafico.particulas > 0 ? (
        <ParticulasAmbiente estacion={estacion} enabled={particulas} ahorroBateria={ahorroBateria} cantidad={perfilGrafico.particulas} />
      ) : null}
      {children}
      <View style={styles.controles} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Alejar la vista" accessibilityState={{ disabled: zoom <= 1 }} disabled={zoom <= 1} style={[styles.zoom, zoom <= 1 && styles.zoomInactivo]} onPress={() => cambiarZoom(-0.25)}>
          <Text style={styles.zoomTexto}>−</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Acercar la vista" accessibilityState={{ disabled: zoom >= 2.5 }} disabled={zoom >= 2.5} style={[styles.zoom, zoom >= 2.5 && styles.zoomInactivo]} onPress={() => cambiarZoom(0.25)}>
          <Text style={styles.zoomTexto}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PixelVillage = memo(PixelVillageComponent);

const styles = StyleSheet.create({
  frame: { width: '100%', height: 360, overflow: 'hidden', borderRadius: 12, backgroundColor: '#82b861' },
  canvas: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  aldeanoTactil: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  controles: { position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 8 },
  zoom: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: '#fff8df',
    borderLeftColor: '#fff8df',
    borderBottomColor: theme.colors.maderaTenue,
    borderRightColor: theme.colors.maderaTenue,
    backgroundColor: theme.colors.pergamino,
  },
  zoomInactivo: { opacity: 0.5 },
  zoomTexto: { color: theme.colors.troncoOscuro, fontSize: 24, lineHeight: 28, fontWeight: theme.typography.weights.bold },
});
