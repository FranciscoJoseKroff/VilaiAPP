import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

function PixelVillagerComponent({ aldeano, indice = 0, left = 0, bottom = 0, sceneMode = false, night = false, interactive = true }) {
  const [pensando, setPensando] = useState(false);
  const colorRopa = aldeano.trabajo === 'lenador' ? theme.colors.madera : aldeano.trabajo === 'agricultor' ? theme.colors.terracota : aldeano.trabajo === 'minero' ? theme.colors.hierro : aldeano.trabajo === 'guardia' ? theme.colors.vino : [theme.colors.azulBruma, theme.colors.vino, theme.colors.lavanda][indice % 3];
  const sprite = [
    [null, theme.colors.castañoOscuro, theme.colors.castañoOscuro, null], [theme.colors.castañoOscuro, theme.colors.pan, theme.colors.pan, theme.colors.castañoOscuro],
    [null, theme.colors.pan, theme.colors.troncoOscuro, null], [null, colorRopa, colorRopa, null], [colorRopa, colorRopa, colorRopa, colorRopa], [null, theme.colors.sueloOscuro, null, theme.colors.sueloOscuro],
  ];
  const mostrarPensamiento = () => { if (sceneMode) { setPensando(true); setTimeout(() => setPensando(false), 2600); } };
  const pensamiento = aldeano.pensamientoActual || (aldeano.trabajo ? `Cuidando mi labor de ${aldeano.trabajo}.` : 'Buscando cómo ayudar a la aldea.');
  const contenido = (
    <>
      {sceneMode && pensando ? <View style={styles.thoughtBubble}><Text numberOfLines={3} style={styles.thoughtText}>{pensamiento}</Text></View> : null}
      <View style={styles.villagerSprite}>{sprite.map((fila, filaIndex) => <View key={filaIndex} style={styles.spriteRow}>{fila.map((color, pixelIndex) => <View key={pixelIndex} style={[styles.spritePixel, color && { backgroundColor: color }]}/>)}</View>)}</View>
      {aldeano.trabajo === 'lenador' ? <View style={styles.tool}/>:null}
      {aldeano.trabajo === 'agricultor' ? <View style={styles.seed}/>:null}
      {night && aldeano.trabajo === 'guardia' ? <><View style={styles.torch}/><View style={styles.flame}/></> : null}
    </>
  );
  const estilo = [styles.pixelVillager, { left, bottom }];
  if (!interactive) return <View style={estilo}>{contenido}</View>;
  return (
    <Pressable onPress={mostrarPensamiento} accessibilityRole="button" accessibilityLabel={`Aldeano ${aldeano.nombre || ''}. ${pensamiento}`} accessibilityHint={sceneMode ? 'Muestra el pensamiento actual del aldeano' : undefined} accessibilityState={{ selected: pensando }} hitSlop={8} style={estilo}>
      {contenido}
    </Pressable>
  );
}
export const PixelVillager = memo(PixelVillagerComponent);
const styles = StyleSheet.create({
  pixelVillager:{position:'absolute',width:24,height:32,zIndex:5}, villagerSprite:{position:'absolute',left:3,top:0}, spriteRow:{height:4,flexDirection:'row'}, spritePixel:{width:4,height:4},
  tool:{position:'absolute',width:3,height:12,left:0,top:15,backgroundColor:'#71472f',transform:[{rotate:'-20deg'}]}, seed:{position:'absolute',width:4,height:9,right:0,top:19,backgroundColor:'#5e934e'}, torch:{position:'absolute',width:3,height:12,right:-5,bottom:4,backgroundColor:'#71472f'}, flame:{position:'absolute',width:5,height:5,right:-6,bottom:15,backgroundColor:'#f5c762'},
  thoughtBubble:{position:'absolute',width:118,minHeight:44,left:-47,bottom:38,padding:6,backgroundColor:'#fff2e8',borderWidth:2,borderColor:'#342923',borderRadius:8,zIndex:20}, thoughtText:{color:'#342923',fontSize:14},
});
