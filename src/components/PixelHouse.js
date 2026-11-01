import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export function PixelHouse({ left, top, label }) {
  return (
    <View style={[styles.pixelHouse, { left, top }]}> 
      <View style={[styles.houseRoof, styles.houseRoofTop]} />
      <View style={[styles.houseRoof, styles.houseRoofMiddle]} />
      <View style={[styles.houseRoof, styles.houseRoofBase]} />
      <View style={styles.houseWall} />
      <View style={[styles.houseWindow, styles.houseWindowLeft]} />
      <View style={[styles.houseWindow, styles.houseWindowRight]} />
      <View style={styles.houseDoor} />
      <Text style={styles.houseLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pixelHouse: { position: 'absolute', width: 72, height: 69, alignItems: 'center' },
  houseRoof: { position: 'absolute', height: 8, backgroundColor: theme.colors.tejaRoja },
  houseRoofTop: { width: 24, left: 24, top: 0 },
  houseRoofMiddle: { width: 40, left: 16, top: 8 },
  houseRoofBase: { width: 56, left: 8, top: 16, backgroundColor: theme.colors.adobeOscuro },
  houseWall: { position: 'absolute', width: 42, height: 34, left: 15, top: 24, backgroundColor: theme.colors.muroCalido, borderBottomWidth: 4, borderColor: theme.colors.maderaCantos },
  houseWindow: { position: 'absolute', width: 8, height: 8, top: 32, backgroundColor: theme.colors.estacionVeranoCielo, borderWidth: 2, borderColor: theme.colors.luzVentana },
  houseWindowLeft: { left: 20 },
  houseWindowRight: { right: 20 },
  houseDoor: { position: 'absolute', width: 10, height: 16, left: 31, top: 42, backgroundColor: theme.colors.puertaMadera, borderTopWidth: 3, borderColor: theme.colors.estacionOtonoCielo },
  houseLabel: { position: 'absolute', top: 61, color: theme.colors.etiquetaBosque, fontSize: 8, fontWeight: '800', backgroundColor: theme.colors.etiquetaClaro, paddingHorizontal: 3 },
});
