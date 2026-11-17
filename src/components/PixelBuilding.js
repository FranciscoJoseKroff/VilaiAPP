import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
const COLORS = {
  casa: ['#f0d39a','#81402f','#bd8752'], aserradero: ['#795239','#573d2e','#467b51'], granja: ['#e7e5cf','#c89558','#477f42'],
  granero: ['#e7e9d4','#bd8752','#d4b875'], almacen: ['#5c6f63','#53695d','#596574'], molino: ['#f2ecd8','#573d2e','#d4b875'],
  horno: ['#754532','#342923','#e5b47c'], mina: ['#596574','#342923','#9b5961'], centroInvestigacion: ['#47728b','#76629a','#e7b85c'],
  observatorio: ['#354960','#47728b','#e7b85c'],
  taberna: [theme.colors.terracota, theme.colors.vino, theme.colors.doradoMadera],
  biblioteca: [theme.colors.papelPergamino, theme.colors.castañoOscuro, theme.colors.azulBruma],
  torreVigilancia: [theme.colors.maderaEnvejecida, theme.colors.castañoOscuro, theme.colors.acento],
};

function PixelBuildingComponent({ tipoId, level = 1, integridad = 100, left, top, night }) {
  const palette = COLORS[tipoId] || COLORS.casa;
  const damaged = Number(integridad) < 100;
  const special = ['molino','mina','centroInvestigacion','observatorio','torreVigilancia'].includes(tipoId);
  const label = tipoId === 'centroInvestigacion' ? 'CENTRO' : tipoId === 'observatorio' ? 'OBSERV.' : tipoId === 'torreVigilancia' ? 'ATALAYA' : tipoId.toUpperCase();
  return (
    <View style={[styles.building, { left, top }]}> 
      {tipoId === 'torreVigilancia' ? <View style={[styles.towerTop, { backgroundColor: palette[1] }]}><View style={styles.towerRoof}/></View> : null}
      {tipoId === 'taberna' ? <View style={[styles.tavernSign, { backgroundColor: palette[2] }]}><View style={styles.mugHandle}/></View> : null}
      {tipoId === 'biblioteca' ? <View style={styles.bookShelf}><View style={styles.bookOne}/><View style={styles.bookTwo}/><View style={styles.bookThree}/></View> : null}
      {tipoId === 'molino' ? <View style={styles.windmill}><View style={styles.bladeH}/><View style={styles.bladeV}/></View> : null}
      {tipoId === 'mina' ? <View style={styles.mineOpening}/> : null}
      <View style={[styles.roof, { backgroundColor: palette[1] }]}/>
      <View style={[styles.wall, { backgroundColor: palette[0] }, special && styles.tallWall]}>
        <View style={[styles.window, night && styles.windowNight]}/>
        <View style={[styles.door, { borderTopColor: palette[2] }]}/>
      </View>
      {tipoId === 'granero' || tipoId === 'almacen' ? <View style={[styles.mark, { backgroundColor: palette[2] }]}/> : null}
      {tipoId === 'horno' ? <View style={[styles.chimney, night && styles.chimneyLit]}/> : null}
      {damaged ? <><View style={styles.crack}/><View style={styles.crackTwo}/><View style={styles.smoke}/><View style={styles.smokeTwo}/></> : null}
      <Text style={styles.label}>{label} · NV.{level}</Text>
    </View>
  );
}
export const PixelBuilding = memo(PixelBuildingComponent);
const styles = StyleSheet.create({
  building:{position:'absolute',width:72,height:72,alignItems:'center'}, roof:{position:'absolute',width:64,height:16,top:0,borderLeftWidth:8,borderRightWidth:8,borderColor:'transparent'},
  wall:{position:'absolute',width:48,height:38,left:12,top:16,borderBottomWidth:4,borderColor:'#bd8752'}, tallWall:{height:44,top:10},
  towerTop:{position:'absolute',width:30,height:14,top:0,left:21,zIndex:4,alignItems:'center',borderTopWidth:4,borderLeftWidth:3,borderRightWidth:3,borderColor:'#573d2e'}, towerRoof:{position:'absolute',width:10,height:14,top:0,backgroundColor:'#e7b85c'},
  tavernSign:{position:'absolute',width:22,height:16,right:5,top:17,zIndex:5,borderWidth:2,borderColor:'#573d2e',alignItems:'flex-end'}, mugHandle:{width:5,height:7,borderWidth:2,borderLeftWidth:0,borderColor:'#e7e5cf',marginTop:3,marginRight:-5},
  bookShelf:{position:'absolute',width:25,height:22,left:23,top:21,zIndex:4,backgroundColor:'#573d2e',flexDirection:'row',alignItems:'flex-end',paddingHorizontal:2,paddingBottom:2}, bookOne:{width:5,height:12,backgroundColor:'#d57957'},bookTwo:{width:5,height:16,backgroundColor:'#47728b'},bookThree:{width:5,height:10,backgroundColor:'#e7b85c'},
  window:{position:'absolute',width:8,height:8,left:7,top:9,backgroundColor:'#79b9bd',borderWidth:2,borderColor:'#e7e5cf'}, windowNight:{backgroundColor:'#e7b85c',borderColor:'#f2b09a'}, door:{position:'absolute',width:12,height:19,left:18,bottom:0,backgroundColor:'#754532',borderTopWidth:3},
  windmill:{position:'absolute',width:28,height:28,top:-10,right:-18,zIndex:3}, bladeH:{position:'absolute',width:28,height:5,top:12,backgroundColor:'#e7e5cf'}, bladeV:{position:'absolute',width:5,height:28,left:12,backgroundColor:'#e7e5cf'},
  mineOpening:{position:'absolute',width:36,height:38,left:18,top:12,backgroundColor:'#342923',borderTopLeftRadius:18,borderTopRightRadius:18,zIndex:2}, mark:{position:'absolute',width:12,height:12,left:30,top:25,zIndex:4,transform:[{rotate:'45deg'}]},
  chimney:{position:'absolute',width:8,height:14,right:13,top:5,backgroundColor:'#573d2e'}, chimneyLit:{backgroundColor:'#f2b09a'},
  crack:{position:'absolute',width:3,height:16,left:28,top:25,backgroundColor:'#342923',transform:[{rotate:'18deg'}],zIndex:6}, crackTwo:{position:'absolute',width:3,height:10,left:34,top:34,backgroundColor:'#342923',transform:[{rotate:'-28deg'}],zIndex:6}, smoke:{position:'absolute',width:8,height:8,right:5,top:-8,borderRadius:4,backgroundColor:'#53695d',zIndex:7}, smokeTwo:{position:'absolute',width:6,height:6,right:0,top:-18,borderRadius:3,backgroundColor:'#53695d',zIndex:7},
  label:{position:'absolute',top:58,color:'#254c3d',backgroundColor:'#e7e7bd',fontSize:7,fontWeight:'800',paddingHorizontal:3},
});
