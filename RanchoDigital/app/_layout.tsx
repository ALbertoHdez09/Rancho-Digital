import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../src/services/supabase';
import { View, ActivityIndicator, SafeAreaView, Text } from 'react-native';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { NetworkProvider, useNetwork } from '@/src/context/NetworkContext';
import { WifiOff } from 'lucide-react-native';
import { sincronizarBuzon } from '../src/services/syncService';


// Banner offline (ya estaba bien, dentro del provider)
function BannerOffline() {
  const { isConnected } = useNetwork();
  if (isConnected) return null;
  return (
    <SafeAreaView style={{ backgroundColor: '#EF4444' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8, marginTop: 30 }}>
        <WifiOff color="white" size={20} />
        <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
          Modo Sin Conexión (Datos Locales)
        </Text>
      </View>
    </SafeAreaView>
  );
}

// 🆕 Componente separado para el sync — vive DENTRO del NetworkProvider
function SyncManager() {
  const { isConnected } = useNetwork();
  useEffect(() => {
    if (isConnected) {
      sincronizarBuzon();
    }
  }, [isConnected]);
  return null;
}

// Componente interno que maneja la sesión y navegación
function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const currentSegment = segments[0] as string;
    if (!session && currentSegment !== 'login' && currentSegment !== 'registro') {
      router.replace('/login' as any);
    } else if (session && currentSegment === 'login') {
      router.replace('/(tabs)' as any);
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  return (
    <>
      <BannerOffline />
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="nuevo-animal" options={{ title: 'Nuevo Animal', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

// Root limpio — NetworkProvider envuelve todo correctamente
export default function RootLayout() {
  return (
    <NetworkProvider>
      <ThemeProvider>
        <SyncManager />
        <AppContent />
      </ThemeProvider>
    </NetworkProvider>
  );
}