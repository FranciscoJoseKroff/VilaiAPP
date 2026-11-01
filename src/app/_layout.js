import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from '../context/ToastContext';
import { HapticsProvider } from '../context/HapticsContext';
import { SonidoProvider } from '../servicios/sonidos';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web/LoadSkiaWeb';
import { theme } from '../../theme';

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    PressStart2P_400Regular,
    Inter_400Regular,
    Inter_700Bold,
  });
  const [skiaLista, setSkiaLista] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let activo = true;
    LoadSkiaWeb({
      locateFile: (archivo) => archivo.endsWith('.wasm') ? '/canvaskit.wasm' : archivo,
    }).then(() => activo && setSkiaLista(true)).catch((error) => {
      console.error('No se pudo cargar Skia Web:', error);
      if (activo) setSkiaLista(true);
    });
    return () => { activo = false; };
  }, []);

  if ((!fontsLoaded && !fontsError) || !skiaLista) {
    return (
      <View style={loadingStyles.container}>
        <Text style={loadingStyles.name}>VILAI</Text>
        <ActivityIndicator color={theme.colors.acento} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <HapticsProvider>
        <SonidoProvider>
          <ToastProvider>
            <GameProvider>
              <StatusBar style="light" />
              <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </BottomSheetModalProvider>
            </GameProvider>
          </ToastProvider>
        </SonidoProvider>
      </HapticsProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[16],
    backgroundColor: theme.colors.fondo,
  },
  name: {
    color: theme.colors.acento,
    fontSize: theme.typography.sizes.hero,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 6,
  },
});
