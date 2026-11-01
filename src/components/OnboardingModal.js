import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from './icons';

const PASOS = [
  { icono: 'account-group', titulo: 'La aldea crece sola', texto: 'Los aldeanos llegan cuando juntan suficiente comida.' },
  { icono: 'home-variant', titulo: 'Construye casas', texto: 'Las casas aumentan la población máxima de tu aldea.' },
  { icono: 'hammer-wrench', titulo: 'Mejora tus edificios', texto: 'Cada nivel cuesta 1,6 veces más que el anterior.' },
];

export function OnboardingModal({ visible, onClose }) {
  const [paso, setPaso] = useState(0);
  const actual = PASOS[paso];
  const terminar = async () => { await AsyncStorage.setItem('vilai_onboarding_visto', '1'); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={terminar}>
      <View style={styles.overlay}><View style={styles.card}>
        <View style={styles.topRow}><Text style={styles.progress}>{paso + 1} de {PASOS.length}</Text><Pressable accessibilityRole="button" onPress={terminar}><Text style={styles.skip}>Saltar</Text></Pressable></View>
        <View style={styles.iconCircle}><AppIcon name={actual.icono} size={42} /></View>
        <Text style={styles.title}>{actual.titulo}</Text><Text style={styles.text}>{actual.texto}</Text>
        <View style={styles.dots}>{PASOS.map((_, index) => <View key={index} style={[styles.dot, index === paso && styles.dotActive]} />)}</View>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => paso === PASOS.length - 1 ? terminar() : setPaso(paso + 1)}><Text style={styles.buttonText}>{paso === PASOS.length - 1 ? 'Empezar' : 'Siguiente'}</Text></Pressable>
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:{flex:1,backgroundColor:theme.colors.fondo,alignItems:'center',justifyContent:'center',padding:theme.spacing[24]},
  card:{width:'100%',maxWidth:390,backgroundColor:theme.colors.superficie,borderWidth:1,borderColor:theme.colors.borde,borderRadius:theme.radius[16],padding:theme.spacing[24],alignItems:'center'},
  topRow:{width:'100%',flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:theme.spacing[16]}, progress:{color:theme.colors.textoSecundario,fontSize:theme.typography.sizes.small}, skip:{color:theme.colors.acento,fontSize:theme.typography.sizes.small,fontWeight:theme.typography.weights.bold}, iconCircle:{width:88,height:88,borderRadius:44,alignItems:'center',justifyContent:'center',backgroundColor:theme.colors.superficieAlta,borderWidth:2,borderColor:theme.colors.acento,marginBottom:theme.spacing[16]}, title:{color:theme.colors.textoPrimario,fontSize:theme.typography.sizes.large,fontWeight:theme.typography.weights.heavy,textAlign:'center'}, text:{color:theme.colors.textoSecundario,fontSize:theme.typography.sizes.normal,textAlign:'center',marginTop:theme.spacing[8],lineHeight:22}, dots:{flexDirection:'row',gap:theme.spacing[8],marginVertical:theme.spacing[24]}, dot:{width:8,height:8,borderRadius:4,backgroundColor:theme.colors.borde}, dotActive:{width:22,backgroundColor:theme.colors.acento}, button:{width:'100%',backgroundColor:theme.colors.acento,borderRadius:theme.radius[10],paddingVertical:14,alignItems:'center'},   buttonText:{color:theme.colors.tintaProfunda,fontSize:theme.typography.sizes.normal,fontWeight:theme.typography.weights.bold},
});